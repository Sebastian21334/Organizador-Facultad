import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LimitesService } from '../../usuarios/services/limites.service';
import { EmailClient } from '@azure/communication-email';
import {
  crearEmailTempo,
  crearEmailVerificacion,
  crearEmailReset,
  crearEmailRecordatorio,
} from '../templates/tempo-email';
import type { RecordatorioEmail } from '../templates/tempo-email';
import { PushService } from '../../push/services/push.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: EmailClient;
  private readonly senderAddress: string;
  private activos = 0;

  constructor(
    private readonly limites: LimitesService,
    private readonly push: PushService,
  ) {
    const connectionString = process.env.ACS_CONNECTION_STRING;
    const senderAddress = process.env.ACS_SENDER_ADDRESS;

    if (!connectionString || !senderAddress) {
      throw new Error(
        'Faltan las variables de entorno ACS_CONNECTION_STRING o ACS_SENDER_ADDRESS',
      );
    }

    this.client = new EmailClient(connectionString);
    this.senderAddress = senderAddress;
  }

  async enviarMail(
    destinatario: string,
    asunto: string,
    textoPlano: string,
    html?: string,
  ) {
    if (this.activos >= 8)
      throw new ServiceUnavailableException(
        'El servicio de correo está ocupado',
      );
    this.activos++;
    try {
      await this.limites.consumir('mail-global-minuto', 'global', 60, 60_000);
      await this.limites.consumir(
        'mail-global-dia',
        'global',
        1000,
        86_400_000,
      );
      const message = {
        senderAddress: this.senderAddress,
        content: {
          subject: asunto,
          plainText: textoPlano,
          html:
            html ??
            crearEmailTempo({
              asunto,
              preheader: asunto,
              etiqueta: 'Tu espacio académico',
              titulo: asunto,
              parrafos: [textoPlano],
              nota: 'Un mensaje de Tempo para vos.',
            }).html,
        },
        recipients: {
          to: [{ address: destinatario }],
        },
      };

      const abortSignal = AbortSignal.timeout(45_000);
      const poller = await this.client.beginSend(message, { abortSignal });
      const result = await poller.pollUntilDone({ abortSignal });
      if (result.status !== 'Succeeded')
        throw new Error(`El proveedor no confirmó el envío: ${result.status}`);
      this.logger.log('Correo confirmado por el proveedor');
      return result;
    } catch (error) {
      this.logger.warn(
        'No se pudo confirmar un correo; revisar el estado del proveedor',
      );
      throw error;
    } finally {
      this.activos--;
    }
  }

  async enviarVerificacionEmail(
    destinatario: string,
    nombre: string,
    token: string,
  ) {
    const correo = crearEmailVerificacion(
      process.env.FRONTEND_URL,
      nombre,
      token,
    );
    return this.enviarMail(
      destinatario,
      correo.asunto,
      correo.texto,
      correo.html,
    );
  }

  async enviarResetPassword(
    destinatario: string,
    nombre: string,
    token: string,
  ) {
    const correo = crearEmailReset(process.env.FRONTEND_URL, nombre, token);
    return this.enviarMail(
      destinatario,
      correo.asunto,
      correo.texto,
      correo.html,
    );
  }

  async enviarRecordatorio(
    destinatario: string,
    tarea: RecordatorioEmail,
    usuarioId?: string,
  ) {
    const correo = crearEmailRecordatorio(process.env.FRONTEND_URL, tarea);
    if (usuarioId) {
      const fecha = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: false,
      }).format(tarea.fechaLimite);
      // Se dispara en el mismo flujo, sin esperar push ni alterar la confirmación del correo.
      void this.push
        .enviarAUsuario(usuarioId, {
          titulo: correo.asunto,
          texto: `${tarea.titulo}${tarea.materia ? ' · ' + tarea.materia : ''}. Vence ${fecha} (hora de Argentina).`,
          url: '/tareas',
        })
        .catch(() =>
          this.logger.warn('El push falló; el correo sigue su flujo.'),
        );
    }
    return this.enviarMail(
      destinatario,
      correo.asunto,
      correo.texto,
      correo.html,
    );
  }
}
