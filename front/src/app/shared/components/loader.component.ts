import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  imports: [],
  template: `
    <div class="flex items-center justify-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-700"></div>
      @if (mensaje) {
        <span class="ml-3 text-sm text-slate-500">{{ mensaje }}</span>
      }
    </div>
  `,
})
export class LoaderComponent {
  @Input() mensaje?: string;
}
