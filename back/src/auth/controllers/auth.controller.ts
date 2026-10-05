import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  csrfToken,
  sessionCookieName,
  sessionCookieOptions,
} from '../../security.config';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyEmailDto } from '../dto/verify.email.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ActualizarPerfilDto } from '../dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from '../dto/cambiar-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req,
  ) {
    const result = await this.authService.login(dto);
    res.cookie(
      sessionCookieName(),
      result.access_token,
      sessionCookieOptions(),
    );
    // El navegador solo recibe la cookie HttpOnly; clientes servidor-a-servidor conservan Bearer.
    return req.headers.origin ? { mensaje: 'Sesión iniciada.' } : result;
  }

  @Post('resend-verification')
  reenviarVerificacion(@Body() dto: ForgotPasswordDto) {
    return this.authService.reenviarVerificacion(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  async session(@Req() req) {
    return {
      ...(await this.authService.getPerfil(req.user.userId)),
      csrfToken: csrfToken(
        req.user.jti,
        this.config.getOrThrow<string>('JWT_SECRET'),
      ),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(req.user.userId);
    res.clearCookie(sessionCookieName(), sessionCookieOptions());
    return result;
  }

  @Post('verify-email')
  verificarEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verificarEmail(dto.token, dto.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.resetPassword(dto);
    res.clearCookie(sessionCookieName(), sessionCookieOptions());
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  getPerfil(@Req() req) {
    return this.authService.getPerfil(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('perfil')
  actualizarPerfil(@Req() req, @Body() dto: ActualizarPerfilDto) {
    return this.authService.actualizarPerfil(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cambiar-password')
  async cambiarPassword(
    @Req() req,
    @Body() dto: CambiarPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.cambiarPassword(req.user.userId, dto);
    res.clearCookie(sessionCookieName(), sessionCookieOptions());
    return result;
  }
}
