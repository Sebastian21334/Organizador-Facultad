import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TareasService } from './tareas.service';
import { MateriasService } from '../materias/materias.service';
import { Tarea, Materia, EstadoTarea, TipoTarea } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader.component';
import { ErrorComponent } from '../../shared/components/error.component';
import { TareaBadgeComponent } from '../../shared/components/tarea-badge.component';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog.service';

@Component({
  selector: 'app-tareas',
  imports: [CommonModule, FormsModule, LoaderComponent, ErrorComponent, TareaBadgeComponent],
  template: `
    <div class="space-y-4">
      <h1 class="text-xl font-semibold text-slate-800">Tareas</h1>

      <div class="flex flex-wrap gap-3 items-end">
        <label class="text-sm flex flex-col gap-1">
          <span class="text-slate-500">Estado</span>
          <select [(ngModel)]="filtroEstado" (ngModelChange)="aplicarFiltros()" class="border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-white">
            <option value="">Todos</option>
            @for (e of estados; track e) {
              <option [value]="e">{{ e }}</option>
            }
          </select>
        </label>
        <label class="text-sm flex flex-col gap-1">
          <span class="text-slate-500">Materia</span>
          <select [(ngModel)]="filtroMateria" (ngModelChange)="aplicarFiltros()" class="border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-white">
            <option value="">Todas</option>
            @for (m of materias(); track m.id) {
              <option [value]="m.id">{{ m.nombre }}</option>
            }
          </select>
        </label>
      </div>

      @if (cargando()) {
        <app-loader mensaje="Cargando tareas..." />
      } @else if (error()) {
        <app-error [mensaje]="error()" />
      } @else if (tareasFiltradas().length === 0) {
        <p class="text-sm text-slate-500 py-6">No hay tareas que coincidan con los filtros.</p>
      } @else {
        <ul class="divide-y divide-slate-100 bg-white rounded-md border border-slate-200">
          @for (t of tareasFiltradas(); track t.id) {
            <li class="px-4 py-3">
              @if (tareaEnEdicion() === t.id) {
                <!-- Fila en modo edición -->
                <div class="flex flex-col gap-2">
                  <input
                    [(ngModel)]="edicion.titulo"
                    class="border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                    placeholder="Título"
                  />
                  <div class="flex flex-wrap gap-2">
                    <select [(ngModel)]="edicion.materiaId" class="border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-white">
                      <option [ngValue]="undefined">Sin materia</option>
                      @for (m of materias(); track m.id) {
                        <option [ngValue]="m.id">{{ m.nombre }}</option>
                      }
                    </select>
                    <input
                      type="date"
                      [(ngModel)]="edicion.fechaLimite"
                      class="border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                    />
                    <select [(ngModel)]="edicion.tipo" class="border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-white">
                      @for (tp of tipos; track tp) {
                        <option [value]="tp">{{ tp }}</option>
                      }
                    </select>
                  </div>
                  <div class="flex gap-2 justify-end">
                    <button
                      (click)="cancelarEdicion()"
                      class="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      (click)="guardarEdicion(t)"
                      class="text-xs px-2.5 py-1 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Fila normal -->
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-800 truncate">{{ t.titulo }}</p>
                    <p class="text-xs text-slate-500 truncate">
                      {{ t.materia?.nombre ?? 'Sin materia' }}
                      @if (t.fechaLimite) {
                        · {{ t.fechaLimite | date: 'dd/MM/yyyy' }}
                      }
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <app-tarea-badge [tipo]="t.tipo" [estado]="t.estado" />
                    <button
                      (click)="marcarHecha(t)"
                      [disabled]="t.estado === estadoHecha"
                      class="text-xs px-2.5 py-1 rounded-md border transition-colors"
                      [class]="t.estado === estadoHecha
                        ? 'border-green-200 text-green-600 cursor-default'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'"
                    >
                      {{ t.estado === estadoHecha ? 'Hecha' : 'Marcar hecha' }}
                    </button>
                    <button
                      (click)="iniciarEdicion(t)"
                      class="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      (click)="eliminar(t)"
                      class="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class TareasComponent implements OnInit {
  private readonly tareasService = inject(TareasService);
  private readonly materiasService = inject(MateriasService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tareas = signal<Tarea[]>([]);
  protected readonly materias = signal<Materia[]>([]);
  protected readonly tareasFiltradas = signal<Tarea[]>([]);

  protected filtroEstado = '';
  protected filtroMateria = '';
  protected readonly estados = Object.values(EstadoTarea);
  protected readonly tipos = Object.values(TipoTarea);
  protected readonly estadoHecha = EstadoTarea.HECHA;

  // Estado de edición
  protected readonly tareaEnEdicion = signal<string | null>(null);
  protected edicion: {
    titulo: string;
    materiaId: string | undefined;
    fechaLimite: string;
    tipo: TipoTarea;
  } = { titulo: '', materiaId: undefined, fechaLimite: '', tipo: TipoTarea.OTRO };

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.materiasService.listar().subscribe({
      next: (materias) => this.materias.set(materias),
      error: () => this.materias.set([]),
    });
    this.tareasService.listar().subscribe({
      next: (tareas) => {
        this.tareas.set(tareas);
        this.aplicarFiltros();
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las tareas.');
        this.cargando.set(false);
      },
    });
  }

  protected aplicarFiltros(): void {
    const filtradas = this.tareas().filter((t) => {
      if (this.filtroEstado && t.estado !== this.filtroEstado) return false;
      if (this.filtroMateria && t.materia?.id !== this.filtroMateria) return false;
      return true;
    });
    this.tareasFiltradas.set(filtradas);
  }

  protected marcarHecha(tarea: Tarea): void {
    if (tarea.estado === EstadoTarea.HECHA) return;
    this.tareasService.actualizar(tarea.id, { estado: EstadoTarea.HECHA }).subscribe({
      next: (actualizada) => this.reemplazarEnLista(actualizada),
      error: () => this.error.set('No se pudo actualizar la tarea.'),
    });
  }

  protected iniciarEdicion(tarea: Tarea): void {
    this.tareaEnEdicion.set(tarea.id);
    this.edicion = {
      titulo: tarea.titulo,
      materiaId: tarea.materia?.id,
      fechaLimite: tarea.fechaLimite ? this.aInputDate(tarea.fechaLimite) : '',
      tipo: tarea.tipo,
    };
  }

  protected cancelarEdicion(): void {
    this.tareaEnEdicion.set(null);
  }

  protected guardarEdicion(tarea: Tarea): void {
    this.tareasService
      .actualizar(tarea.id, {
        titulo: this.edicion.titulo,
        materiaId: this.edicion.materiaId,
        fechaLimite: this.edicion.fechaLimite || undefined,
        tipo: this.edicion.tipo,
      })
      .subscribe({
        next: (actualizada) => {
          this.reemplazarEnLista(actualizada);
          this.tareaEnEdicion.set(null);
        },
        error: () => this.error.set('No se pudo actualizar la tarea.'),
      });
  }

  protected async eliminar(tarea: Tarea): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      titulo: 'Eliminar tarea',
      mensaje: `¿Eliminar la tarea "${tarea.titulo}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    this.tareasService.eliminar(tarea.id).subscribe({
      next: () => {
        this.tareas.set(this.tareas().filter((t) => t.id !== tarea.id));
        this.aplicarFiltros();
      },
      error: () => this.error.set('No se pudo eliminar la tarea.'),
    });
  }

  private reemplazarEnLista(actualizada: Tarea): void {
    this.tareas.set(this.tareas().map((t) => (t.id === actualizada.id ? actualizada : t)));
    this.aplicarFiltros();
  }

  private aInputDate(fecha: Date | string): string {
    const d = new Date(fecha);
    return d.toISOString().slice(0, 10); // yyyy-MM-dd para el input type="date"
  }
}