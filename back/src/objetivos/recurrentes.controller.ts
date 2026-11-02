import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDateString, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SolicitudAutenticada } from '../auth/types/solicitud-autenticada';

class CrearRecurrenteDto { @IsString() @MinLength(1) @MaxLength(200) titulo!: string; }
class MarcarRecurrenteDto {
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha!: string;
  @IsBoolean() completado!: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('objetivos/recurrentes')
export class RecurrentesController {
  constructor(private readonly db: DataSource) {}
  @Get()
  listar(@Req() req: SolicitudAutenticada) {
    return this.db.query(`SELECT r.id, r.titulo, r."fechaInicio"::text, COALESCE(
      array_agg(c.fecha::text ORDER BY c.fecha) FILTER (WHERE c.fecha IS NOT NULL), ARRAY[]::text[]
    ) AS "fechasCompletadas" FROM objetivos_recurrentes r
      LEFT JOIN objetivos_recurrentes_cumplidos c ON c."objetivoId" = r.id
      WHERE r."usuarioId" = $1 GROUP BY r.id ORDER BY r."creadoEn", r.id`, [req.user.userId]);
  }
  @Post()
  async crear(@Body() dto: CrearRecurrenteDto, @Req() req: SolicitudAutenticada) {
    const titulo = dto.titulo.trim();
    if (!titulo) throw new BadRequestException('Ingresá un objetivo');
    const rows: unknown[] = await this.db.query(`INSERT INTO objetivos_recurrentes (titulo, "usuarioId") VALUES ($1, $2)
      RETURNING id, titulo, "fechaInicio"::text, ARRAY[]::text[] AS "fechasCompletadas"`, [titulo, req.user.userId]);
    return rows[0];
  }
  @Patch(':id')
  async marcar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MarcarRecurrenteDto, @Req() req: SolicitudAutenticada) {
    const rows: { permitido: boolean }[] = await this.db.query(`SELECT ($3::date >= "fechaInicio" AND $3::date <= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) AS permitido
      FROM objetivos_recurrentes WHERE id = $1 AND "usuarioId" = $2`, [id, req.user.userId, dto.fecha]);
    if (!rows.length) throw new NotFoundException('Objetivo no encontrado');
    if (!rows[0].permitido) throw new BadRequestException('Elegí un día desde la creación del objetivo hasta hoy');
    if (dto.completado) await this.db.query('INSERT INTO objetivos_recurrentes_cumplidos ("objetivoId", fecha) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, dto.fecha]);
    else await this.db.query('DELETE FROM objetivos_recurrentes_cumplidos WHERE "objetivoId" = $1 AND fecha = $2', [id, dto.fecha]);
    return { completado: dto.completado, fecha: dto.fecha };
  }
  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string, @Req() req: SolicitudAutenticada) {
    const rows: unknown[] = await this.db.query('DELETE FROM objetivos_recurrentes WHERE id = $1 AND "usuarioId" = $2 RETURNING id', [id, req.user.userId]);
    if (!rows.length) throw new NotFoundException('Objetivo no encontrado');
    return { mensaje: 'Objetivo eliminado' };
  }
}
