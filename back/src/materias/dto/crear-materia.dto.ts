import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Cuatrimestre, EstadoMateria } from '../entities/materia.entity';

export class CrearMateriaDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  anioCursado?: number;

  @IsOptional()
  @IsEnum(Cuatrimestre)
  cuatrimestre?: Cuatrimestre;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(EstadoMateria)
  estado?: EstadoMateria;
}
