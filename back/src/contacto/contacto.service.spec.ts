import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MailService } from '../mail/services/mail.service';
import { ContactoDto } from './contacto.dto';
import { ContactoService } from './contacto.service';
import { LimitesService } from '../usuarios/services/limites.service';

describe('Contacto', () => {
  const dto: ContactoDto = {
    nombre: 'Prueba',
    email: 'prueba@example.com',
    motivo: 'problema',
    mensaje: 'No puedo ver una tarea.',
  };
  let enviarMail: jest.Mock;
  let service: ContactoService;

  beforeEach(() => {
    enviarMail = jest.fn().mockResolvedValue({ status: 'Succeeded' });
    const intentos = new Map<string, number>();
    const consumir = jest.fn(
      async (scope: string, identidad: string, max: number) => {
        const key = scope + identidad;
        const count = intentos.get(key) ?? 0;
        if (count >= max) throw new HttpException('Demasiados intentos', 429);
        intentos.set(key, count + 1);
      },
    );
    service = new ContactoService(
      { enviarMail } as unknown as MailService,
      { consumir } as unknown as LimitesService,
    );
  });

  it('envía solo al correo fijo e incluye el email para responder', async () => {
    await expect(service.enviar(dto, 'origen')).resolves.toHaveProperty(
      'mensaje',
    );
    expect(enviarMail).toHaveBeenCalledWith(
      'sebastiangonzalez100106@gmail.com',
      'Tempo · problema',
      expect.stringContaining(dto.email),
      expect.any(String),
    );
  });

  it('escapa HTML introducido en el formulario', async () => {
    await service.enviar(
      { ...dto, mensaje: '<img src=x onerror=alert(1)>\nSegunda línea' },
      'origen',
    );
    expect(enviarMail.mock.calls[0][3]).toContain('&lt;img');
    expect(enviarMail.mock.calls[0][3]).not.toContain('<img');
    expect(enviarMail.mock.calls[0][3]).toContain('<br>Segunda línea');
  });

  it('limita a tres intentos por origen sin impedir otros orígenes', async () => {
    for (let i = 0; i < 3; i++) await service.enviar(dto, 'origen');
    await expect(service.enviar(dto, 'origen')).rejects.toBeInstanceOf(
      HttpException,
    );
    await expect(service.enviar(dto, 'otro')).resolves.toHaveProperty(
      'mensaje',
    );
    expect(enviarMail).toHaveBeenCalledTimes(4);
  });

  it('descarta envíos con el campo invisible completado', async () => {
    await service.enviar({ ...dto, website: 'bot.example' }, 'origen');
    expect(enviarMail).not.toHaveBeenCalled();
  });

  it('no informa éxito si el proveedor falla o no confirma el envío', async () => {
    enviarMail.mockRejectedValueOnce(new Error('error de correo'));
    await expect(service.enviar(dto, 'origen')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    enviarMail.mockResolvedValueOnce({ status: 'Failed' });
    await expect(service.enviar(dto, 'otro')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rechaza campos inválidos y mensajes vacíos después de recortar espacios', async () => {
    const invalido = plainToInstance(ContactoDto, {
      nombre: '   ',
      email: 'sin-email',
      motivo: 'otro',
      mensaje: '             ',
    });
    const errores = await validate(invalido);
    expect(errores.map((error) => error.property)).toEqual(
      expect.arrayContaining(['nombre', 'email', 'motivo', 'mensaje']),
    );
  });
});
