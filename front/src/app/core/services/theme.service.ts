import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'tempo-theme';
  private readonly temaActual = signal<Tema>(this.temaInicial());

  readonly tema = this.temaActual.asReadonly();
  readonly esOscuro = () => this.temaActual() === 'oscuro';

  constructor() {
    this.aplicar(this.temaActual());
  }

  alternar(): void {
    const siguiente: Tema = this.esOscuro() ? 'claro' : 'oscuro';
    this.temaActual.set(siguiente);
    localStorage.setItem(this.storageKey, siguiente);
    this.aplicar(siguiente);
  }

  private temaInicial(): Tema {
    const guardado = localStorage.getItem(this.storageKey);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }

  private aplicar(tema: Tema): void {
    const root = this.document.documentElement;
    root.classList.toggle('dark', tema === 'oscuro');
    root.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  }
}
