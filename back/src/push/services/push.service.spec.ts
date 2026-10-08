import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import webPush from 'web-push';
import { PushService } from './push.service';
import { PushSubscriptionsRepository } from '../repositories/push-subscriptions.repository';

describe('Push aislado del correo (sin servicios externos)', () => {
  const keys = webPush.generateVAPIDKeys();
  const config = new ConfigService({
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: 'mailto:tempo@example.com',
  });
  const subscription = (id: string) => ({
    id,
    usuarioId: 'usuario',
    endpoint: 'https://fcm.googleapis.com/fcm/send/' + id,
    keys: {
      p256dh: keys.publicKey,
      auth: Buffer.alloc(16).toString('base64url'),
    },
  });
  const repo = {
    registrar: jest.fn(),
    buscarPorUsuario: jest.fn(),
    eliminar: jest.fn(),
    eliminarInvalida: jest.fn(),
  };
  let service: PushService;
  let send: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    send = jest
      .spyOn(webPush, 'sendNotification')
      .mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    repo.buscarPorUsuario.mockResolvedValue([
      subscription('uno'),
      subscription('dos'),
    ]);
    service = new PushService(
      repo as unknown as PushSubscriptionsRepository,
      config,
    );
  });
  afterEach(() => jest.restoreAllMocks());
  it('envía a todos los dispositivos y permite abrir la ruta con la app cerrada', async () => {
    await service.enviarAUsuario('usuario', {
      titulo: 'Parcial',
      texto: 'Vence mañana',
      url: '/tareas',
    });
    expect(send).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(send.mock.calls[0][1]);
    expect(payload.notification.data.onActionClick.default).toEqual({
      operation: 'navigateLastFocusedOrOpen',
      url: '/tareas',
    });
    expect(send.mock.calls[0][2].timeout).toBe(5000);
    expect(repo.buscarPorUsuario).toHaveBeenCalledWith('usuario');
  });
  it.each([404, 410])(
    'elimina la suscripción inválida (%i) y sigue con el otro dispositivo',
    async (statusCode) => {
      send.mockRejectedValueOnce({ statusCode });
      await expect(
        service.enviarAUsuario('usuario', {
          titulo: 'Parcial',
          texto: 'Vence mañana',
          url: '/tareas',
        }),
      ).resolves.toBeUndefined();
      expect(repo.eliminarInvalida).toHaveBeenCalledWith(subscription('uno'));
      expect(send).toHaveBeenCalledTimes(2);
    },
  );
  it('conserva suscripciones ante fallos temporales y absorbe errores de base de datos', async () => {
    send.mockRejectedValue({ statusCode: 503 });
    await service.enviarAUsuario('usuario', {
      titulo: 'Parcial',
      texto: 'Aviso',
      url: '/tareas',
    });
    expect(repo.eliminarInvalida).not.toHaveBeenCalled();
    repo.buscarPorUsuario.mockRejectedValueOnce(new Error('DB caída'));
    await expect(
      service.enviarAUsuario('usuario', {
        titulo: 'Parcial',
        texto: 'Aviso',
        url: '/tareas',
      }),
    ).resolves.toBeUndefined();
  });
  it('sin VAPID no intenta enviar ni impide arrancar el servicio', async () => {
    const disabled = new PushService(repo as any, new ConfigService({}));
    expect(() => disabled.clavePublica()).toThrow('no están configuradas');
    await disabled.enviarAUsuario('usuario', {
      titulo: 'Aviso',
      texto: 'Aviso',
      url: '/tareas',
    });
    expect(send).not.toHaveBeenCalled();
  });
  it('rechaza endpoints privados y dominios que imitan al proveedor antes de persistir', async () => {
    for (const endpoint of [
      'https://127.0.0.1/push',
      'https://fcm.googleapis.com.attacker.example/push',
      'https://web.push.apple.com:8443/push',
    ]) {
      await expect(
        service.registrar('usuario', { ...subscription('uno'), endpoint }),
      ).rejects.toThrow('servicio push');
    }
    expect(repo.registrar).not.toHaveBeenCalled();
  });
});
