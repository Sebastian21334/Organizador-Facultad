import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  imports: [],
  template: `
    <div class="flex items-center justify-center py-8">
      <div class="w-7 h-7 rounded-full border-2 border-[#F3DFE2] border-t-[#6E1F2B] animate-spin"></div>
      @if (mensaje) {
        <span class="ml-3 text-sm font-medium text-[#7A6F66]">{{ mensaje }}</span>
      }
    </div>
  `,
})
export class LoaderComponent {
  @Input() mensaje?: string;
}
