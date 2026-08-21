import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligroso?: boolean; // true = botón de confirmar en rojo (para eliminar, etc.)
}

interface ConfirmState extends ConfirmOptions {
  resolver: (valor: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _estado = signal<ConfirmState | null>(null);
  readonly estado = this._estado.asReadonly();

  /**
   * Reemplazo de window.confirm(). Se usa con await:
   *   const ok = await this.confirmDialog.confirm({ titulo: '...', mensaje: '...' });
   *   if (!ok) return;
   */
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this._estado.set({ ...options, resolver: resolve });
    });
  }

  protected resolver(valor: boolean): void {
    this._estado()?.resolver(valor);
    this._estado.set(null);
  }

  confirmar(): void {
    this.resolver(true);
  }

  cancelar(): void {
    this.resolver(false);
  }
}
