import { AfterViewInit, Component, ElementRef, OnInit, inject, input, output, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { EstadoTarea, Tarea, TipoTarea } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { TareaBadgeComponent } from '../../shared/components/tarea-badge.component';
import { TareasService } from '../tareas/tareas.service';

@Component({
  selector: 'app-tarea-calendario-dialog',
  imports: [ReactiveFormsModule, TareaBadgeComponent],
  template: `
    <dialog #dialog aria-labelledby="editar-tarea-title" (cancel)="cerrar($event)" (click)="cerrarDesdeFondo($event)">
      <header>
        <div><h2 id="editar-tarea-title">Editar tarea</h2><p>{{ tarea().materia?.nombre ?? 'Sin materia' }}</p></div>
        <button type="button" class="close-button" aria-label="Cerrar detalle" [disabled]="guardando()" (click)="cerrar()">×</button>
      </header>
      <app-tarea-badge [tipo]="tarea().tipo" [estado]="tarea().estado" />
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <fieldset [disabled]="guardando()">
          <label class="wide">Título
            <input class="field" formControlName="titulo" maxlength="200" autofocus />
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
            <small>Se usa la misma fecha y hora que muestra el calendario (UTC).</small>
            @if (form.controls.fechaLimite.touched && form.controls.fechaLimite.invalid) {
              <small class="error">Ingresá una fecha y hora límite.</small>
            }
          </label>
        </fieldset>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <div class="actions">
          @if (tarea().estado !== estadoHecha) {
            <button type="button" class="button-secondary complete" [disabled]="guardando()" (click)="marcarHecha()">✓ Marcar como hecha</button>
          }
          <button type="button" class="button-secondary" [disabled]="guardando()" (click)="cerrar()">Cancelar</button>
          <button type="submit" class="button-primary" [disabled]="guardando()">{{ guardando() ? 'Guardando...' : 'Guardar cambios' }}</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    dialog { width: min(36rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); margin: auto; padding: 1.25rem; border: 1px solid var(--border); border-radius: .9rem; background: var(--card); color: var(--ink); box-shadow: var(--shadow-soft); }
    dialog::backdrop { background: rgb(0 0 0 / .45); }
    header { display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: .75rem; }
    h2 { margin: 0; font-size: 1.35rem; }
    header p { margin: .3rem 0 0; color: var(--muted); font-size: .85rem; }
    .close-button { background: transparent; border: 0; color: var(--muted); font-size: 1.5rem; padding: 0 .5rem; }
    fieldset { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; border: 0; padding: 0; margin: 1rem 0; min-width: 0; }
    label { display: flex; flex-direction: column; gap: .4rem; font-size: .8rem; color: var(--ink-secondary); min-width: 0; }
    .wide { grid-column: 1 / -1; }
    textarea { resize: vertical; }
    small { font-size: .72rem; color: var(--muted); }
    .error { color: var(--error-text); font-size: .8rem; }
    .actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: .6rem; }
    .actions button { padding: .6rem .8rem; }
    .button-primary { background: var(--accent); color: white; border: 1px solid var(--accent); }
    .button-secondary { background: transparent; color: var(--ink-secondary); border: 1px solid var(--border); }
    .complete { margin-right: auto; }
    button:disabled { opacity: .65; cursor: wait; }
    @media (max-width: 480px) { fieldset { grid-template-columns: 1fr; } .actions { flex-direction: column; } .actions button { width: 100%; } }
  `,
})
export class TareaCalendarioDialogComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly tareasService = inject(TareasService);
  private readonly toast = inject(ToastService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly tarea = input.required<Tarea>();
  readonly actualizada = output<Tarea>();
  readonly cancelada = output<void>();
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
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
  protected readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: ['', Validators.maxLength(4000)],
    tipo: [TipoTarea.TAREA],
    estado: [EstadoTarea.PENDIENTE],
    fechaLimite: ['', Validators.required],
  });

  ngOnInit(): void {
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
          this.toast.success('Cambios de la tarea guardados.');
          this.dialog().nativeElement.close();
          this.actualizada.emit(tarea);
        },
        error: () => this.error.set('No se pudo guardar la tarea. Conservamos tus cambios para que reintentes.'),
      });
  }
}
