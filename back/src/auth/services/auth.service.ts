import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleDestroy,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { MailService } from '../../mail/services/mail.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ActualizarPerfilDto } from '../dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from '../dto/cambiar-password.dto';

const DUMMY_HASH = bcrypt.hashSync('tempo-dummy-credential-not-an-account', 12);
const REGISTRO = {
  mensaje:
    'Si el email puede registrarse, vas a recibir un enlace para confirmar tu cuenta. Si ya tenés cuenta, iniciá sesión o recuperá tu contraseña.',
};
const RECUPERACION = {
  mensaje:
    'Si el email existe, vas a recibir un link para restablecer tu contraseña.',
};

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly envios = new Set<Promise<unknown>>();
  private trabajosPassword = 0;
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async onModuleDestroy() {
    await Promise.allSettled(this.envios);
  }
  private email(value: string) {
    return value.trim().toLowerCase();
  }
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private async passwordLimitado<T>(operacion: () => Promise<T>): Promise<T> {
    if (this.trabajosPassword >= 8)
      throw new HttpException(
        'La autenticación está ocupada. Intentá de nuevo en unos segundos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    this.trabajosPassword++;
    try {
      return await operacion();
    } finally {
      this.trabajosPassword--;
    }
  }
  private enviarEnSegundoPlano(envio: Promise<unknown>) {
    const trabajo = envio.catch(() =>
      this.logger.warn(
        'No se pudo completar un correo de autenticación; el usuario puede solicitar otro enlace.',
      ),
    );
    this.envios.add(trabajo);
    void trabajo.finally(() => this.envios.delete(trabajo));
  }
  private async respuestaUniforme(inicio: number) {
    const restante = 400 - (Date.now() - inicio);
    if (restante > 0)
      await new Promise((resolve) => setTimeout(resolve, restante));
  }

  async register(dto: RegisterDto) {
    const inicio = Date.now();
    const email = this.email(dto.email);
    const password = await this.passwordLimitado(() =>
      bcrypt.hash(dto.password, 12),
    );
    const existente = await this.usuariosService.buscarPorEmail(email);
    if (!existente) {
      try {
        const usuario = await this.usuariosService.crear({
          email,
          password,
          nombre: dto.nombre?.trim() || email.split('@')[0],
        });
        await this.prepararVerificacion(
          usuario.id,
          usuario.email,
          usuario.nombre,
        );
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    }
    await this.respuestaUniforme(inicio);
    return REGISTRO;
  }

  private async prepararVerificacion(
    id: string,
    email: string,
    nombre: string,
  ) {
    const token = randomBytes(32).toString('hex');
    await this.usuariosService.actualizar(id, {
      verificationTokenHash: this.hashToken(token),
      verificationTokenExpires: new Date(Date.now() + 86_400_000),
    });
    this.enviarEnSegundoPlano(
      this.mailService.enviarVerificacionEmail(
        email,
        nombre || 'estudiante',
        token,
      ),
    );
  }

  async reenviarVerificacion(dto: ForgotPasswordDto) {
    const inicio = Date.now();
    const usuario = await this.usuariosService.buscarPorEmail(
      this.email(dto.email),
    );
    if (usuario && !usuario.emailVerificado)
      await this.prepararVerificacion(
        usuario.id,
        usuario.email,
        usuario.nombre,
      );
    await this.respuestaUniforme(inicio);
    return {
      mensaje:
        'Si la cuenta necesita confirmación, vas a recibir un nuevo enlace por email.',
    };
  }

  async verificarEmail(token: string, password: string) {
    const hash = this.hashToken(token);
    const usuario = await this.usuariosService.buscarVerificacion(hash);
    const valida = await this.passwordLimitado(() =>
      bcrypt.compare(password, usuario?.password ?? DUMMY_HASH),
    );
    // Evita que confirmar un email legitime una cuenta pre-registrada por otra persona.
    if (
      !usuario ||
      !valida ||
      !(await this.usuariosService.consumirVerificacion(hash, usuario.password))
    )
      throw new BadRequestException(
        'El enlace o la contraseña son inválidos. Podés solicitar otro enlace o recuperar tu contraseña.',
      );
    return { mensaje: 'Email verificado con éxito' };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.buscarPorEmail(
      this.email(dto.email),
    );
    const passwordValida = await this.passwordLimitado(() =>
      bcrypt.compare(dto.password, usuario?.password ?? DUMMY_HASH),
    );
    if (!usuario || !passwordValida)
      throw new UnauthorizedException('Credenciales inválidas');
    if (!usuario.emailVerificado)
      throw new UnauthorizedException(
        'Confirmá tu email antes de iniciar sesión',
      );
    return {
      access_token: this.jwtService.sign({
        sub: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre || usuario.email.split('@')[0],
        type: 'session',
        ver: usuario.sessionVersion,
        jti: randomUUID(),
      }),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const inicio = Date.now();
    const usuario = await this.usuariosService.buscarPorEmail(
      this.email(dto.email),
    );
    if (usuario) {
      const token = randomBytes(32).toString('hex');
      await this.usuariosService.actualizar(usuario.id, {
        resetTokenHash: this.hashToken(token),
        resetTokenExpires: new Date(Date.now() + 3_600_000),
      });
      // El tiempo y los errores del proveedor no revelan si existe una cuenta.
      this.enviarEnSegundoPlano(
        this.mailService.enviarResetPassword(
          usuario.email,
          usuario.nombre || 'estudiante',
          token,
        ),
      );
    }
    await this.respuestaUniforme(inicio);
    return RECUPERACION;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const password = await this.passwordLimitado(() =>
      bcrypt.hash(dto.nuevaPassword, 12),
    );
    if (
      !(await this.usuariosService.consumirReset(
        this.hashToken(dto.token),
        password,
      ))
    )
      throw new BadRequestException(
        'Enlace inválido, usado o expirado. Solicitá uno nuevo.',
      );
    return {
      mensaje: 'Contraseña actualizada. Iniciá sesión con tu nueva contraseña.',
    };
  }

  async logout(userId: string) {
    await this.usuariosService.revocarSesiones(userId);
    return { mensaje: 'Se cerraron todas las sesiones de tu cuenta.' };
  }

  async getPerfil(userId: string) {
    const usuario = await this.usuariosService.buscarPorId(userId);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return {
      nombre: usuario.nombre ?? null,
      recordatorioEmailHabilitado: usuario.recordatorioEmailHabilitado,
      recordatorioMinutos: usuario.recordatorioMinutos,
    };
  }

  async actualizarPerfil(userId: string, dto: ActualizarPerfilDto) {
    const nombre = dto.nombre.trim();
    if (!nombre)
      throw new BadRequestException('El nombre no puede estar vacío');
    const { recordatorioEmailHabilitado, recordatorioMinutos } = dto;
    await this.usuariosService.actualizar(userId, {
      nombre,
      ...(recordatorioEmailHabilitado !== undefined
        ? { recordatorioEmailHabilitado }
        : {}),
      ...(recordatorioMinutos !== undefined ? { recordatorioMinutos } : {}),
    });
    return { mensaje: 'Perfil actualizado con éxito' };
  }

  async cambiarPassword(userId: string, dto: CambiarPasswordDto) {
    const usuario = await this.usuariosService.buscarPorId(userId);
    if (
      !usuario ||
      !(await this.passwordLimitado(() =>
        bcrypt.compare(dto.contraseñaActual, usuario.password),
      ))
    )
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    const password = await this.passwordLimitado(() =>
      bcrypt.hash(dto.nuevaPassword, 12),
    );
    if (
      !(await this.usuariosService.cambiarPasswordSeguro(
        userId,
        usuario.password,
        password,
      ))
    )
      throw new UnauthorizedException(
        'La contraseña cambió. Iniciá sesión de nuevo.',
      );
    return {
      mensaje:
        'Contraseña actualizada. Por seguridad se cerraron todas tus sesiones.',
    };
  }
}
