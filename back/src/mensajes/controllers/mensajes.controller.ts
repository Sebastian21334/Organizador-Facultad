import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MensajesService } from '../services/mensajes.service';
import { CrearMensajeDto } from '../dto/crear-mensaje.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('mensajes')
export class MensajesController {
  constructor(private readonly mensajesService: MensajesService) {}

  @Get()
  async obtenerTodos(@Req() req) {
    return this.mensajesService.obtenerTodos(req.user.userId);
  }

  @Post()
  async procesar(@Body() dto: CrearMensajeDto, @Req() req) {
    return this.mensajesService.procesarMensaje(dto.texto, dto.fuente, req.user.userId);
  }
}