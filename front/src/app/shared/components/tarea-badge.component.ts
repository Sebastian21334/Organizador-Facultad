import { Component, Input } from '@angular/core';
import { TipoTarea, EstadoTarea } from '../../core/models';

const tipoColor: Record<TipoTarea, string> = {
  [TipoTarea.TAREA]: 'bg-blue-100 text-blue-700 border-blue-200',
  [TipoTarea.EXAMEN]: 'bg-red-100 text-red-700 border-red-200',
  [TipoTarea.ENTREGA]: 'bg-amber-100 text-amber-700 border-amber-200',
  [TipoTarea.TP]: 'bg-purple-100 text-purple-700 border-purple-200',
  [TipoTarea.OTRO]: 'bg-slate-100 text-slate-700 border-slate-200',
};

const estadoColor: Record<EstadoTarea, string> = {
  [EstadoTarea.PENDIENTE]: 'bg-slate-100 text-slate-600',
  [EstadoTarea.EN_PROGRESO]: 'bg-yellow-100 text-yellow-700',
  [EstadoTarea.HECHA]: 'bg-green-100 text-green-700',
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
})
export class TareaBadgeComponent {
  @Input() tipo?: TipoTarea;
  @Input() estado?: EstadoTarea;

  protected readonly tipoColor = tipoColor;
  protected readonly estadoColor = estadoColor;
}
