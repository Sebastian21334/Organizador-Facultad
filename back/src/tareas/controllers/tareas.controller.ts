import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { TareasService } from '../services/tareas.service';
import { CrearTareaDto } from '../dto/crear-tarea.dto';
import { Materia } from '../../materias/entities/materia.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tareas')
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @Get('calendario')
  async obtenerParaCalendario(
    @Query('desde') desde: string | undefined,
    @Query('hasta') hasta: string | undefined,
    @Req() req,
  ) {
    if (!desde || !hasta) {
      return [];
    }

    const desdeDate = new Date(desde);
    const hastaDate = new Date(hasta);

    if (isNaN(desdeDate.getTime()) || isNaN(hastaDate.getTime())) {
      return [];
    }

    return this.tareasService.obtenerParaCalendario(desdeDate, hastaDate, req.user.userId);
  } 

  @Get()
  async obtenerTodas(@Req() req) {
    return this.tareasService.obtenerTodas(req.user.userId);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string, @Req() req) {
    return this.tareasService.obtenerPorId(id, req.user.userId);
  }

  @Post()
  async crear(@Body() dto: CrearTareaDto, @Req() req) {
    const { materiaId, fechaLimite, ...resto } = dto;
    return this.tareasService.crear(
      {
        ...resto,
        fechaLimite: fechaLimite ? new Date(fechaLimite) : undefined,
        materia: materiaId ? ({ id: materiaId } as Materia) : undefined,
      },
      req.user.userId,
    );
  }

  @Patch(':id/completar')
  async marcarComoHecha(@Param('id') id: string, @Req() req) {
    return this.tareasService.marcarComoHecha(id, req.user.userId);
  }

  @Patch(':id')
  async actualizar(@Param('id') id: string, @Body() dto: Partial<CrearTareaDto>, @Req() req) {
    const { materiaId, fechaLimite, ...resto } = dto;
    return this.tareasService.actualizar(
      id,
      {
        ...resto,
        ...(fechaLimite ? { fechaLimite: new Date(fechaLimite) } : {}),
        ...(materiaId ? { materia: { id: materiaId } as Materia } : {}),
      },
      req.user.userId,
    );
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string, @Req() req) {
    await this.tareasService.eliminar(id, req.user.userId);
    return { mensaje: 'Tarea eliminada correctamente' };
  }
}