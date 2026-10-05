import { IsString, IsEnum, Length } from 'class-validator';
import { FuenteMensaje } from '../entities/mensaje-entrante.entity';
import { Transform } from 'class-transformer';

export class CrearMensajeDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(1, 4000)
  texto!: string;

  @IsEnum(FuenteMensaje)
  fuente!: FuenteMensaje;
}
