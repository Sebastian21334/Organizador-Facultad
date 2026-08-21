import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { MateriasService } from '../services/materias.service';
import { CrearMateriaDto } from '../dto/crear-materia.dto';
import { ActualizarMateriaDto } from '../dto/actualizar-materia.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('materias')
export class MateriasController {
  constructor(private readonly materiasService: MateriasService) {}

  @Get()
  async obtenerTodas(@Req() req) {
    return this.materiasService.obtenerTodas(req.user.userId);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string, @Req() req) {
    return this.materiasService.obtenerPorId(id, req.user.userId);
  }

  @Post()
  async crear(@Body() dto: CrearMateriaDto, @Req() req) {
    return this.materiasService.crear(dto, req.user.userId);
  }

  @Patch(':id')
  async actualizar(@Param('id') id: string, @Body() dto: ActualizarMateriaDto, @Req() req) {
    return this.materiasService.actualizar(id, dto, req.user.userId);
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string, @Req() req) {
    await this.materiasService.eliminar(id, req.user.userId);
    return { mensaje: 'Materia eliminada correctamente' };
  }
}