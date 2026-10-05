import { Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <dialog #modal aria-labelledby="confirm-title" aria-describedby="confirm-description"
      (cancel)="$event.preventDefault(); dialog.cancelar()">
      @if (dialog.estado(); as estado) {
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
    dialog { width: min(390px, calc(100vw - 2rem)); margin: auto; padding: 24px; border: 1px solid var(--border); border-radius: 18px; background: var(--card); color: var(--ink); box-shadow: var(--shadow-hover); }
    dialog::backdrop { background: rgba(0,0,0,.5); backdrop-filter: blur(3px); }
    h2 { font-size: 1.3rem; }
    p { margin: 12px 0 0; color: var(--ink-secondary); font-size: .85rem; line-height: 1.7; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
    button { min-height: 42px; padding: 10px 16px; border: 1px solid var(--border); border-radius: 10px; font-size: .8rem; font-weight: 600; cursor: pointer; }
    .cancel { background: var(--bg); color: var(--ink-secondary); }
    .confirm { background: var(--accent); color: white; border-color: var(--accent); }
    .danger { background: var(--error-bg); color: var(--error-text); border-color: var(--error-border); }
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
