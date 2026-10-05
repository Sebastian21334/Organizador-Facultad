import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MailService } from '../mail/services/mail.service';
import { ContactoDto } from './contacto.dto';
import { crearEmailContacto } from '../mail/templates/tempo-email';
import { LimitesService } from '../usuarios/services/limites.service';

@Injectable()
export class ContactoService {
  constructor(
    private readonly mail: MailService,
    private readonly limites: LimitesService,
  ) {}

  async enviar(dto: ContactoDto, origen: string): Promise<{ mensaje: string }> {
    if (dto.website) return { mensaje: 'Mensaje recibido.' };
    await this.limites.consumir('contacto-ip', origen, 3, 600_000);
    await this.limites.consumir('contacto-global', 'global', 30, 600_000);
    const correo = crearEmailContacto(dto);
    try {
      const resultado = await this.mail.enviarMail(
        'sebastiangonzalez100106@gmail.com',
        correo.asunto,
        correo.texto,
        correo.html,
      );
      if (resultado.status !== 'Succeeded')
        throw new Error('El proveedor no confirmó el envío');
    } catch {
      throw new ServiceUnavailableException(
        'No pudimos enviar tu mensaje. Intentá de nuevo o escribinos directamente por mail.',
      );
    }
    return {
      mensaje: 'Mensaje enviado. Te responderemos al email que indicaste.',
    };
  }
}
