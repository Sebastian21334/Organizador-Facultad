import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verificarEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verificarEmail(dto.token);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
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
  cambiarPassword(@Req() req, @Body() dto: CambiarPasswordDto) {
    return this.authService.cambiarPassword(req.user.userId, dto);
  }
}