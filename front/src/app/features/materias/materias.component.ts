import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MateriasService } from './materias.service';
import { Cuatrimestre, EstadoMateria, Materia } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader.component';
import { ErrorComponent } from '../../shared/components/error.component';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog.service';

@Component({
  selector: 'app-materias',
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent, ErrorComponent],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      <h1 class="text-2xl font-semibold text-slate-800">Materias</h1>
      <section class="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-4">Nueva materia</h2>
        <form [formGroup]="form" (ngSubmit)="crear()" class="grid gap-3 sm:grid-cols-2">
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-xs font-medium text-slate-500">Nombre *</label>
            <input formControlName="nombre" class="field" placeholder="Análisis Matemático II" />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <span class="text-xs text-red-500">El nombre es obligatorio.</span>
            }
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-slate-500">Año de cursado</label>
            <input formControlName="anioCursado" type="number" min="1" step="1" class="field" placeholder="1" />
            @if (form.controls.anioCursado.touched && form.controls.anioCursado.invalid) {
              <span class="text-xs text-red-500">Indicá un año de cursado válido.</span>
            }
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-slate-500">Cuatrimestre</label>
            <select formControlName="cuatrimestre" class="field">
              <option value="">Sin definir</option>
              <option [value]="Cuatrimestre.PRIMERO">Primero</option>
              <option [value]="Cuatrimestre.SEGUNDO">Segundo</option>
              <option [value]="Cuatrimestre.ANUAL">Anual</option>
            </select>
            @if (form.controls.cuatrimestre.touched && form.controls.cuatrimestre.invalid) {
              <span class="text-xs text-red-500">Elegí un cuatrimestre.</span>
            }
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-slate-500">Estado</label>
            <select formControlName="estado" class="field">
              <option [value]="EstadoMateria.REGULAR">Regular</option>
              <option [value]="EstadoMateria.APROBADO">Aprobado</option>
              <option [value]="EstadoMateria.LIBRE">Libre</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <button type="submit" [disabled]="enviando()" class="button-primary">{{ enviando() ? 'Creando...' : 'Crear materia' }}</button>
          </div>
        </form>
      </section>

      @if (cargando()) {
        <app-loader mensaje="Cargando materias..." />
      } @else if (error()) {
        <app-error [mensaje]="error()" />
      } @else if (materias().length === 0) {
        <p class="text-sm text-slate-500 py-6 text-center">Todavía no cargaste materias.</p>
      } @else {
        <ul class="space-y-2">
          @for (m of materias(); track m.id) {
            <li class="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3">
              @if (editandoId() === m.id) {
                <form [formGroup]="editForm" (ngSubmit)="guardarEdicion(m.id)" class="grid gap-2 sm:grid-cols-2">
                  <input formControlName="nombre" class="field sm:col-span-2" placeholder="Nombre" />
                  <input formControlName="anioCursado" type="number" min="1" step="1" class="field" placeholder="Año de cursado" />
                  <select formControlName="cuatrimestre" class="field">
                    <option value="">Sin definir</option>
                    <option [value]="Cuatrimestre.PRIMERO">Primero</option>
                    <option [value]="Cuatrimestre.SEGUNDO">Segundo</option>
                    <option [value]="Cuatrimestre.ANUAL">Anual</option>
                  </select>
                  <select formControlName="estado" class="field">
                    <option [value]="EstadoMateria.REGULAR">Regular</option>
                    <option [value]="EstadoMateria.APROBADO">Aprobado</option>
                    <option [value]="EstadoMateria.LIBRE">Libre</option>
                  </select>
                  <div class="flex gap-2 sm:col-span-2">
                    <button type="submit" [disabled]="guardandoEdicion()" class="button-primary">{{ guardandoEdicion() ? 'Guardando...' : 'Guardar' }}</button>
                    <button type="button" (click)="cancelarEdicion()" class="button-secondary">Cancelar</button>
                  </div>
                </form>
              } @else {
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-800 truncate">{{ m.nombre }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Año {{ m.anioCursado ?? 'sin definir' }} · {{ nombreCuatrimestre(m.cuatrimestre) }} · {{ nombreEstado(m.estado) }}</p>
                  </div>
                  <div class="flex gap-1 shrink-0">
                    <button type="button" (click)="iniciarEdicion(m)" title="Editar" class="icon-button">Editar</button>
                    <button type="button" (click)="eliminar(m)" [disabled]="eliminandoId() === m.id" title="Eliminar" class="icon-button danger">Eliminar</button>
                  </div>
                </div>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .field { @apply border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300; }
    .button-primary { @apply text-sm font-medium px-4 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors; }
    .button-secondary { @apply text-sm font-medium px-4 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors; }
    .icon-button { @apply text-xs font-medium px-2 py-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-50; }
    .icon-button.danger { @apply hover:text-red-600 hover:bg-red-50; }
  `,
})
export class MateriasComponent implements OnInit {
  private readonly materiasService = inject(MateriasService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly Cuatrimestre = Cuatrimestre;
  protected readonly EstadoMateria = EstadoMateria;
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly materias = signal<Materia[]>([]);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardandoEdicion = signal(false);
  protected readonly eliminandoId = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    anioCursado: this.fb.control<number | null>(null, Validators.min(1)),
    cuatrimestre: this.fb.control<Cuatrimestre | ''>(''),
    estado: this.fb.nonNullable.control(EstadoMateria.REGULAR),
  });
  protected readonly editForm = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    anioCursado: this.fb.control<number | null>(null, Validators.min(1)),
    cuatrimestre: this.fb.control<Cuatrimestre | ''>(''),
    estado: this.fb.nonNullable.control(EstadoMateria.REGULAR),
  });

  ngOnInit(): void { this.cargar(); }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.materiasService.listar().subscribe({
      next: (materias) => { this.materias.set(materias); this.cargando.set(false); },
      error: () => { this.error.set('No se pudieron cargar las materias.'); this.cargando.set(false); },
    });
  }

  protected crear(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enviando.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    this.materiasService.crear({ nombre: value.nombre, anioCursado: value.anioCursado ?? undefined, cuatrimestre: value.cuatrimestre || undefined, estado: value.estado }).subscribe({
      next: (materia) => { this.materias.update((lista) => [...lista, materia]); this.form.reset({ estado: EstadoMateria.REGULAR }); this.enviando.set(false); },
      error: () => { this.error.set('No se pudo crear la materia.'); this.enviando.set(false); },
    });
  }

  protected iniciarEdicion(materia: Materia): void {
    this.editandoId.set(materia.id);
    this.editForm.setValue({ nombre: materia.nombre, anioCursado: materia.anioCursado, cuatrimestre: materia.cuatrimestre ?? '', estado: materia.estado });
  }

  protected cancelarEdicion(): void { this.editandoId.set(null); this.editForm.reset({ estado: EstadoMateria.REGULAR }); }

  protected guardarEdicion(id: string): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.guardandoEdicion.set(true);
    this.error.set(null);
    const value = this.editForm.getRawValue();
    this.materiasService.actualizar(id, { nombre: value.nombre, anioCursado: value.anioCursado, cuatrimestre: value.cuatrimestre || null, estado: value.estado }).subscribe({
      next: (actualizada) => { this.materias.update((lista) => lista.map((m) => m.id === id ? actualizada : m)); this.guardandoEdicion.set(false); this.cancelarEdicion(); },
      error: () => { this.error.set('No se pudo actualizar la materia.'); this.guardandoEdicion.set(false); },
    });
  }

  protected async eliminar(materia: Materia): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      titulo: 'Eliminar materia',
      mensaje: `¿Eliminar la materia "${materia.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;
    this.eliminandoId.set(materia.id);
    this.error.set(null);
    this.materiasService.eliminar(materia.id).subscribe({
      next: () => { this.materias.update((lista) => lista.filter((m) => m.id !== materia.id)); this.eliminandoId.set(null); },
      error: () => { this.error.set('No se pudo eliminar la materia.'); this.eliminandoId.set(null); },
    });
  }

  protected nombreCuatrimestre(value: Cuatrimestre | null): string {
    return value === Cuatrimestre.PRIMERO ? 'Primero' : value === Cuatrimestre.SEGUNDO ? 'Segundo' : value === Cuatrimestre.ANUAL ? 'Anual' : 'Sin definir';
  }

  protected nombreEstado(value: EstadoMateria): string {
    return value === EstadoMateria.APROBADO ? 'Aprobado' : value === EstadoMateria.LIBRE ? 'Libre' : 'Regular';
  }
}
