import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webPush from 'web-push';
import { PushSubscriptionsRepository } from '../repositories/push-subscriptions.repository';
import { RegistrarPushSubscriptionDto } from '../dto/push-subscription.dto';

export interface PushResumen {
  titulo: string;
  texto: string;
  url: string;
  tag?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly vapid?: {
    subject: string;
    publicKey: string;
    privateKey: string;
  };

  constructor(
    private readonly repository: PushSubscriptionsRepository,
    config: ConfigService,
  ) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
    const subject = config.get<string>('VAPID_SUBJECT');
    if (publicKey && privateKey && subject) {
      if (
        Buffer.from(publicKey, 'base64url').length !== 65 ||
        Buffer.from(privateKey, 'base64url').length !== 32 ||
        !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)
      ) {
        this.logger.warn(
          'Push deshabilitado: configuración VAPID inválida. Los correos siguen funcionando.',
        );
        return;
      }
      this.vapid = { subject, publicKey, privateKey };
    } else
      this.logger.warn(
        'Push deshabilitado: faltan variables VAPID. Los correos siguen funcionando.',
      );
  }

  clavePublica(): { publicKey: string } {
    if (!this.vapid)
      throw new ServiceUnavailableException(
        'Las notificaciones push todavía no están configuradas.',
      );
    return { publicKey: this.vapid.publicKey };
  }
  async registrar(
    usuarioId: string,
    datos: RegistrarPushSubscriptionDto,
  ): Promise<{ mensaje: string }> {
    this.clavePublica();
    this.validarEndpoint(datos.endpoint);
    const publicKey = Buffer.from(datos.keys.p256dh, 'base64url');
    if (
      publicKey.length !== 65 ||
      publicKey[0] !== 4 ||
      Buffer.from(datos.keys.auth, 'base64url').length !== 16
    )
      throw new BadRequestException(
        'Las claves de la suscripción no son válidas.',
      );
    await this.repository.registrar(usuarioId, datos);
    return { mensaje: 'Notificaciones activadas en este dispositivo.' };
  }
  async listar(usuarioId: string): Promise<{ endpoints: string[] }> {
    return {
      endpoints: (await this.repository.buscarPorUsuario(usuarioId)).map(
        (s) => s.endpoint,
      ),
    };
  }
  async eliminar(
    usuarioId: string,
    endpoint: string,
  ): Promise<{ mensaje: string }> {
    await this.repository.eliminar(usuarioId, endpoint);
    return { mensaje: 'Notificaciones desactivadas en este dispositivo.' };
  }
  async enviarAUsuario(usuarioId: string, resumen: PushResumen): Promise<void> {
    if (!this.vapid) return;
    try {
      const suscripciones = await this.repository.buscarPorUsuario(usuarioId);
      const url =
        resumen.url.startsWith('/') && !resumen.url.startsWith('//')
          ? resumen.url
          : '/tareas';
      const payload = JSON.stringify({
        notification: {
          title: resumen.titulo.slice(0, 100),
          body: resumen.texto.slice(0, 240),
          icon: '/icons/icon-192x192.png',
          ...(resumen.tag ? { tag: resumen.tag } : {}),
          data: {
            url,
            onActionClick: {
              default: { operation: 'navigateLastFocusedOrOpen', url },
            },
          },
        },
      });
      await Promise.all(
        suscripciones.map(async (suscripcion) => {
          try {
            this.validarEndpoint(suscripcion.endpoint);
            await webPush.sendNotification(
              { endpoint: suscripcion.endpoint, keys: suscripcion.keys },
              payload,
              {
                vapidDetails: this.vapid,
                timeout: 5_000,
                TTL: 3600,
                urgency: 'normal',
              },
            );
          } catch (error) {
            const status = (error as { statusCode?: number })?.statusCode;
            if (status === 404 || status === 410) {
              try {
                await this.repository.eliminarInvalida(suscripcion);
              } catch {
                this.logger.warn('No se pudo limpiar una suscripción vencida.');
              }
            } else
              this.logger.warn(
                'No se pudo enviar push a un dispositivo; el correo sigue su flujo.',
              );
          }
        }),
      );
    } catch {
      this.logger.warn(
        'No se pudieron procesar las suscripciones push; el correo sigue su flujo.',
      );
    }
  }

  private validarEndpoint(endpoint: string): void {
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw new BadRequestException('Endpoint push inválido.');
    }
    const hosts = [
      'fcm.googleapis.com',
      'fcm.push.google.com',
      'updates.push.services.mozilla.com',
      'web.push.apple.com',
    ];
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash ||
      (url.port && url.port !== '443') ||
      (!hosts.includes(url.hostname) &&
        !/^[a-z0-9.-]+\.notify\.windows\.com$/.test(url.hostname))
    )
      throw new BadRequestException(
        'El endpoint debe pertenecer a un servicio push del navegador compatible.',
      );
  }
}
