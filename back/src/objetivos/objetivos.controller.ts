import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SolicitudAutenticada } from '../auth/types/solicitud-autenticada';
import { Objetivo } from './objetivo.entity';
import { EstadoTarea, Tarea } from '../tareas/entities/tarea.entity';

class CrearObjetivoDto {
  @IsString() @MinLength(1) @MaxLength(200) titulo!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha!: string;
  @IsOptional() @IsUUID() tareaId?: string;
}
class EstadoObjetivoDto { @IsBoolean() completado!: boolean; }

@UseGuards(JwtAuthGuard)
@Controller('objetivos')
export class ObjetivosController {
  constructor(@InjectRepository(Objetivo) private readonly objetivos: Repository<Objetivo>, @InjectRepository(Tarea) private readonly tareas: Repository<Tarea>) {}
  @Get()
  listar(@Req() req: SolicitudAutenticada) {
    return this.objetivos.find({ where: { usuarioId: req.user.userId }, order: { fecha: 'DESC', creadoEn: 'DESC' } });
  }
  @Post()
  async crear(@Body() dto: CrearObjetivoDto, @Req() req: SolicitudAutenticada) {
    const titulo = dto.titulo.trim();
    if (!titulo) throw new BadRequestException('Ingresá un objetivo');
    if (dto.tareaId) {
      const tarea = await this.tareas.findOneBy({ id: dto.tareaId, usuarioId: req.user.userId });
      if (!tarea) throw new NotFoundException('Tarea no encontrada');
      if (tarea.estado === EstadoTarea.HECHA) throw new BadRequestException('Solo podés asociar tareas que no estén completadas');
    }
    return this.objetivos.save(this.objetivos.create({ titulo, fecha: dto.fecha, tareaId: dto.tareaId ?? null, usuarioId: req.user.userId }));
  }
  @Patch(':id')
  async cambiar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EstadoObjetivoDto, @Req() req: SolicitudAutenticada) {
    const objetivo = await this.objetivos.findOneBy({ id, usuarioId: req.user.userId });
    if (!objetivo) throw new NotFoundException('Objetivo no encontrado');
    objetivo.completado = dto.completado;
    return this.objetivos.save(objetivo);
  }
  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string, @Req() req: SolicitudAutenticada) {
    const resultado = await this.objetivos.delete({ id, usuarioId: req.user.userId });
    if (!resultado.affected) throw new NotFoundException('Objetivo no encontrado');
    return { mensaje: 'Objetivo eliminado' };
  }
}
