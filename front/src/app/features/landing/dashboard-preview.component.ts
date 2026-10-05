import { Component } from '@angular/core';
import { LucideDynamicIcon, LucideCompass, LucideCalendar, LucideCheckSquare, LucideBookOpen, LucideMessageCircle, LucideUserCircle, LucideMoon, LucideMail, LucideLogOut } from '@lucide/angular';
import { InicioComponent } from '../inicio/inicio.component';

@Component({
  selector: 'app-dashboard-preview',
  imports: [InicioComponent, LucideDynamicIcon],
  template: `
    <div class="preview-window" role="img" aria-label="Vista del panel real de Tempo con datos de ejemplo: Hola, Seba, calendario semanal, progreso académico y tareas">
      <div class="preview-scaled" inert aria-hidden="true">
        <aside class="preview-sidebar">
          <div class="preview-brand"><span>T</span><strong>Tempo</strong><small>Organizá tu vida universitaria.</small></div>
          @for (icon of icons; track $index) {
            <div class="preview-nav" [class.active]="$index === 0"><svg [lucideIcon]="icon" [size]="18"></svg></div>
          }
        </aside>
        <app-inicio [vistaPrevia]="true" />
      </div>
    </div>
    <p class="preview-caption">Así se ve Tempo · Datos de ejemplo</p>
  `,
  styles: `
    :host { display: block; width: 100%; }
    .preview-window { container-type: inline-size; width: 100%; aspect-ratio: 1100 / 730; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; box-shadow: 0 28px 70px rgba(43,35,31,.2); background: var(--bg); }
    .preview-scaled { display: grid; grid-template-columns: 154px 946px; width: 1100px; height: 730px; transform: scale(calc(100cqw / 1100px)); transform-origin: top left; }
    app-inicio { min-width: 0; }
    .preview-sidebar { display: flex; flex-direction: column; align-items: center; gap: .7rem; padding: 1rem .7rem; background: linear-gradient(180deg, #fffdf9, #faf6ee); border-right: 1px solid var(--border); }
    .preview-brand { display: flex; flex-direction: column; align-items: center; gap: .35rem; width: 100%; padding-bottom: .9rem; margin-bottom: .55rem; border-bottom: 1px solid var(--border); }
    .preview-brand span { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border-radius: .8rem; background: linear-gradient(135deg,#6e1f2b,#4f1620); color: #faf6ee; font: 700 1.4rem var(--font-display); }
    .preview-brand strong { font: 700 1.05rem var(--font-display); color: var(--ink); letter-spacing: .04em; }
    .preview-brand small { color: var(--muted); font-size: .58rem; }
    .preview-nav { display: grid; place-items: center; width: 2.9rem; height: 2.9rem; border-radius: .9rem; color: #7a6b57; }
    .preview-nav.active { background: #6e1f2b; color: #faf6ee; }
    .preview-caption { margin: 14px 0 0; text-align: center; color: var(--muted); font-size: 11px; }
    :host-context(.dark) .preview-sidebar { background: linear-gradient(180deg,#121821,#0c1118); }
    :host-context(.dark) .preview-brand span, :host-context(.dark) .preview-nav.active { background: linear-gradient(145deg,#8794ff,#5364d9); }
    :host-context(.dark) .preview-nav { color: #9aa5b6; }
    :host-context(.dark) .preview-nav.active { color: white; }
  `,
})
export class DashboardPreviewComponent {
  protected readonly icons = [LucideCompass, LucideCalendar, LucideCheckSquare, LucideBookOpen, LucideMessageCircle, LucideUserCircle, LucideMail, LucideMoon, LucideLogOut];
}
