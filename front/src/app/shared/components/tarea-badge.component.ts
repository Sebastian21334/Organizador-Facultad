import { Component, Input } from '@angular/core';
import { TipoTarea, EstadoTarea } from '../../core/models';

const tipoColor: Record<TipoTarea, string> = {
  [TipoTarea.TAREA]: 'badge-tarea',
  [TipoTarea.EXAMEN]: 'badge-examen',
  [TipoTarea.ENTREGA]: 'badge-entrega',
  [TipoTarea.TP]: 'badge-tp',
  [TipoTarea.OTRO]: 'badge-otro',
};

const estadoColor: Record<EstadoTarea, string> = {
  [EstadoTarea.PENDIENTE]: 'badge-pendiente',
  [EstadoTarea.EN_PROGRESO]: 'badge-progreso',
  [EstadoTarea.HECHA]: 'badge-hecha',
};

@Component({
  selector: 'app-tarea-badge',
  imports: [],
  template: `
    @if (tipo) {
      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border {{ tipoColor[tipo] }}">
        {{ tipo }}
      </span>
    }
    @if (estado) {
      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {{ estadoColor[estado] }}">
        {{ estado }}
      </span>
    }
  `,
  styles: `
    .badge-tarea { background: #F1DEE1; color: #6E1F2B; border-color: #D8CBAE; }
    .badge-examen { background: #F6E2DA; color: #6E1F2B; border-color: #E8C9B8; }
    .badge-entrega { background: #F2EFE8; color: #7A6B57; border-color: #D8CBAE; }
    .badge-tp { background: #E7EEE1; color: #3F6B4A; border-color: #C3D4B4; }
    .badge-otro { background: #EFEBDF; color: #7A6B57; border-color: #D8CBAE; }
    .badge-pendiente { background: #EFEBDF; color: #7A6B57; }
    .badge-progreso { background: #F1DEE1; color: #6E1F2B; }
    .badge-hecha { background: #E7EEE1; color: #3F6B4A; }
  `,
})
export class TareaBadgeComponent {
  @Input() tipo?: TipoTarea;
  @Input() estado?: EstadoTarea;

  protected readonly tipoColor = tipoColor;
  protected readonly estadoColor = estadoColor;
}
