import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  finalize,
  firstValueFrom,
  forkJoin,
  from,
  of,
  switchMap,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { PwaPlatformService } from './pwa-platform.service';

export type PushState = 'enabled' | 'disabled' | 'blocked' | 'unsupported' | 'install-required';

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly swPush = inject(SwPush);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly pwa = inject(PwaPlatformService);
  private readonly win = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageKey = 'tempo-push-endpoint-v1';
  private readonly subscription = signal<PushSubscription | null>(null);
  private readonly deviceReady = signal(false);
  private readonly endpoints = signal<string[]>([]);
  private readonly publicKey = signal('');
  private readonly signedIn = signal(false);
  private readonly permission = signal<NotificationPermission>(this.readPermission());
  private generation = 0;
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly state = computed<PushState>(() => {
    if (this.pwa.platform.startsWith('ios') && !this.pwa.installed()) return 'install-required';
    if (
      !this.swPush.isEnabled ||
      !this.win?.isSecureContext ||
      !('Notification' in this.win) ||
      !('PushManager' in this.win)
    )
      return 'unsupported';
    if (this.permission() === 'denied') return 'blocked';
    return this.signedIn() &&
      !!this.subscription() &&
      this.endpoints().includes(this.subscription()!.endpoint)
      ? 'enabled'
      : 'disabled';
  });
  readonly canActivate = computed(
    () =>
      this.signedIn() &&
      this.deviceReady() &&
      !!this.publicKey() &&
      !this.busy() &&
      this.state() === 'disabled',
  );
  readonly hasSubscription = computed(() => !!this.subscription());

  constructor() {
    this.swPush.subscription.pipe(takeUntilDestroyed()).subscribe((subscription) => {
      this.subscription.set(subscription);
      this.deviceReady.set(true);
      this.permission.set(this.readPermission());
    });
    this.swPush.notificationClicks.pipe(takeUntilDestroyed()).subscribe(({ notification }) => {
      const raw: unknown = notification.data?.url;
      if (typeof raw !== 'string' || !this.win) return;
      try {
        const url = new URL(raw, this.win.location.origin);
        if (
          url.origin === this.win.location.origin &&
          /^\/(tareas|calendario|inicio|perfil|mensajes)(\/|$)/.test(url.pathname)
        )
          void this.router.navigateByUrl(url.pathname + url.search + url.hash);
      } catch {
        /* Ignorar un payload que no contenga una URL válida. */
      }
    });
    this.swPush.pushSubscriptionChanges
      .pipe(takeUntilDestroyed())
      .subscribe(({ oldSubscription, newSubscription }) => {
        if (
          !this.signedIn() ||
          !oldSubscription ||
          !newSubscription ||
          !this.endpoints().includes(oldSubscription.endpoint)
        )
          return;
        // Renovación de un permiso ya concedido, nunca solicita un permiso nuevo.
        this.http
          .delete('/push/subscriptions', { body: { endpoint: oldSubscription.endpoint } })
          .pipe(switchMap(() => this.register(newSubscription)))
          .subscribe({
            next: () => this.remember(newSubscription),
            error: () =>
              this.error.set('La suscripción cambió. Volvé a activar las notificaciones.'),
          });
      });
    const onFocus = () => this.permission.set(this.readPermission());
    this.win?.addEventListener('focus', onFocus);
    this.destroyRef.onDestroy(() => this.win?.removeEventListener('focus', onFocus));
  }

  setSessionActive(active: boolean): void {
    if (this.signedIn() === active) return;
    this.signedIn.set(active);
    this.generation++;
    this.endpoints.set([]);
    this.publicKey.set('');
    this.error.set('');
    if (active) this.refresh();
    else {
      this.loading.set(false);
      void this.unsubscribeLocally();
    }
  }

  refresh(): void {
    if (!this.signedIn() || this.state() === 'unsupported' || this.state() === 'install-required')
      return;
    const generation = this.generation;
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      key: this.http.get<{ publicKey: string }>('/push/public-key'),
      devices: this.http.get<{ endpoints: string[] }>('/push/subscriptions'),
    })
      .pipe(
        timeout(75_000),
        finalize(() => {
          if (generation === this.generation) this.loading.set(false);
        }),
      )
      .subscribe({
        next: ({ key, devices }) => {
          if (generation !== this.generation) return;
          this.publicKey.set(key.publicKey);
          this.endpoints.set(devices.endpoints);
          if (this.subscription() && devices.endpoints.includes(this.subscription()!.endpoint))
            this.storeEndpoint(this.subscription()!.endpoint);
        },
        error: () => {
          if (generation === this.generation)
            this.error.set(
              'No pudimos comprobar las notificaciones. Intentá de nuevo en un momento.',
            );
        },
      });
  }

  async activate(): Promise<void> {
    if (!this.canActivate()) return;
    const generation = this.generation;
    this.busy.set(true);
    this.error.set('');
    try {
      // Clave ya cargada: esta llamada parte directamente del clic, también en Safari.
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.publicKey(),
      });
      this.subscription.set(subscription);
      if (generation !== this.generation || !this.signedIn()) {
        await this.unsubscribeLocally();
        return;
      }
      await firstValueFrom(this.register(subscription).pipe(timeout(75_000)));
      if (generation !== this.generation || !this.signedIn()) {
        await this.unsubscribeLocally();
        return;
      }
      this.remember(subscription);
    } catch {
      this.permission.set(this.readPermission());
      if (this.permission() !== 'denied')
        this.error.set(
          'No pudimos activar las notificaciones. Si cambió la configuración, desactivalas primero y volvé a intentar.',
        );
      // Un registro incompleto no debe dejar a este dispositivo recibiendo avisos de otra cuenta.
      await this.unsubscribeLocally();
    } finally {
      this.busy.set(false);
    }
  }

  disable(): void {
    this.beforeLogout().subscribe({
      error: () =>
        this.error.set(
          'No pudimos desactivar las notificaciones. Revisá la conexión e intentá de nuevo.',
        ),
    });
  }

  beforeLogout(): Observable<void> {
    if (this.busy())
      return throwError(() => new Error('Esperá a que termine el cambio de notificaciones.'));
    const endpoint = this.subscription()?.endpoint || this.storedEndpoint();
    if (!endpoint) return of(undefined);
    this.busy.set(true);
    this.error.set('');
    return this.http.delete('/push/subscriptions', { body: { endpoint } }).pipe(
      timeout(75_000),
      tap(() => this.endpoints.update((items) => items.filter((item) => item !== endpoint))),
      switchMap(() => from(this.unsubscribeLocally())),
      finalize(() => this.busy.set(false)),
    );
  }

  private register(subscription: PushSubscription): Observable<unknown> {
    return this.http.post('/push/subscriptions', {
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
      userAgent: this.win?.navigator.userAgent.slice(0, 512),
    });
  }
  private remember(subscription: PushSubscription): void {
    this.subscription.set(subscription);
    this.endpoints.update((items) => [
      ...items.filter((item) => item !== subscription.endpoint),
      subscription.endpoint,
    ]);
    this.storeEndpoint(subscription.endpoint);
    this.permission.set(this.readPermission());
  }
  private async unsubscribeLocally(): Promise<void> {
    try {
      if (this.subscription()) await this.swPush.unsubscribe();
      this.subscription.set(null);
      try {
        this.win?.localStorage.removeItem(this.storageKey);
      } catch {
        /* Almacenamiento deshabilitado. */
      }
    } catch {
      // Tras DELETE no hay entregas desde la cuenta, aunque el navegador falle al desuscribir.
      this.error.set(
        'No pudimos quitar la suscripción del navegador. Podés bloquear los avisos desde la configuración del sitio.',
      );
    }
  }
  private readPermission(): NotificationPermission {
    return this.win && 'Notification' in this.win ? this.win.Notification.permission : 'default';
  }
  private storeEndpoint(endpoint: string): void {
    try {
      this.win?.localStorage.setItem(this.storageKey, endpoint);
    } catch {
      /* Se mantiene en memoria. */
    }
  }
  private storedEndpoint(): string | null {
    try {
      return this.win?.localStorage.getItem(this.storageKey) ?? null;
    } catch {
      return null;
    }
  }
}
