import { Module } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
