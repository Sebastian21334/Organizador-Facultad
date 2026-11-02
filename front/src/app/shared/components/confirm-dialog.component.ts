import { Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <dialog #modal aria-labelledby="confirm-title" aria-describedby="confirm-description"
      (cancel)="$event.preventDefault(); dialog.cancelar()">
      @if (dialog.estado(); as estado) {
        <span class="dialog-icon" [class.dialog-icon--danger]="estado.peligroso" aria-hidden="true">{{ estado.peligroso ? '!' : '✦' }}</span>
        <h2 id="confirm-title">{{ estado.titulo }}</h2>
        <p id="confirm-description">{{ estado.mensaje }}</p>
        <div class="actions">
          <button type="button" class="cancel" autofocus (click)="dialog.cancelar()">{{ estado.textoCancelar ?? 'Cancelar' }}</button>
          <button type="button" class="confirm" [class.danger]="estado.peligroso" (click)="dialog.confirmar()">{{ estado.textoConfirmar ?? 'Confirmar' }}</button>
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog { width: min(420px, calc(100vw - 2rem)); margin: auto; padding: 28px; border: 1px solid var(--border); border-radius: 20px; background: var(--card-strong); color: var(--ink); box-shadow: var(--shadow-hover); }
    dialog::backdrop { background: rgba(0,0,0,.5); backdrop-filter: blur(3px); }
    .dialog-icon { display: grid; place-items: center; width: 42px; height: 42px; margin-bottom: 16px; border-radius: 14px; background: var(--accent-soft); color: var(--accent); font-size: 1.2rem; font-weight: 800; }
    .dialog-icon--danger { background: var(--error-bg); color: var(--error-text); }
    h2 { font-size: 1.4rem; }
    p { margin: 12px 0 0; color: var(--ink-secondary); font-size: .85rem; line-height: 1.7; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
    button { min-height: 42px; padding: 10px 16px; border: 1px solid var(--border); border-radius: 10px; font-size: .8rem; font-weight: 600; cursor: pointer; }
    .cancel { background: var(--bg); color: var(--ink-secondary); }
    .confirm { background: var(--action-bg); color: var(--on-accent); border-color: var(--action-bg); }
    .danger { background: var(--error-bg); color: var(--error-text); border-color: var(--error-border); }
    @media (max-width: 420px) { .actions { flex-direction: column-reverse; } .actions button { width: 100%; } }
  `,
})
export class ConfirmDialogComponent {
  protected readonly dialog = inject(ConfirmDialogService);
  private readonly modal = viewChild.required<ElementRef<HTMLDialogElement>>('modal');

  constructor() {
    afterRenderEffect(() => {
      const modal = this.modal().nativeElement;
      if (this.dialog.estado()) {
        if (!modal.open) modal.showModal();
      } else if (modal.open) modal.close();
    });
  }
}
