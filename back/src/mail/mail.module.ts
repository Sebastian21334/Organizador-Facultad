import { Module } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [UsuariosModule, PushModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
