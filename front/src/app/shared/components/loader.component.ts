import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  imports: [],
  template: `
    <div class="flex items-center justify-center py-8" role="status" aria-live="polite">
      <div class="loading-spinner w-7 h-7 rounded-full border-2 animate-spin" aria-hidden="true"></div>
      @if (mensaje) {
        <span class="ml-3 text-sm font-medium text-[#7A6F66]">{{ mensaje }}</span>
      } @else {
        <span class="sr-only">Cargando…</span>
      }
    </div>
  `,
  styles: `
    .loading-spinner { border-color: var(--accent-soft); border-top-color: var(--accent); }
  `,
})
export class LoaderComponent {
  @Input() mensaje?: string;
}
