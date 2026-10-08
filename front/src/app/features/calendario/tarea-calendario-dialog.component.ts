import { AfterViewInit, Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { EstadoTarea, Tarea, TipoTarea } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { LucideDynamicIcon, LucideBell, LucideBookOpen, LucideCalendarDays, LucideCheck, LucideClock, LucidePencil, LucideX } from '@lucide/angular';
import { TareasService } from '../tareas/tareas.service';

@Component({
  selector: 'app-tarea-calendario-dialog',
  imports: [CommonModule, ReactiveFormsModule, LucideDynamicIcon],
  template: `
    <dialog #dialog aria-labelledby="tarea-dialog-title" (cancel)="cerrar($event)" (click)="cerrarDesdeFondo($event)">
      <header>
        <div class="dialog-heading">
          <p class="eyebrow">{{ editando() ? 'Actualizá los datos' : 'Detalle de la tarea' }}</p>
          <h2 id="tarea-dialog-title">{{ editando() ? 'Editar tarea' : tarea().titulo }}</h2>
        </div>
        <button type="button" class="close-button" aria-label="Cerrar detalle" autofocus [disabled]="guardando()" (click)="cerrar()"><svg [lucideIcon]="closeIcon" [size]="20" aria-hidden="true"></svg></button>
      </header>
      <div class="task-badges">
        <span class="type-badge">{{ tipoEtiqueta() }}</span>
        <span class="state-badge" [class.is-done]="tarea().estado === estadoHecha">{{ estadoEtiqueta() }}</span>
      </div>
      @if (!editando()) {
        <dl class="task-details">
          <div class="detail-item wide"><svg [lucideIcon]="bookIcon" [size]="18" aria-hidden="true"></svg><div><dt>Materia</dt><dd>{{ tarea().materia?.nombre ?? 'Sin materia asignada' }}</dd></div></div>
          <div class="detail-item"><svg [lucideIcon]="calendarIcon" [size]="18" aria-hidden="true"></svg><div><dt>Fecha límite</dt><dd>{{ tarea().fechaLimite ? (tarea().fechaLimite | date: 'd MMM y' : 'UTC' : 'es-AR') : 'Sin fecha' }}</dd></div></div>
          <div class="detail-item"><svg [lucideIcon]="clockIcon" [size]="18" aria-hidden="true"></svg><div><dt>Hora límite</dt><dd>{{ tarea().fechaLimite ? (tarea().fechaLimite | date: "HH:mm' hs'" : 'UTC' : 'es-AR') : 'Sin horario' }}</dd></div></div>
          <div class="detail-item wide"><svg [lucideIcon]="bellIcon" [size]="18" aria-hidden="true"></svg><div><dt>Recordatorio</dt><dd>{{ recordatorioEtiqueta() }}</dd></div></div>
        </dl>
        <section class="task-description"><h3>Descripción</h3><p>{{ tarea().descripcion?.trim() || 'Esta tarea no tiene una descripción.' }}</p></section>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <div class="actions detail-actions">
          <button type="button" class="button-secondary edit-button" [disabled]="guardando()" (click)="editar()"><svg [lucideIcon]="editIcon" [size]="17" aria-hidden="true"></svg> Editar tarea</button>
          @if (tarea().estado !== estadoHecha) {
            <button type="button" class="button-primary complete" [disabled]="guardando()" (click)="marcarHecha()"><svg [lucideIcon]="checkIcon" [size]="17" aria-hidden="true"></svg> {{ guardando() ? 'Marcando…' : 'Marcar como hecha' }}</button>
          }
        </div>
      } @else {
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <fieldset [disabled]="guardando()">
          <label class="wide">Título
            <input #tituloInput class="field" formControlName="titulo" maxlength="200" />
            @if (form.controls.titulo.touched && form.controls.titulo.invalid) {
              <small class="error">Ingresá un título de hasta 200 caracteres.</small>
            }
          </label>
          <label class="wide">Descripción
            <textarea class="field" formControlName="descripcion" rows="3" maxlength="4000"></textarea>
          </label>
          <label>Tipo
            <select class="field" formControlName="tipo">
              @for (tipo of tipos; track tipo.valor) { <option [value]="tipo.valor">{{ tipo.etiqueta }}</option> }
            </select>
          </label>
          <label>Estado
            <select class="field" formControlName="estado">
              @for (estado of estados; track estado.valor) { <option [value]="estado.valor">{{ estado.etiqueta }}</option> }
            </select>
          </label>
          <label class="wide">Fecha y hora límite
            <input class="field" type="datetime-local" formControlName="fechaLimite" required />
            <small>La fecha y hora coinciden con las que muestra el calendario.</small>
            @if (form.controls.fechaLimite.touched && form.controls.fechaLimite.invalid) {
              <small class="error">Ingresá una fecha y hora límite.</small>
            }
          </label>
        </fieldset>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <div class="actions">
          <button type="button" class="button-secondary back-button" [disabled]="guardando()" (click)="volverAlDetalle()">Volver al detalle</button>
          <button type="submit" class="button-primary" [disabled]="guardando()">{{ guardando() ? 'Guardando...' : 'Guardar cambios' }}</button>
        </div>
      </form>
      }
    </dialog>
  `,
  styles: `
    dialog { width: min(36rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow-y: auto; margin: auto; padding: 1.5rem; border: 1px solid var(--border); border-radius: 1.25rem; background: var(--card); color: var(--ink); box-shadow: 0 24px 80px rgb(0 0 0 / .2); }
    dialog::backdrop { background: rgb(0 0 0 / .5); backdrop-filter: blur(3px); }
    header { display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: 1rem; }
    .dialog-heading { min-width: 0; }
    h2 { margin: 0; font-size: 1.6rem; line-height: 1.25; overflow-wrap: anywhere; }
    .eyebrow { margin: 0 0 .5rem; color: var(--accent); font-size: .65rem; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }
    .close-button { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: .75rem; color: var(--muted); cursor: pointer; }
    .task-badges { display: flex; flex-wrap: wrap; gap: .5rem; }
    .task-badges span { padding: .3rem .65rem; border-radius: 2rem; font-size: .72rem; }
    .type-badge { background: var(--accent-light); color: var(--accent); }
    .state-badge { background: var(--bg-subtle); color: var(--ink-secondary); }
    .state-badge.is-done { background: var(--success-bg); color: var(--success-text); }
    .task-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem; margin: 1.25rem 0; padding: 1.1rem; border: 1px solid var(--border); border-radius: .85rem; background: var(--card-strong); }
    .detail-item { display: flex; align-items: start; gap: .7rem; min-width: 0; }
    .detail-item > svg { flex-shrink: 0; margin-top: .15rem; color: var(--accent); }
    .detail-item > div { min-width: 0; }
    dt, .task-description h3 { margin: 0 0 .3rem; color: var(--muted); font: 500 .72rem var(--font-body); }
    dd { margin: 0; font-size: .85rem; line-height: 1.5; overflow-wrap: anywhere; }
    .task-description p { margin: .5rem 0 1.5rem; color: var(--ink-secondary); font-size: .85rem; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
    fieldset { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; border: 0; padding: 0; margin: 1rem 0; min-width: 0; }
    label { display: flex; flex-direction: column; gap: .4rem; font-size: .8rem; color: var(--ink-secondary); min-width: 0; }
    .wide { grid-column: 1 / -1; }
    textarea { resize: vertical; }
    small { font-size: .72rem; color: var(--muted); }
    .error { color: var(--error-text); font-size: .8rem; }
    .actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: .6rem; }
    .actions button { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; padding: .75rem 1rem; }
    .detail-actions { border-top: 1px solid var(--border); padding-top: 1rem; }
    .detail-actions button { flex: 1; }
    .button-primary { background: var(--accent); color: white; border: 1px solid var(--accent); }
    .button-secondary { background: transparent; color: var(--ink-secondary); border: 1px solid var(--border); }
    button:disabled { opacity: .65; cursor: wait; }
    @media (max-width: 480px) { fieldset { grid-template-columns: 1fr; } .actions { flex-direction: column; } .actions button { width: 100%; } }
  `,
})
export class TareaCalendarioDialogComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly tareasService = inject(TareasService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly tituloInput = viewChild<ElementRef<HTMLInputElement>>('tituloInput');

  readonly tarea = input.required<Tarea>();
  readonly actualizada = output<Tarea>();
  readonly cancelada = output<void>();
  protected readonly guardando = signal(false);
  protected readonly editando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly closeIcon = LucideX;
  protected readonly editIcon = LucidePencil;
  protected readonly checkIcon = LucideCheck;
  protected readonly calendarIcon = LucideCalendarDays;
  protected readonly clockIcon = LucideClock;
  protected readonly bookIcon = LucideBookOpen;
  protected readonly bellIcon = LucideBell;
  protected readonly estadoHecha = EstadoTarea.HECHA;
  protected readonly tipos = [
    { valor: TipoTarea.TAREA, etiqueta: 'Tarea' },
    { valor: TipoTarea.ENTREGA, etiqueta: 'Entrega' },
    { valor: TipoTarea.EXAMEN, etiqueta: 'Examen' },
    { valor: TipoTarea.TP, etiqueta: 'Trabajo práctico' },
    { valor: TipoTarea.OTRO, etiqueta: 'Otro' },
  ];
  protected readonly estados = [
    { valor: EstadoTarea.PENDIENTE, etiqueta: 'Pendiente' },
    { valor: EstadoTarea.EN_PROGRESO, etiqueta: 'En progreso' },
    { valor: EstadoTarea.HECHA, etiqueta: 'Hecha' },
  ];
  protected readonly tipoEtiqueta = computed(() => this.tipos.find((tipo) => tipo.valor === this.tarea().tipo)?.etiqueta);
  protected readonly estadoEtiqueta = computed(() => this.estados.find((estado) => estado.valor === this.tarea().estado)?.etiqueta);
  protected readonly recordatorioEtiqueta = computed(() => {
    const minutos = this.tarea().recordatorioMinutos;
    if (minutos === null) return 'Según la configuración de tu perfil';
    if (minutos % 1440 === 0) return `${minutos / 1440} ${minutos === 1440 ? 'día' : 'días'} antes`;
    if (minutos % 60 === 0) return `${minutos / 60} ${minutos === 60 ? 'hora' : 'horas'} antes`;
    return `${minutos} minutos antes`;
  });
  protected readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: ['', Validators.maxLength(4000)],
    tipo: [TipoTarea.TAREA],
    estado: [EstadoTarea.PENDIENTE],
    fechaLimite: ['', Validators.required],
  });

  ngOnInit(): void {
    this.restaurarFormulario();
  }

  private restaurarFormulario(): void {
    const tarea = this.tarea();
    this.form.setValue({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion ?? '',
      tipo: tarea.tipo,
      estado: tarea.estado,
      fechaLimite: tarea.fechaLimite ? new Date(tarea.fechaLimite).toISOString().slice(0, 16) : '',
    });
  }

  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
  }

  protected editar(): void {
    if (this.guardando()) return;
    this.restaurarFormulario();
    this.error.set(null);
    this.editando.set(true);
    afterNextRender(() => this.tituloInput()?.nativeElement.focus(), { injector: this.injector });
  }

  protected volverAlDetalle(): void {
    if (this.guardando()) return;
    this.editando.set(false);
    this.error.set(null);
    afterNextRender(() => this.dialog().nativeElement.querySelector<HTMLButtonElement>('.edit-button')?.focus(), { injector: this.injector });
  }

  protected cerrar(event?: Event): void {
    event?.preventDefault();
    if (this.guardando()) return;
    this.dialog().nativeElement.close();
    this.cancelada.emit();
  }

  protected cerrarDesdeFondo(event: MouseEvent): void {
    if (event.target !== this.dialog().nativeElement) return;
    const rect = this.dialog().nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.cerrar();
  }

  protected guardar(): void {
    if (this.guardando()) return;
    this.form.controls.titulo.setValue(this.form.controls.titulo.value.trim());
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    // Preserve the exact timestamp when only other fields change, including seconds.
    const fechaOriginal = this.tarea().fechaLimite;
    const fechaSinCambios = fechaOriginal && new Date(fechaOriginal).toISOString().slice(0, 16) === value.fechaLimite;
    this.actualizar({
      titulo: value.titulo,
      descripcion: value.descripcion.trim(),
      tipo: value.tipo,
      estado: value.estado,
      ...(fechaSinCambios ? {} : { fechaLimite: new Date(`${value.fechaLimite}Z`).toISOString() }),
    });
  }

  protected marcarHecha(): void {
    if (this.guardando() || this.tarea().estado === EstadoTarea.HECHA) return;
    this.actualizar({ estado: EstadoTarea.HECHA });
  }

  private actualizar(cambios: Parameters<TareasService['actualizar']>[1]): void {
    this.guardando.set(true);
    this.error.set(null);
    this.tareasService.actualizar(this.tarea().id, cambios)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (tarea) => {
          this.toast.success(this.editando() ? 'Cambios de la tarea guardados.' : 'Tarea marcada como hecha.');
          this.dialog().nativeElement.close();
          this.actualizada.emit(tarea);
        },
        error: () => this.error.set(this.editando() ? 'No se pudo guardar la tarea. Conservamos tus cambios para que reintentes.' : 'No se pudo marcar la tarea como hecha. Intentá de nuevo.'),
      });
  }
}
