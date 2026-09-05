import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, MaxLength, IsInt, Min, Max } from 'class-validator';
import { TipoTarea, OrigenTarea } from '../entities/tarea.entity';

export class CrearTareaDto {
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsUUID()
  materiaId?: string;

  @IsOptional()
  @IsEnum(TipoTarea)
  tipo?: TipoTarea;

  @IsOptional()
  @IsDateString()
  fechaLimite?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  recordatorioMinutos?: number | null;

  @IsOptional()
  @IsEnum(OrigenTarea)
  origen?: OrigenTarea;
}