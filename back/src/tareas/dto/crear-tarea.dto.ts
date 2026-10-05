import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
  Max,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TipoTarea, EstadoTarea, OrigenTarea } from '../entities/tarea.entity';
import { Transform } from 'class-transformer';

export class CrearTareaDto {
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  titulo?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(4000)
  descripcion?: string;

  @IsOptional()
  @IsUUID()
  materiaId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TipoTarea)
  tipo?: TipoTarea;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @IsOptional()
  @IsDateString()
  fechaLimite?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  recordatorioMinutos?: number | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(OrigenTarea)
  origen?: OrigenTarea;
}
