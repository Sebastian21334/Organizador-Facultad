import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EstadoMateria,
  EstadoTarea,
  Materia,
  OrigenTarea,
  Tarea,
  TipoTarea,
} from '../../core/models';
import { TareasService } from './tareas.service';
import { fechaHoraOpcional, fechaLocalAIso } from '../../core/services/fechas';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-tarea-manual-form',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="manual-card" aria-labelledby="manual-title">
      <div class="manual-card-header">
        <div>
          <p class="manual-eyebrow">Carga manual</p>
          <h2 id="manual-title">Crear una nueva tarea</h2>
          <p>Completá los datos sin usar el asistente de IA.</p>
        </div>
        <button type="button" class="close-button" [disabled]="guardando()" (click)="cancelar.emit()" aria-label="Cerrar formulario">×</button>
      </div>

      <form [formGroup]="form" (ngSubmit)="crear()" [attr.aria-busy]="guardando()">
        <fieldset class="manual-form" [disabled]="guardando() || bloqueado()">
        <label class="field-group field-wide">
          <span>Título <b>*</b></span>
          <input formControlName="titulo" class="field" maxlength="200" [attr.aria-invalid]="form.controls.titulo.touched && form.controls.titulo.invalid" aria-describedby="manual-title-error" placeholder="Ej.: Entregar informe de laboratorio" />
          @if (form.controls.titulo.touched && form.controls.titulo.invalid) {
            <small id="manual-title-error">Ingresá un título de hasta 200 caracteres.</small>
          }
        </label>

        <label class="field-group field-wide">
          <span>Descripción</span>
          <textarea formControlName="descripcion" class="field" rows="3" maxlength="4000" [attr.aria-invalid]="form.controls.descripcion.touched && form.controls.descripcion.invalid" aria-describedby="manual-description-error" placeholder="Agregá indicaciones, temas o detalles importantes"></textarea>
          @if (form.controls.descripcion.touched && form.controls.descripcion.invalid) { <small id="manual-description-error">La descripción admite hasta 4000 caracteres.</small> }
        </label>

        <label class="field-group">
          <span>Materia</span>
          <select formControlName="materiaId" class="field">
            <option value="">Sin materia</option>
            @for (materia of materiasRegulares(); track materia.id) {
              <option [value]="materia.id">{{ materia.nombre }}</option>
            }
          </select>
          <em>Solo se muestran materias regulares. Podés cambiar su estado desde Materias.</em>
        </label>

        <label class="field-group">
          <span>Tipo</span>
          <select formControlName="tipo" class="field">
            @for (tipo of tipos; track tipo.valor) {
              <option [value]="tipo.valor">{{ tipo.etiqueta }}</option>
            }
          </select>
        </label>

        <label class="field-group">
          <span>Estado</span>
          <select formControlName="estado" class="field">
            @for (estado of estados; track estado.valor) {
              <option [value]="estado.valor">{{ estado.etiqueta }}</option>
            }
          </select>
        </label>

        <label class="field-group">
          <span>Fecha y hora límite</span>
          <input formControlName="fechaLimite" type="datetime-local" class="field" [attr.aria-invalid]="form.controls.fechaLimite.touched && form.controls.fechaLimite.invalid" aria-describedby="manual-date-error" />
          @if (form.controls.fechaLimite.touched && form.controls.fechaLimite.invalid) { <small id="manual-date-error">Ingresá una fecha y hora válidas, o dejalas sin definir.</small> }
        </label>

        <label class="field-group field-wide">
          <span>Recordatorio por email</span>
          <select formControlName="recordatorioMinutos" class="field">
            <option [ngValue]="null">Usar configuración del perfil</option>
            <option [ngValue]="30">30 minutos antes</option>
            <option [ngValue]="60">1 hora antes</option>
            <option [ngValue]="180">3 horas antes</option>
            <option [ngValue]="1440">1 día antes</option>
            <option [ngValue]="2880">2 días antes</option>
            <option [ngValue]="10080">1 semana antes</option>
          </select>
          <em>El envío también depende de la configuración de recordatorios de tu perfil.</em>
        </label>

        @if (error()) {
          <p class="form-error field-wide" role="alert">{{ error() }}</p>
        }

        <div class="form-actions field-wide">
          <button type="button" class="button-secondary" (click)="cancelar.emit()" [disabled]="guardando()">Cancelar</button>
          <button type="submit" class="button-primary" [disabled]="guardando() || bloqueado()">
            {{ guardando() ? 'Creando tarea...' : 'Crear tarea' }}
          </button>
        </div>
        </fieldset>
      </form>
    </section>
  `,
  styles: `
    .manual-card { padding: 1.25rem; border: 1px solid var(--accent-border); border-radius: .9rem; background: var(--card); box-shadow: var(--shadow-soft); animation: softPop 220ms var(--ease-out) both; }
    .manual-card-header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; }
    .manual-eyebrow { margin: 0 0 .25rem; color: var(--accent); font: 600 .68rem 'JetBrains Mono', monospace; letter-spacing: .1em; text-transform: uppercase; }
    h2 { font-size: 1.35rem; }
    .manual-card-header p:last-child { margin: .3rem 0 0; color: var(--muted); font-size: .82rem; }
    .close-button { display: grid; place-items: center; flex: 0 0 auto; width: 2.25rem; height: 2.25rem; border: 1px solid var(--border); border-radius: .65rem; background: transparent; color: var(--muted); font-size: 1.4rem; cursor: pointer; }
    .manual-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; border: 0; padding: 0; margin: 0; min-width: 0; }
    .field-group { display: flex; flex-direction: column; gap: .38rem; min-width: 0; }
    .field-group > span { color: var(--ink-secondary); font-size: .75rem; font-weight: 600; }
    .field-group b { color: var(--accent); }
    .field-group small, .form-error { margin: 0; color: var(--error-text); font-size: .72rem; }
    .field-group em { color: var(--muted); font-size: .68rem; font-style: normal; line-height: 1.4; }
    .field-wide { grid-column: 1 / -1; }
    textarea.field { resize: vertical; min-height: 5.5rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: .65rem; padding-top: .2rem; }
    .button-primary, .button-secondary { padding: .6rem 1rem; border: 1px solid transparent; }
    .button-primary { background: var(--accent); color: white; }
    .button-secondary { background: transparent; border-color: var(--border); color: var(--ink-secondary); }
    button:disabled { cursor: wait; opacity: .65; }
    @media (max-width: 640px) {
      .manual-card { padding: 1rem; }
      .manual-form { grid-template-columns: 1fr; }
      .field-wide { grid-column: auto; }
      .form-actions { flex-direction: column-reverse; }
      .form-actions button { width: 100%; }
    }
  `,
})
export class TareaManualFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tareasService = inject(TareasService);

  readonly materias = input.required<Materia[]>();
  protected readonly materiasRegulares = computed(() =>
    this.materias().filter((materia) => materia.estado === EstadoMateria.REGULAR),
  );
  readonly bloqueado = input(false);
  readonly creada = output<Tarea>();
  readonly cancelar = output<void>();
  readonly guardandoCambio = output<boolean>();

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

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
    materiaId: [''],
    tipo: [TipoTarea.TAREA],
    estado: [EstadoTarea.PENDIENTE],
    fechaLimite: ['', fechaHoraOpcional],
    recordatorioMinutos: this.fb.control<number | null>(null),
  });

  protected crear(): void {
    if (this.guardando() || this.bloqueado()) return;
    this.form.controls.titulo.setValue(this.form.controls.titulo.value.trim());
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.guardando.set(true);
    this.guardandoCambio.emit(true);
    this.error.set(null);

    this.tareasService.crear({
      titulo: value.titulo.trim(),
      descripcion: value.descripcion.trim() || undefined,
      materiaId: value.materiaId || undefined,
      tipo: value.tipo,
      estado: value.estado,
      fechaLimite: value.fechaLimite ? fechaLocalAIso(value.fechaLimite)! : undefined,
      recordatorioMinutos: value.fechaLimite ? value.recordatorioMinutos : null,
      origen: OrigenTarea.MANUAL,
    }).pipe(finalize(() => { this.guardando.set(false); this.guardandoCambio.emit(false); })).subscribe({
      next: (tarea) => {
        const materia = this.materias().find((item) => item.id === value.materiaId);
        this.creada.emit({ ...tarea, materia: materia ?? tarea.materia });
      },
      error: () => {
        this.error.set('No se pudo crear la tarea. Revisá los datos e intentá nuevamente.');
      },
    });
  }
}
