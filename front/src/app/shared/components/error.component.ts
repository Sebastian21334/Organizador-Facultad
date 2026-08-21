import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-error',
  imports: [],
  template: `
    <div class="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
      <p class="font-medium">Ocurrió un error</p>
      @if (mensaje) {
        <p class="mt-1 text-red-600">{{ mensaje }}</p>
      }
    </div>
  `,
})
export class ErrorComponent {
  @Input() mensaje?: string | null;
}
