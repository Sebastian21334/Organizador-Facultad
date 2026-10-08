import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { LimitesService } from '../../usuarios/services/limites.service';
import { PushService } from '../../push/services/push.service';

const mockBeginSend = jest.fn();
const mockPollUntilDone = jest.fn();
jest.mock('@azure/communication-email', () => ({
  EmailClient: jest
    .fn()
    .mockImplementation(() => ({ beginSend: mockBeginSend })),
}));

describe('Envío de correos de Tempo (proveedor simulado)', () => {
  const anteriores = {
    ACS_CONNECTION_STRING: process.env.ACS_CONNECTION_STRING,
    ACS_SENDER_ADDRESS: process.env.ACS_SENDER_ADDRESS,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };
  let service: MailService;
  const push = { enviarAUsuario: jest.fn() };

  beforeEach(() => {
    process.env.ACS_CONNECTION_STRING = 'conexion-simulada';
    process.env.ACS_SENDER_ADDRESS = 'tempo@example.com';
    process.env.FRONTEND_URL = 'https://tempo.example';
    mockBeginSend
      .mockReset()
      .mockResolvedValue({ pollUntilDone: mockPollUntilDone });
    mockPollUntilDone.mockReset().mockResolvedValue({ status: 'Succeeded' });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    push.enviarAUsuario.mockReset().mockResolvedValue(undefined);
    service = new MailService(
      {
        consumir: jest.fn().mockResolvedValue(undefined),
      } as unknown as LimitesService,
      push as unknown as PushService,
    );
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(() => {
    for (const [clave, valor] of Object.entries(anteriores)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  });

  it('envía HTML y texto juntos, con destinatario y remitente correctos', async () => {
    await service.enviarVerificacionEmail('seba@example.com', 'Seba', 'token');
    expect(mockBeginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        senderAddress: 'tempo@example.com',
        recipients: { to: [{ address: 'seba@example.com' }] },
        content: {
          subject: 'Confirmá tu cuenta · Tempo',
          plainText: expect.stringContaining('Hola, Seba.'),
          html: expect.stringContaining('Confirmar mi cuenta'),
        },
      }),
      expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
    );
  });

  it('aplica la plantilla de recuperación y la de recordatorio', async () => {
    await service.enviarResetPassword('seba@example.com', 'Seba', 'token');
    expect(mockBeginSend.mock.calls[0][0].content.html).toContain(
      'Crear nueva contraseña',
    );
    await service.enviarRecordatorio('seba@example.com', {
      nombre: 'Seba',
      titulo: 'Parcial',
      fechaLimite: new Date('2026-10-06T17:00:00Z'),
    });
    expect(mockBeginSend.mock.calls[1][0].content.html).toContain(
      'Ver mis tareas',
    );
  });

  it('el fallback también tiene identidad y escapa texto plano', async () => {
    await service.enviarMail('seba@example.com', 'Mensaje', '<img src=x>');
    const contenido = mockBeginSend.mock.calls[0][0].content;
    expect(contenido.plainText).toBe('<img src=x>');
    expect(contenido.html).toContain('&lt;img src=x&gt;');
    expect(contenido.html).not.toContain('<img');
    expect(contenido.html).toContain('Menos caos. Más tempo.');
  });

  it('rechaza un resultado no confirmado para no marcar recordatorios como enviados', async () => {
    mockPollUntilDone.mockResolvedValueOnce({ status: 'Failed' });
    await expect(
      service.enviarMail('seba@example.com', 'Prueba', 'Texto'),
    ).rejects.toThrow('no confirmó');
  });

  it('propaga fallos del proveedor', async () => {
    mockBeginSend.mockRejectedValueOnce(new Error('sin conexión'));
    await expect(
      service.enviarResetPassword('seba@example.com', 'Seba', 'token'),
    ).rejects.toThrow('sin conexión');
  });

  it('dispara push al usuario con el resumen del correo, y un fallo no afecta el envío', async () => {
    push.enviarAUsuario.mockRejectedValueOnce(
      new Error('proveedor push caído'),
    );
    await expect(
      service.enviarRecordatorio(
        'seba@example.com',
        {
          nombre: 'Seba',
          titulo: 'Parcial',
          materia: 'Física',
          fechaLimite: new Date('2026-10-09T17:00:00Z'),
        },
        'usuario',
      ),
    ).resolves.toEqual({ status: 'Succeeded' });
    expect(push.enviarAUsuario).toHaveBeenCalledWith(
      'usuario',
      expect.objectContaining({
        titulo: 'Recordatorio: Parcial · Tempo',
        texto: expect.stringContaining('Parcial · Física'),
        url: '/tareas',
      }),
    );
    expect(mockBeginSend).toHaveBeenCalledTimes(1);
  });

  it('no espera a un proveedor push lento para confirmar el correo', async () => {
    push.enviarAUsuario.mockReturnValue(new Promise(() => {}));
    await expect(
      service.enviarRecordatorio(
        'seba@example.com',
        {
          nombre: 'Seba',
          titulo: 'Parcial',
          fechaLimite: new Date('2026-10-09T17:00:00Z'),
        },
        'usuario',
      ),
    ).resolves.toEqual({ status: 'Succeeded' });
  });

  it('no envía tokens de verificación ni de recuperación por push', async () => {
    await service.enviarVerificacionEmail('seba@example.com', 'Seba', 'token');
    await service.enviarResetPassword('seba@example.com', 'Seba', 'token');
    expect(push.enviarAUsuario).not.toHaveBeenCalled();
  });
});
