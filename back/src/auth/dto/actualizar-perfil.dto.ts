import { IsNotEmpty, IsString } from 'class-validator';

export class ActualizarPerfilDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}
