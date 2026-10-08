import { Component } from '@angular/core';
import { InstallInstructionsComponent } from '../../shared/components/install-instructions.component';

@Component({
  selector: 'app-instalar',
  imports: [InstallInstructionsComponent],
  template: `<section class="install-card">
    <p class="section-label">Siempre a mano</p>
    <h1>Instalar app</h1>
    <app-install-instructions />
  </section>`,
  styles: `
    .install-card {
      max-width: 560px;
      margin: 2rem auto;
      padding: 1.5rem;
      border: 1px solid var(--border);
      border-radius: 1rem;
      background: var(--card);
    }
    h1 {
      font-family: var(--font-display);
      font-size: 2rem;
      margin: 0.5rem 0;
    }
  `,
})
export class InstalarComponent {}
