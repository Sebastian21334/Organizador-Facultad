import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideDynamicIcon, LucideBookOpen, LucideCalendarDays, LucideCheck, LucideChevronRight, LucideClipboardList, LucideFileText } from '@lucide/angular';
import { EstadoTarea, Tarea, TipoTarea } from '../../core/models';

@Component({
  selector: 'app-agenda-dia',
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <section class="day-agenda" aria-label="Tareas del día seleccionado">
      <header class="day-heading" aria-live="polite" aria-atomic="true">
        <h3>{{ fecha() | date: "EEEE d 'de' MMMM" : undefined : 'es-AR' }}</h3>
        <span>{{ tareas().length }} {{ tareas().length === 1 ? 'tarea' : 'tareas' }}</span>
      </header>
      <div class="day-tasks">
        @for (tarea of tareas(); track tarea.id) {
          <button type="button" class="day-task" [class.is-done]="tarea.estado === estadoHecha" (click)="seleccionar.emit(tarea)" [attr.aria-label]="'Ver detalle de ' + tarea.titulo">
            <span class="task-icon" [class.exam-icon]="tarea.tipo === tipoExamen">
              <svg [lucideIcon]="iconos[tarea.tipo]" [size]="18" aria-hidden="true"></svg>
            </span>
            <span class="task-copy">
              <strong>{{ tarea.titulo }}</strong>
              <small>{{ etiquetas[tarea.tipo] }}@if (tarea.materia) { · {{ tarea.materia!.nombre }} }</small>
            </span>
            @if (tarea.estado === estadoHecha) {
              <span class="task-status done"><svg [lucideIcon]="checkIcon" [size]="13" aria-hidden="true"></svg> Hecha</span>
            } @else if (esHoy()) {
              <span class="task-status today">Hoy</span>
            } @else {
              <svg class="task-arrow" [lucideIcon]="arrowIcon" [size]="17" aria-hidden="true"></svg>
            }
          </button>
        } @empty {
          <div class="day-empty">
            <svg [lucideIcon]="calendarIcon" [size]="24" aria-hidden="true"></svg>
            <p>No hay tareas para este día.</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .day-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    h3 { margin: 0; font: 600 .95rem var(--font-body); color: var(--ink); }
    h3::first-letter { text-transform: uppercase; }
    .day-heading > span { flex-shrink: 0; color: var(--muted); font-size: .7rem; }
    .day-tasks { padding: 0 1rem; border: 1px solid var(--border); border-radius: .85rem; background: var(--card); }
    .day-task { display: flex; align-items: center; gap: .75rem; width: 100%; padding: 1rem 0; border: 0; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
    .day-task + .day-task { border-top: 1px solid var(--border); }
    .day-task:hover .task-copy strong { color: var(--accent); }
    .task-icon { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; flex: 0 0 auto; border-radius: .6rem; background: var(--bg-subtle); color: var(--ink-secondary); }
    .exam-icon { background: var(--accent-light); color: var(--accent); }
    .task-copy { display: grid; gap: .25rem; flex: 1; min-width: 0; }
    .task-copy strong { font-size: .85rem; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
    .task-copy small { color: var(--muted); font-size: .68rem; line-height: 1.5; overflow-wrap: anywhere; }
    .task-status { display: inline-flex; align-items: center; gap: .2rem; flex: 0 0 auto; padding: .2rem .45rem; border-radius: 2rem; font-size: .65rem; }
    .today { background: var(--accent-soft); color: var(--accent); }
    .done { background: var(--success-bg); color: var(--success-text); }
    .is-done .task-copy strong { color: var(--muted); text-decoration: line-through; }
    .task-arrow { flex-shrink: 0; color: var(--label); }
    .day-empty { display: grid; justify-items: center; gap: .6rem; padding: 1.5rem .5rem; color: var(--muted); text-align: center; }
    .day-empty p { margin: 0; font-size: .8rem; }
    @media (max-width: 380px) { .day-tasks { padding: 0 .75rem; } .day-task { gap: .55rem; } }
  `,
})
export class AgendaDiaComponent {
  readonly fecha = input.required<Date>();
  readonly tareas = input.required<Tarea[]>();
  readonly esHoy = input(false);
  readonly seleccionar = output<Tarea>();
  protected readonly estadoHecha = EstadoTarea.HECHA;
  protected readonly tipoExamen = TipoTarea.EXAMEN;
  protected readonly checkIcon = LucideCheck;
  protected readonly arrowIcon = LucideChevronRight;
  protected readonly calendarIcon = LucideCalendarDays;
  protected readonly iconos = {
    [TipoTarea.EXAMEN]: LucideBookOpen,
    [TipoTarea.ENTREGA]: LucideClipboardList,
    [TipoTarea.TP]: LucideClipboardList,
    [TipoTarea.TAREA]: LucideFileText,
    [TipoTarea.OTRO]: LucideFileText,
  };
  protected readonly etiquetas = {
    [TipoTarea.EXAMEN]: 'Evaluación',
    [TipoTarea.ENTREGA]: 'Entrega',
    [TipoTarea.TP]: 'Trabajo práctico',
    [TipoTarea.TAREA]: 'Tarea',
    [TipoTarea.OTRO]: 'Otro',
  };
}
