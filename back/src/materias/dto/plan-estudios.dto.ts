import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional,
  IsString, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { Cuatrimestre } from '../entities/materia.entity';
import { MAX_MATERIAS_PLAN, MAX_TEXTO_PLAN } from '../plan-estudios';

export class AnalizarPlanDto {
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(20)
  @MaxLength(MAX_TEXTO_PLAN)
  texto!: string;
}

export class MateriaPlanDto {
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(1)
  @MaxLength(150)
  nombre!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  anioCursado?: number | null;

  @IsOptional()
  @IsEnum(Cuatrimestre)
  cuatrimestre?: Cuatrimestre | null;
}

export class ImportarPlanDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MATERIAS_PLAN)
  @ValidateNested({ each: true })
  @Type(() => MateriaPlanDto)
  materias!: MateriaPlanDto[];
}
