import { IsString, IsEnum } from 'class-validator';
import { FuenteMensaje } from '../entities/mensaje-entrante.entity';

export class CrearMensajeDto {
  @IsString()
  texto!: string; 

  @IsEnum(FuenteMensaje)
  fuente!: FuenteMensaje;
}