import { Injectable, Logger } from '@nestjs/common';
import { EmailClient } from '@azure/communication-email';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: EmailClient;
  private readonly senderAddress: string;

  constructor() {
    const connectionString = process.env.ACS_CONNECTION_STRING;
    const senderAddress = process.env.ACS_SENDER_ADDRESS;

    if (!connectionString || !senderAddress) {
      throw new Error('Faltan las variables de entorno ACS_CONNECTION_STRING o ACS_SENDER_ADDRESS');
    }

    this.client = new EmailClient(connectionString);
    this.senderAddress = senderAddress;
  }

  async enviarMail(destinatario: string, asunto: string, textoPlano: string, html?: string) {
    const message = {
      senderAddress: this.senderAddress,
      content: {
        subject: asunto,
        plainText: textoPlano,
        html: html ?? `<p>${textoPlano}</p>`,
      },
      recipients: {
        to: [{ address: destinatario }],
      },
    };

    try {
      const poller = await this.client.beginSend(message);
      const result = await poller.pollUntilDone();
      this.logger.log(`Mail enviado a ${destinatario}: ${result.status}`);
      return result;
    } catch (error) {
      this.logger.error(`Error enviando mail a ${destinatario}`, error);
      throw error;
    }
  }

  async enviarVerificacionEmail(destinatario: string, nombre: string, token: string) {
    const link = `${process.env.FRONTEND_URL}/verificar-email?token=${token}`;
    await this.enviarMail(
        destinatario,
        'Confirmá tu cuenta - Organizador Facultad',
        `Hola ${nombre}, confirmá tu cuenta entrando a este link: ${link}`,
        `<p>Hola ${nombre},</p><p>Confirmá tu cuenta haciendo click <a href="${link}">acá</a>.</p><p>Este link expira en 24 horas.</p>`,
    );
    }

    async enviarResetPassword(destinatario: string, nombre: string, token: string) {
    const link = `${process.env.FRONTEND_URL}/resetear-password?token=${token}`;
    await this.enviarMail(
        destinatario,
        'Recuperar contraseña - Organizador Facultad',
        `Hola ${nombre}, para restablecer tu contraseña entrá a: ${link}`,
        `<p>Hola ${nombre},</p><p>Restablecé tu contraseña haciendo click <a href="${link}">acá</a>.</p><p>Este link expira en 1 hora. Si no pediste esto, ignorá el mail.</p>`,
    );
    }
}