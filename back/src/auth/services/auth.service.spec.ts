import { AuthService } from './auth.service';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { MailService } from '../../mail/services/mail.service';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

describe('Autenticación sin proveedores ni datos reales', () => {
  const email = 'seba@example.com';
  const password = 'una frase segura de prueba';
  const user = {
    id: 'id-simulado',
    email,
    nombre: 'Seba',
    emailVerificado: false,
    sessionVersion: 0,
    password: bcrypt.hashSync(password, 10),
  };
  let usuarios: any;
  let mail: any;
  let service: AuthService;
  beforeEach(() => {
    usuarios = {
      buscarPorEmail: jest.fn().mockResolvedValue(user),
      buscarVerificacion: jest.fn().mockResolvedValue(user),
      actualizar: jest.fn().mockResolvedValue(user),
      consumirVerificacion: jest.fn().mockResolvedValue(true),
      crear: jest.fn().mockResolvedValue(user),
    };
    mail = {
      enviarResetPassword: jest.fn().mockResolvedValue({}),
      enviarVerificacionEmail: jest.fn().mockResolvedValue({}),
    };
    service = new AuthService(
      usuarios as UsuariosService,
      new JwtService({ secret: 'secreto-de-prueba' }),
      mail as MailService,
    );
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(async () => {
    await service.onModuleDestroy();
    jest.restoreAllMocks();
  });
  it('un error del correo no revela si el usuario existe', async () => {
    mail.enviarResetPassword.mockRejectedValueOnce(
      new Error('fallo del proveedor'),
    );
    const existe = await service.forgotPassword({ email });
    usuarios.buscarPorEmail.mockResolvedValueOnce(null);
    const noExiste = await service.forgotPassword({ email });
    expect(existe).toEqual(noExiste);
  });
  it('guarda solo el hash del enlace de recuperación, con vencimiento', async () => {
    await service.forgotPassword({ email });
    const token = mail.enviarResetPassword.mock.calls[0][2];
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const datos = usuarios.actualizar.mock.calls[0][1];
    expect(datos.resetTokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(datos.resetTokenHash).not.toBe(token);
    expect(datos.resetTokenExpires.getTime()).toBeGreaterThan(Date.now());
  });
  it('registrar un email existente no reemplaza su contraseña ni revela la cuenta', async () => {
    const existe = await service.register({ email, password, nombre: 'Seba' });
    expect(usuarios.actualizar).not.toHaveBeenCalled();
    usuarios.buscarPorEmail.mockResolvedValueOnce(null);
    const nuevo = await service.register({ email, password, nombre: 'Seba' });
    expect(existe).toEqual(nuevo);
    expect(mail.enviarVerificacionEmail).toHaveBeenCalled();
  });
  it('el token de verificación no basta para legitimar una cuenta pre-registrada por un atacante', async () => {
    await expect(
      service.verificarEmail('a'.repeat(64), 'contraseña-que-no-coincide'),
    ).rejects.toMatchObject({ status: 400 });
    expect(usuarios.consumirVerificacion).not.toHaveBeenCalled();
    await expect(
      service.verificarEmail('a'.repeat(64), password),
    ).resolves.toHaveProperty('mensaje');
  });
  it('limita trabajos bcrypt concurrentes para no llenar la cola de CPU', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => service.login({ email, password })),
    );
    expect(
      results.filter(
        (result) =>
          result.status === 'rejected' && result.reason.status === 429,
      ),
    ).toHaveLength(4);
  });
});
