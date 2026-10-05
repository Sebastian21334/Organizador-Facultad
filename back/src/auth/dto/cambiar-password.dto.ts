import { IsString, Length } from 'class-validator';
import { PasswordBytes } from './password.dto';
export class CambiarPasswordDto {
  @IsString() @Length(1, 72) @PasswordBytes() contraseñaActual!: string;
  @IsString() @Length(15, 72) @PasswordBytes() nuevaPassword!: string;
}
