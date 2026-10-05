import { Injectable, OnDestroy, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService implements OnDestroy {
  readonly messages = signal<Toast[]>([]);
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error'); }
  info(message: string): void { this.show(message, 'info'); }

  dismiss(id: number): void {
    this.pause(id);
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }

  pause(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }

  resume(id: number): void {
    this.pause(id);
    const toast = this.messages().find((item) => item.id === id);
    if (toast) this.timers.set(id, setTimeout(() => this.dismiss(id), toast.kind === 'error' ? 9000 : 5000));
  }

  ngOnDestroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
  }

  private show(message: string, kind: Toast['kind']): void {
    if (this.messages().some((item) => item.message === message)) return;
    if (this.messages().length >= 3) this.dismiss(this.messages()[0].id);
    const id = ++this.nextId;
    this.messages.update((items) => [...items, { id, message, kind }]);
    this.resume(id);
  }
}
