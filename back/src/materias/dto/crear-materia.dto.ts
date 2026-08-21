import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Cuatrimestre, EstadoMateria } from '../entities/materia.entity';

export class CrearMateriaDto {
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsInt()
  anioCursado?: number;

  @IsEnum(Cuatrimestre)
  cuatrimestre?: Cuatrimestre;

  @IsOptional()
  @IsEnum(EstadoMateria)
  estado?: EstadoMateria;
}