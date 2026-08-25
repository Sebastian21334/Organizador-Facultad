import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { MailService } from '../../mail/services/mail.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ActualizarPerfilDto } from '../dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from '../dto/cambiar-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existente = await this.usuariosService.buscarPorEmail(dto.email);
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.usuariosService.crear({
      email: dto.email,
      password: passwordHash,
      nombre: dto.nombre,
    });

    const tokenVerificacion = this.jwtService.sign(
      { sub: usuario.id, email: usuario.email, type: 'email-verification' },
      { expiresIn: '1d' },
    );

    await this.mailService.enviarVerificacionEmail(usuario.email, usuario.nombre, tokenVerificacion);

    return {
      mensaje: 'Registro exitoso. Revisá tu email para confirmar tu cuenta.',
    };
  }

  async verificarEmail(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }

    if (payload.type !== 'email-verification') {
      throw new BadRequestException('Token inválido');
    }

    const usuario = await this.usuariosService.buscarPorId(payload.sub);
    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (usuario.emailVerificado) {
      return { mensaje: 'El email ya estaba verificado' };
    }

    await this.usuariosService.actualizar(usuario.id, { emailVerificado: true });

    return { mensaje: 'Email verificado con éxito' };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.buscarPorEmail(dto.email);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.emailVerificado) {
      throw new UnauthorizedException('Confirmá tu email antes de iniciar sesión');
    }

    return this.generarToken(usuario.id, usuario.email, usuario.nombre);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const usuario = await this.usuariosService.buscarPorEmail(dto.email);

    // No revelamos si el email existe o no, por seguridad
    if (usuario) {
      const tokenReset = this.jwtService.sign(
        { sub: usuario.id, email: usuario.email, type: 'password-reset' },
        { expiresIn: '1h' },
      );

      await this.mailService.enviarResetPassword(usuario.email, usuario.nombre, tokenReset);
    }

    return { mensaje: 'Si el email existe, vas a recibir un link para restablecer tu contraseña' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }

    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Token inválido');
    }

    const usuario = await this.usuariosService.buscarPorId(payload.sub);
    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const nuevaPasswordHash = await bcrypt.hash(dto.nuevaPassword, 10);
    await this.usuariosService.actualizar(usuario.id, { password: nuevaPasswordHash });

    return { mensaje: 'Contraseña actualizada con éxito' };
  }

  async getPerfil(userId: string) {
    const usuario = await this.usuariosService.buscarPorId(userId);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return { nombre: usuario.nombre ?? null };
  }

  async actualizarPerfil(userId: string, dto: ActualizarPerfilDto) {
    const usuario = await this.usuariosService.buscarPorId(userId);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const nombre = dto.nombre.trim();
    if (!nombre) {
      throw new BadRequestException('El nombre no puede estar vacío');
    }

    await this.usuariosService.actualizar(userId, { nombre });
    return { mensaje: 'Nombre actualizado con éxito' };
  }

  async cambiarPassword(userId: string, dto: CambiarPasswordDto) {
    const usuario = await this.usuariosService.buscarPorId(userId);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordActualValida = await bcrypt.compare(dto.contraseñaActual, usuario.password);
    if (!passwordActualValida) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const nuevaPasswordHash = await bcrypt.hash(dto.nuevaPassword, 10);
    await this.usuariosService.actualizar(userId, { password: nuevaPasswordHash });

    return { mensaje: 'Contraseña actualizada con éxito' };
  }

  private generarToken(userId: string, email: string, nombre?: string) {
    const payload = { sub: userId, email, nombre: nombre ?? email.split('@')[0] };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}