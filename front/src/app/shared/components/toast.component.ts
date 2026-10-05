import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  template: `
    <div class="toast-stack" aria-label="Notificaciones">
      @for (toast of toasts.messages(); track toast.id) {
        <div class="notification" [class.notification--error]="toast.kind === 'error'"
          (mouseenter)="toasts.pause(toast.id)" (mouseleave)="toasts.resume(toast.id)"
          (focusin)="toasts.pause(toast.id)" (focusout)="toasts.resume(toast.id)">
          <span class="notification-icon" aria-hidden="true">{{ toast.kind === 'success' ? '✓' : toast.kind === 'error' ? '!' : 'i' }}</span>
          <p [attr.role]="toast.kind === 'error' ? 'alert' : 'status'">{{ toast.message }}</p>
          <button type="button" (click)="toasts.dismiss(toast.id)" aria-label="Cerrar notificación">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack { position: fixed; bottom: max(1.25rem, env(safe-area-inset-bottom)); right: 1.25rem; z-index: 100; display: grid; gap: .6rem; width: min(390px, calc(100vw - 2rem)); pointer-events: none; }
    .notification { display: flex; align-items: center; gap: .75rem; padding: .95rem; background: var(--card); color: var(--ink); border: 1px solid var(--border); border-left: 4px solid var(--success-text); border-radius: .85rem; box-shadow: var(--shadow-hover); pointer-events: auto; animation: messageIn 180ms var(--ease-out); }
    .notification--error { border-left-color: var(--error-text); }
    .notification-icon { flex-shrink: 0; display: grid; place-items: center; width: 1.65rem; height: 1.65rem; border-radius: 50%; background: var(--success-bg); color: var(--success-text); font-weight: 700; }
    .notification--error .notification-icon { background: var(--error-bg); color: var(--error-text); }
    p { margin: 0; flex: 1; font-size: .8rem; line-height: 1.5; overflow-wrap: anywhere; }
    button { flex-shrink: 0; width: 2rem; height: 2rem; border: 0; border-radius: .5rem; background: transparent; color: var(--muted); font-size: 1.3rem; cursor: pointer; }
    button:hover { background: var(--bg); }
    @media (max-width: 640px) { .toast-stack { right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom)); } }
  `,
})
export class ToastComponent {
  protected readonly toasts = inject(ToastService);
}
