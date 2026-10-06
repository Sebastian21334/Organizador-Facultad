import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { PaginacionDto } from '../../paginacion.dto';
import { MateriasService } from '../services/materias.service';
import { CrearMateriaDto } from '../dto/crear-materia.dto';
import { ActualizarMateriaDto } from '../dto/actualizar-materia.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlanEstudiosService } from '../services/plan-estudios.service';
import { AnalizarPlanDto, ImportarPlanDto } from '../dto/plan-estudios.dto';

@UseGuards(JwtAuthGuard)
@Controller('materias')
export class MateriasController {
  constructor(
    private readonly materiasService: MateriasService,
    private readonly planEstudios: PlanEstudiosService,
  ) {}

  @Post('plan/analizar')
  analizarPlan(@Body() dto: AnalizarPlanDto, @Req() req) {
    return this.planEstudios.analizar(dto.texto, req.user.userId);
  }

  @Post('plan/importar')
  importarPlan(@Body() dto: ImportarPlanDto, @Req() req) {
    return this.planEstudios.importar(dto.materias, req.user.userId);
  }

  @Get()
  async obtenerTodas(@Req() req, @Query() paginacion: PaginacionDto) {
    return this.materiasService.obtenerTodas(req.user.userId, paginacion);
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.materiasService.obtenerPorId(id, req.user.userId);
  }

  @Post()
  async crear(@Body() dto: CrearMateriaDto, @Req() req) {
    return this.materiasService.crear(dto, req.user.userId);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarMateriaDto,
    @Req() req,
  ) {
    return this.materiasService.actualizar(id, dto, req.user.userId);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    await this.materiasService.eliminar(id, req.user.userId);
    return { mensaje: 'Materia eliminada correctamente' };
  }
}
