import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { MailService } from '../../mail/services/mail.service';
import { TareasService } from '../../tareas/services/tareas.service';
import { ActualizarPerfilDto } from '../dto/actualizar-perfil.dto';

describe('AuthService: cambios que afectan a los avisos', () => {
  const usuarios = {
    actualizar: jest.fn().mockResolvedValue({}),
    buscarVerificacion: jest.fn(),
    consumirVerificacion: jest.fn(),
    consumirReset: jest.fn(),
  };
  const reprogramar = jest.fn().mockResolvedValue(undefined);
  const password = 'PasswordDePrueba123!';
  const hash = bcrypt.hashSync(password, 4);
  const service = new AuthService(
    usuarios as unknown as UsuariosService,
    {} as JwtService,
    {} as MailService,
    { reprogramar } as unknown as TareasService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    usuarios.buscarVerificacion.mockResolvedValue({
      id: 'usuario',
      password: hash,
    });
    usuarios.consumirVerificacion.mockResolvedValue(true);
    usuarios.consumirReset.mockResolvedValue(true);
  });

  it.each([
    { nombre: 'Nombre', recordatorioEmailHabilitado: false },
    { nombre: 'Nombre', recordatorioEmailHabilitado: true },
    { nombre: 'Nombre', recordatorioMinutos: 60 },
    { nombre: 'Nombre', recordatorioMinutos: null },
  ])('reprograma las preferencias: %j', async (dto: ActualizarPerfilDto) => {
    await service.actualizarPerfil('usuario', dto);
    expect(reprogramar).toHaveBeenCalledTimes(1);
    expect(usuarios.actualizar).toHaveBeenCalledWith('usuario', dto);
  });

  it('no reprograma al cambiar solamente el nombre', async () => {
    await service.actualizarPerfil('usuario', { nombre: 'Nombre' });
    expect(reprogramar).not.toHaveBeenCalled();
  });

  it('reprograma después de verificar el email', async () => {
    await service.verificarEmail('token-de-prueba', password);
    expect(reprogramar).toHaveBeenCalledTimes(1);
  });

  it('no reprograma si la verificación fue rechazada', async () => {
    usuarios.consumirVerificacion.mockResolvedValueOnce(false);
    await expect(
      service.verificarEmail('token-de-prueba', password),
    ).rejects.toThrow();
    expect(reprogramar).not.toHaveBeenCalled();
  });

  it('reprograma después de recuperar la contraseña, que también verifica el email', async () => {
    await service.resetPassword({
      token: 'token-de-prueba',
      nuevaPassword: password,
    });
    expect(reprogramar).toHaveBeenCalledTimes(1);
  });

  it('no reprograma si el token de recuperación fue rechazado', async () => {
    usuarios.consumirReset.mockResolvedValueOnce(false);
    await expect(
      service.resetPassword({
        token: 'token-de-prueba',
        nuevaPassword: password,
      }),
    ).rejects.toThrow();
    expect(reprogramar).not.toHaveBeenCalled();
  });
});
