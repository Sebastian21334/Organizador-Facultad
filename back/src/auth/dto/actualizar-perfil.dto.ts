import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class ActualizarPerfilDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsBoolean()
  recordatorioEmailHabilitado?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  recordatorioMinutos?: number | null;
}
