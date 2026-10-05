import { IsString, Matches, Length } from 'class-validator';
import { PasswordBytes } from './password.dto';
export class VerifyEmailDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @IsString() @Length(1, 72) @PasswordBytes() password!: string;
}
