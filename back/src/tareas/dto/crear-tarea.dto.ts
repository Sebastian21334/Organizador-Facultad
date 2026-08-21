import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, MaxLength } from 'class-validator';
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
  @IsEnum(OrigenTarea)
  origen?: OrigenTarea;
}