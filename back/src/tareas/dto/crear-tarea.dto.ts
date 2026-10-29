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
  Matches,
} from 'class-validator';
import { TipoTarea, EstadoTarea, OrigenTarea } from '../entities/tarea.entity';
import { Transform } from 'class-transformer';

export class CrearTareaDto {
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(1)
  titulo?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(4000)
  descripcion?: string;

  @IsOptional()
  @IsUUID()
  materiaId?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TipoTarea)
  tipo?: TipoTarea;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/,
    {
      message:
        'fechaLimite debe incluir fecha real, hora y zona (Z o un offset como -03:00)',
    },
  )
  fechaLimite?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  recordatorioMinutos?: number | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(OrigenTarea)
  origen?: OrigenTarea;
}
