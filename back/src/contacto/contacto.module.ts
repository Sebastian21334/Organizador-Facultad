import { Body, Controller, Module, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MailModule } from '../mail/mail.module';
import { ContactoDto } from './contacto.dto';
import { ContactoService } from './contacto.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Controller('contacto')
class ContactoController {
  constructor(private readonly contacto: ContactoService) {}

  @Post()
  enviar(@Body() dto: ContactoDto, @Req() req: Request) {
    return this.contacto.enviar(
      dto,
      req.ip ?? req.socket.remoteAddress ?? 'desconocido',
    );
  }
}

@Module({
  imports: [MailModule, UsuariosModule],
  controllers: [ContactoController],
  providers: [ContactoService],
})
export class ContactoModule {}
