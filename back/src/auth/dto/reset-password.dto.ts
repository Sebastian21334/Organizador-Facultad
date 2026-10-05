import { IsString, Length, Matches } from 'class-validator';
import { PasswordBytes } from './password.dto';
export class ResetPasswordDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @IsString() @Length(15, 72) @PasswordBytes() nuevaPassword!: string;
}
