import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
    <div class="materias-page">
      <h1 class="title-bar">Materias</h1>

      <div class="max-w-6xl mx-auto space-y-6 px-4 md:px-8 py-6">
      <section class="bg-[#FFFEFA] rounded-lg border border-[#D9D3C2] shadow-sm p-5">
        <h2 class="text-sm font-semibold text-[#1A2540] mb-4">Nueva materia</h2>
        <form [formGroup]="form" (ngSubmit)="crear()" class="grid gap-3 sm:grid-cols-2">
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-xs font-medium text-[#8C8570]">Nombre *</label>
            <input formControlName="nombre" class="field" placeholder="Análisis Matemático II" />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <span class="text-xs text-[#F6E2DA]0">El nombre es obligatorio.</span>
            }
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[#8C8570]">Año de cursado</label>
            <input formControlName="anioCursado" type="number" min="1" step="1" class="field" placeholder="1" />
            @if (form.controls.anioCursado.touched && form.controls.anioCursado.invalid) {
              <span class="text-xs text-[#F6E2DA]0">Indicá un año de cursado válido.</span>
            }
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[#8C8570]">Cuatrimestre</label>
            <select formControlName="cuatrimestre" class="field">
              <option value="">Sin definir</option>
              <option [value]="Cuatrimestre.PRIMERO">Primero</option>
              <option [value]="Cuatrimestre.SEGUNDO">Segundo</option>
              <option [value]="Cuatrimestre.ANUAL">Anual</option>
            </select>
            @if (form.controls.cuatrimestre.touched && form.controls.cuatrimestre.invalid) {
              <span class="text-xs text-[#F6E2DA]0">Elegí un cuatrimestre.</span>
            }
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[#8C8570]">Estado</label>
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
        <p class="text-sm text-[#8C8570] py-6 text-center">Todavía no cargaste materias.</p>
      } @else {
        <div class="years-stack">
          @for (ano of materiasAgrupadas(); track ano.anio) {
            <section class="year-section">
              <h2 class="year-title">{{ ano.label }}</h2>

              @for (grupo of ano.grupos; track grupo.key) {
                <div class="semester-group">
                  <div class="semester-header">
                    <span class="semester-badge">{{ grupo.label }}</span>
                  </div>

                  <div class="materias-grid">
                    @for (m of grupo.materias; track m.id) {
                      <article class="materia-card">
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
                          <div class="materia-header">
                            <div>
                              <p class="materia-title">{{ m.nombre }}</p>
                              <span class="status-badge" [class.status-regular]="m.estado === EstadoMateria.REGULAR" [class.status-aprobado]="m.estado === EstadoMateria.APROBADO" [class.status-libre]="m.estado === EstadoMateria.LIBRE">
                                {{ nombreEstado(m.estado) }}
                              </span>
                            </div>
                            <div class="acciones">
                              <button type="button" (click)="iniciarEdicion(m)" title="Editar" class="icon-button">Editar</button>
                              <button type="button" (click)="eliminar(m)" [disabled]="eliminandoId() === m.id" title="Eliminar" class="icon-button danger">Eliminar</button>
                            </div>
                          </div>
                          <p class="materia-meta">Año {{ m.anioCursado ?? 'sin definir' }} · {{ nombreCuatrimestre(m.cuatrimestre) }}</p>
                        }
                      </article>
                    }
                  </div>
                </div>
              }
            </section>
          }
        </div>
      }
      </div>
    </div>
  `,
  styles: `
    .field { @apply border border-[#D9D3C2] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9C2AC]; }
    .button-primary { @apply text-sm font-medium px-4 py-2 rounded-md bg-[#6E1F2B] text-[#FAF6EE] hover:bg-[#4F1620] disabled:opacity-50 transition-colors; }
    .button-secondary { @apply text-sm font-medium px-4 py-2 rounded-md border border-[#D8CBAE] text-[#7A6B57] hover:bg-[#F1DEE1] transition-colors; }
    .icon-button { @apply text-xs font-medium px-2 py-1 rounded-md text-[#7A6B57] hover:text-[#3A2A22] hover:bg-[#F1DEE1] disabled:opacity-50; }
    .icon-button.danger { @apply hover:text-[#6E1F2B] hover:bg-[#F1DEE1]; }

    .years-stack { display: grid; gap: 1.25rem; }
    .year-section { display: grid; gap: 0.85rem; }
    .year-title {
      font-size: 1.9rem;
      font-weight: 600;
      color: #3a2a22;
      margin: 0;
    }
    .semester-group { display: grid; gap: 0.8rem; }
    .semester-header { display: flex; align-items: center; }
    .semester-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid #d8cbae;
      background: #f1dee1;
      color: #6e1f2b;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', 'SFMono-Regular', monospace;
    }
    .materias-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.9rem;
    }
    .materia-card {
      background: #faf6ee;
      border: 1px solid #d8cbae;
      border-radius: 0.9rem;
      padding: 0.9rem;
      box-shadow: 0 1px 2px rgba(58, 42, 34, 0.04);
    }
    .materia-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .materia-title {
      font-size: 1rem;
      font-weight: 600;
      color: #3a2a22;
      margin: 0 0 0.45rem;
      word-break: break-word;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      font-family: 'JetBrains Mono', 'SFMono-Regular', monospace;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .status-regular { background: #f1dee1; color: #6e1f2b; border-color: rgba(110, 31, 43, 0.12); }
    .status-aprobado { background: #e7eee1; color: #3f6b4a; border-color: #c3d4b4; }
    .status-libre { background: #f2efe8; color: #7a6b57; border-color: #d8cbae; }
    .acciones { display: flex; gap: 0.35rem; flex-wrap: wrap; justify-content: flex-end; }
    .materia-meta {
      margin-top: 0.7rem;
      font-size: 0.72rem;
      line-height: 1.4;
      color: #7a6b57;
      font-family: 'JetBrains Mono', 'SFMono-Regular', monospace;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
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

  protected readonly materiasAgrupadas = computed(() => {
    const ordenado = [...this.materias()].sort((a, b) => {
      const anioA = a.anioCursado ?? Number.MAX_SAFE_INTEGER;
      const anioB = b.anioCursado ?? Number.MAX_SAFE_INTEGER;
      if (anioA !== anioB) return anioA - anioB;
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

    const gruposPorAnio = new Map<number | 'sin-anio', { key: number | 'sin-anio'; label: string; materias: Materia[] }>();

    for (const materia of ordenado) {
      const key = materia.anioCursado ?? 'sin-anio';
      const existing = gruposPorAnio.get(key) ?? { key, label: materia.anioCursado ? `Año ${materia.anioCursado}` : 'Sin año definido', materias: [] };
      existing.materias.push(materia);
      gruposPorAnio.set(key, existing);
    }

    const porAnio = [...gruposPorAnio.values()].map((grupo) => {
      const porCuatrimestre = new Map<string, Materia[]>();
      for (const materia of grupo.materias) {
        const key = materia.cuatrimestre ?? 'sin-definir';
        const label = this.nombreCuatrimestre(materia.cuatrimestre);
        const bucket = porCuatrimestre.get(key) ?? [];
        bucket.push(materia);
        porCuatrimestre.set(key, bucket);
        if (!key) {
          // no-op for compatibility
        }
      }

      const grupos = [...porCuatrimestre.entries()].sort(([a], [b]) => {
        const orden = { 'sin-definir': 99, '1': 1, '2': 2, anual: 3 } as Record<string, number>;
        return (orden[a] ?? 99) - (orden[b] ?? 99);
      }).map(([cuatrimestre, materias]) => ({
        key: cuatrimestre,
        label: cuatrimestre === 'sin-definir' ? 'Sin definir' : cuatrimestre === '1' ? '1ER CUATRIMESTRE' : cuatrimestre === '2' ? '2DO CUATRIMESTRE' : 'ANUAL',
        materias: materias.reverse(),
      }));

      return {
        anio: grupo.key,
        label: grupo.label,
        grupos,
      };
    });

    return porAnio.sort((a, b) => {
      const aKey = a.anio === 'sin-anio' ? Number.MAX_SAFE_INTEGER : Number(a.anio);
      const bKey = b.anio === 'sin-anio' ? Number.MAX_SAFE_INTEGER : Number(b.anio);
      return aKey - bKey;
    });
  });

  protected nombreCuatrimestre(value: Cuatrimestre | null): string {
    return value === Cuatrimestre.PRIMERO ? 'Primero' : value === Cuatrimestre.SEGUNDO ? 'Segundo' : value === Cuatrimestre.ANUAL ? 'Anual' : 'Sin definir';
  }

  protected nombreEstado(value: EstadoMateria): string {
    return value === EstadoMateria.APROBADO ? 'Aprobado' : value === EstadoMateria.LIBRE ? 'Libre' : 'Regular';
  }
}