import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [CommonModule],
  template: `
    @if (dialog.estado(); as estado) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        (click)="dialog.cancelar()"
      >
        <div
          class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
          (click)="$event.stopPropagation()"
        >
          <h2 class="text-base font-semibold text-slate-800">{{ estado.titulo }}</h2>
          <p class="mt-2 text-sm text-slate-600">{{ estado.mensaje }}</p>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="dialog.cancelar()"
              class="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              {{ estado.textoCancelar ?? 'Cancelar' }}
            </button>
            <button
              type="button"
              (click)="dialog.confirmar()"
              class="rounded-full px-4 py-2 text-sm font-medium text-white transition"
              [class.bg-red-600]="estado.peligroso"
              [class.hover:bg-red-700]="estado.peligroso"
              [class.bg-slate-800]="!estado.peligroso"
              [class.hover:bg-slate-700]="!estado.peligroso"
            >
              {{ estado.textoConfirmar ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly dialog = inject(ConfirmDialogService);
}
