import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class ActualizarPerfilDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  recordatorioEmailHabilitado?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  recordatorioMinutos?: number | null;
}
