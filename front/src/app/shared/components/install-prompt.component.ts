import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { PwaPlatformService } from '../../core/services/pwa-platform.service';
import { InstallInstructionsComponent } from './install-instructions.component';

@Component({
  selector: 'app-install-prompt',
  imports: [InstallInstructionsComponent],
  template: `
    <dialog
      #dialog
      aria-labelledby="install-prompt-title"
      (cancel)="dismiss($event)"
      (click)="outsideClick($event)"
    >
      <div class="heading">
        <h2 id="install-prompt-title">Tempo en tu celular</h2>
        <button
          type="button"
          class="close"
          aria-label="Cerrar invitación de instalación"
          (click)="pwa.dismiss()"
        >
          ✕
        </button>
      </div>
      <app-install-instructions />
      <button type="button" class="later" (click)="pwa.dismiss()">Ahora no</button>
      <p class="hint">Podés volver a ver estas instrucciones desde “Instalar app”.</p>
    </dialog>
  `,
  styles: `
    dialog {
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      padding: 1.5rem;
      background: var(--card);
      color: var(--ink);
      width: min(92vw, 440px);
      max-height: 85dvh;
      overflow: auto;
      box-shadow: var(--shadow-soft);
    }
    dialog::backdrop {
      background: rgb(0 0 0/0.45);
    }
    .heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.5rem;
    }
    .close,
    .later {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.55rem 0.8rem;
      cursor: pointer;
    }
    .close {
      min-width: 44px;
      min-height: 44px;
    }
    .later {
      margin-top: 0.5rem;
    }
    .hint {
      margin: 1rem 0 0;
      font-size: 0.8rem;
      color: var(--muted);
    }
  `,
})
export class InstallPromptComponent {
  protected readonly pwa = inject(PwaPlatformService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.pwa.showPopup() && !dialog.open) dialog.showModal();
      else if (!this.pwa.showPopup() && dialog.open) dialog.close();
    });
  }
  protected dismiss(event: Event): void {
    event.preventDefault();
    this.pwa.dismiss();
  }
  protected outsideClick(event: MouseEvent): void {
    const dialog = this.dialog()?.nativeElement;
    if (event.target !== dialog || !dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      this.pwa.dismiss();
  }
}
