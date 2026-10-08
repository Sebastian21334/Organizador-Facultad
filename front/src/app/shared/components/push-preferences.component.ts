import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PushNotificationsService } from '../../core/services/push-notifications.service';

@Component({
  selector: 'app-push-preferences',
  imports: [RouterLink],
  template: `
    <section class="push-card" aria-labelledby="push-heading">
      <p class="section-label">En este dispositivo</p>
      <h2 id="push-heading">Notificaciones</h2>
      <p>
        Recibí el mismo resumen de tus recordatorios por email, también en tu celular o computadora.
        Activá los avisos por email y elegí la anticipación más arriba.
      </p>
      <p role="status">
        @switch (push.state()) {
          @case ('enabled') {
            <strong>Activadas</strong>
          }
          @case ('blocked') {
            <strong>Bloqueadas por el navegador.</strong> Permití las notificaciones de Tempo desde
            la configuración de este sitio y volvé a intentarlo.
          }
          @case ('install-required') {
            En iPhone y iPad, primero instalá Tempo desde Safari y abrila desde la pantalla de
            inicio. Las notificaciones requieren iOS/iPadOS 16.4 o posterior.
          }
          @case ('unsupported') {
            Este navegador no permite notificaciones. Probá Chrome, Edge, Firefox o Safari
            actualizado.
          }
          @default {
            <strong>Desactivadas</strong>
          }
        }
      </p>
      @if (push.loading()) {
        <p role="status">Comprobando notificaciones…</p>
      }
      @if (push.state() === 'install-required') {
        <a routerLink="/instalar" class="button-primary">Instalar app</a>
      }
      @if (push.state() === 'disabled') {
        <button
          type="button"
          class="button-primary"
          [disabled]="!push.canActivate()"
          (click)="push.activate()"
        >
          {{ push.busy() ? 'Activando…' : 'Activar notificaciones' }}
        </button>
      }
      @if (push.hasSubscription()) {
        <button
          type="button"
          class="button-secondary"
          [disabled]="push.busy()"
          (click)="push.disable()"
        >
          {{ push.busy() ? 'Procesando…' : 'Desactivar notificaciones' }}
        </button>
      }
      @if (push.error()) {
        <p class="error" role="alert">{{ push.error() }}</p>
        <button
          type="button"
          class="button-secondary"
          [disabled]="push.loading() || push.busy()"
          (click)="push.refresh()"
        >
          Volver a comprobar
        </button>
      }
      <p class="note">
        Se enviarán junto con el correo cuando se procesen tus recordatorios. Podés desactivarlas
        por separado en cada dispositivo.
      </p>
    </section>
  `,
  styles: `
    .push-card {
      background: var(--card);
      color: var(--ink);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
    }
    h2 {
      font-family: var(--font-display);
      font-size: 1.5rem;
      margin: 0.15rem 0;
    }
    p {
      margin: 0.75rem 0;
      line-height: 1.6;
      color: var(--ink-secondary);
    }
    button,
    a {
      margin: 0.25rem 0.5rem 0.25rem 0;
    }
    .note {
      font-size: 0.8rem;
      color: var(--muted);
    }
    .error {
      color: var(--error-text);
    }
  `,
})
export class PushPreferencesComponent {
  protected readonly push = inject(PushNotificationsService);
}
