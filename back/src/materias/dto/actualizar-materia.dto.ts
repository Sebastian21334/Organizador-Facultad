import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Cuatrimestre, EstadoMateria } from '../entities/materia.entity';

export class ActualizarMateriaDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsInt()
  anioCursado?: number;

  @IsOptional()
  @IsEnum(Cuatrimestre)
  cuatrimestre?: Cuatrimestre;

  @IsOptional()
  @IsEnum(EstadoMateria)
  estado?: EstadoMateria;
}