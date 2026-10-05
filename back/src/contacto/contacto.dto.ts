import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class ContactoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 80)
  nombre!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(['problema', 'sugerencia', 'consulta'])
  motivo!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(10, 3000)
  mensaje!: string;

  // Campo invisible para filtrar envíos automatizados comunes.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
