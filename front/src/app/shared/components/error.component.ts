import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-error',
  imports: [],
  template: `
    <div class="bg-[#FDF0F0] border border-[#F8C8C8] text-[#A62828] rounded-2xl p-4 text-sm flex items-start gap-3 shadow-xs" role="alert">
      <svg class="w-5 h-5 shrink-0 mt-0.5 text-[#A62828]" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <div>
        <p class="font-semibold text-[#8B1E1E]">Ocurrió un inconveniente</p>
        @if (mensaje) {
          <p class="mt-0.5 text-[#A62828] leading-relaxed">{{ mensaje }}</p>
        }
      </div>
    </div>
  `,
})
export class ErrorComponent {
  @Input() mensaje?: string | null;
}
