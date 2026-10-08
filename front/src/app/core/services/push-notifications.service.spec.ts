import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PushNotificationsService } from './push-notifications.service';
import { PwaPlatformService } from './pwa-platform.service';

describe('Suscripción push por consentimiento explícito (sin permiso ni red reales)', () => {
  let push: PushNotificationsService;
  let http: HttpTestingController;
  let subscriptions: BehaviorSubject<PushSubscription | null>;
  let clicks: Subject<any>;
  let changes: Subject<any>;
  const request = vi.fn();
  const unsubscribe = vi.fn();
  const navigate = vi.fn();
  const notification = { permission: 'default' as NotificationPermission };
  const installed = signal(false);
  const platform = { platform: 'other', installed };
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/dispositivo',
    toJSON: () => ({ keys: { p256dh: 'publica-del-dispositivo', auth: 'auth-del-dispositivo' } }),
  } as unknown as PushSubscription;
  beforeEach(() => {
    vi.stubGlobal('Notification', notification);
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('isSecureContext', true);
    notification.permission = 'default';
    installed.set(false);
    platform.platform = 'other';
    subscriptions = new BehaviorSubject<PushSubscription | null>(null);
    clicks = new Subject();
    changes = new Subject();
    request.mockReset().mockImplementation(async () => {
      notification.permission = 'granted';
      subscriptions.next(subscription);
      return subscription;
    });
    unsubscribe.mockReset().mockImplementation(async () => subscriptions.next(null));
    navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl: navigate } },
        { provide: PwaPlatformService, useValue: platform },
        {
          provide: SwPush,
          useValue: {
            isEnabled: true,
            subscription: subscriptions,
            notificationClicks: clicks,
            pushSubscriptionChanges: changes,
            requestSubscription: request,
            unsubscribe,
          },
        },
      ],
    });
    push = TestBed.inject(PushNotificationsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
  function load(endpoints: string[] = []) {
    push.setSessionActive(true);
    http.expectOne('/push/public-key').flush({ publicKey: 'vapid-publica' });
    http.expectOne('/push/subscriptions').flush({ endpoints });
  }
  async function enable() {
    load();
    const pending = push.activate();
    expect(request).toHaveBeenCalledWith({ serverPublicKey: 'vapid-publica' });
    await Promise.resolve();
    const registration = http.expectOne('/push/subscriptions');
    expect(registration.request.method).toBe('POST');
    expect(registration.request.body).toMatchObject({
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
    });
    expect(registration.request.body).not.toHaveProperty('expirationTime');
    registration.flush({ mensaje: 'Activadas' });
    await pending;
  }
  it('cargar la página no solicita permiso; solo el botón activa y registra', async () => {
    load();
    expect(request).not.toHaveBeenCalled();
    expect(push.state()).toBe('disabled');
    const pending = push.activate();
    expect(request).toHaveBeenCalledOnce();
    await Promise.resolve();
    http.expectOne('/push/subscriptions').flush({ mensaje: 'Activadas' });
    await pending;
    expect(push.state()).toBe('enabled');
    expect(localStorage.getItem('tempo-push-endpoint-v1')).toBe(subscription.endpoint);
  });
  it('elimina en el servidor antes de quitar la suscripción del navegador', async () => {
    await enable();
    const pending = firstValueFrom(push.beforeLogout());
    expect(unsubscribe).not.toHaveBeenCalled();
    const deletion = http.expectOne('/push/subscriptions');
    expect(deletion.request.method).toBe('DELETE');
    expect(deletion.request.body).toEqual({ endpoint: subscription.endpoint });
    deletion.flush({ mensaje: 'Desactivadas' });
    await pending;
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(push.state()).toBe('disabled');
    expect(localStorage.getItem('tempo-push-endpoint-v1')).toBeNull();
  });
  it('un registro fallido desuscribe el dispositivo y no muestra activadas', async () => {
    load();
    const pending = push.activate();
    await Promise.resolve();
    http.expectOne('/push/subscriptions').flush({}, { status: 503, statusText: 'Unavailable' });
    await pending;
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(push.state()).toBe('disabled');
    expect(push.error()).toBeTruthy();
  });
  it('una baja fallida conserva la suscripción para reintentar', async () => {
    await enable();
    push.disable();
    http.expectOne('/push/subscriptions').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(push.state()).toBe('enabled');
    expect(push.error()).toBeTruthy();
  });
  it('distingue permiso bloqueado e iPhone sin instalar', () => {
    notification.permission = 'denied';
    subscriptions.next(null);
    expect(push.state()).toBe('blocked');
    platform.platform = 'ios-safari';
    notification.permission = 'default';
    subscriptions.next(null);
    expect(push.state()).toBe('install-required');
    expect(request).not.toHaveBeenCalled();
  });
  it('una suscripción de otra cuenta no figura como activada ni se registra automáticamente', () => {
    notification.permission = 'granted';
    subscriptions.next(subscription);
    load([]);
    expect(push.state()).toBe('disabled');
    expect(request).not.toHaveBeenCalled();
    http.expectNone((req) => req.method === 'POST');
  });
  it('renueva una suscripción ya autorizada sin volver a pedir permiso', () => {
    notification.permission = 'granted';
    subscriptions.next(subscription);
    load([subscription.endpoint]);
    const renewed = {
      ...subscription,
      endpoint: subscription.endpoint + '-nueva',
    } as PushSubscription;
    changes.next({ oldSubscription: subscription, newSubscription: renewed });
    http.expectOne('/push/subscriptions').flush({ mensaje: 'Eliminada' });
    const registration = http.expectOne('/push/subscriptions');
    expect(registration.request.body.endpoint).toBe(renewed.endpoint);
    registration.flush({ mensaje: 'Registrada' });
    expect(request).not.toHaveBeenCalled();
    expect(push.state()).toBe('enabled');
  });
  it('navega al tocar avisos de la app e ignora URLs externas o inválidas', () => {
    clicks.next({ notification: { data: { url: '/tareas' } } });
    clicks.next({ notification: { data: { url: 'https://attacker.example/tareas' } } });
    clicks.next({ notification: { data: { url: 'http://[' } } });
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/tareas');
  });
});
