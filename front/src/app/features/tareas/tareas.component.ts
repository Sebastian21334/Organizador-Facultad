import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TareasService } from './tareas.service';
import { MateriasService } from '../materias/materias.service';
import { Tarea, Materia, EstadoTarea, TipoTarea } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader.component';
import { ErrorComponent } from '../../shared/components/error.component';
import { TareaBadgeComponent } from '../../shared/components/tarea-badge.component';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-tareas',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoaderComponent,
    ErrorComponent,
    TareaBadgeComponent,
  ],
  template: `
    <div class="tareas-page">
      <h1 class="title-bar">Tareas</h1>

      <div class="max-w-6xl mx-auto space-y-5 px-3 md:px-5 py-6">

        @if (mostrarAvisoRecordatorios()) {
          <section class="recordatorio-aviso" aria-labelledby="recordatorio-aviso-titulo">
            <div>
              <p class="recordatorio-aviso-etiqueta">Organización automática</p>
              <h2 id="recordatorio-aviso-titulo">No te olvides de tus entregas</h2>
              <p>Activá un recordatorio por email para todas tus tareas desde tu perfil.</p>
            </div>
            <a routerLink="/perfil" fragment="recordatorios" class="recordatorio-aviso-enlace">
              Configurar recordatorio
            </a>
          </section>
        }

        <!-- FILTROS -->
        <div class="filtros-bar">

          <label class="filtro-campo">
            <span class="filtro-label">Estado</span>

            <select
              [(ngModel)]="filtroEstado"
              (ngModelChange)="aplicarFiltros()"
              class="filtro-select"
            >
              <option value="">Todos</option>

              @for (e of estados; track e) {
                <option [value]="e">{{ e }}</option>
              }
            </select>
          </label>

          <label class="filtro-campo">
            <span class="filtro-label">Materia</span>

            <select
              [(ngModel)]="filtroMateria"
              (ngModelChange)="aplicarFiltros()"
              class="filtro-select"
            >
              <option value="">Todas</option>

              @for (m of materias(); track m.id) {
                <option [value]="m.id">{{ m.nombre }}</option>
              }
            </select>
          </label>

          <span class="filtro-contador">
            {{ tareasFiltradas().length }}
            {{ tareasFiltradas().length === 1 ? 'tarea' : 'tareas' }}
          </span>
        </div>

        <!-- ESTADOS -->
        @if (cargando()) {

          <app-loader mensaje="Cargando tareas..." />

        } @else if (error()) {

          <app-error [mensaje]="error()" />

        } @else if (tareasFiltradas().length === 0) {

          <div class="tareas-vacio">
            <p>No hay tareas que coincidan con los filtros.</p>
          </div>

        } @else {

          <!-- LISTA DE TAREAS -->
          <ul class="tareas-lista">

            @for (t of tareasFiltradas(); track t.id) {

              <li class="tareas-item">

                @if (tareaEnEdicion() === t.id) {

                  <!-- FILA EN MODO EDICIÓN -->
                  <div class="tarea-edicion">

                    <input
                      [(ngModel)]="edicion.titulo"
                      class="filtro-select"
                      placeholder="Título"
                    />

                    <div class="tarea-edicion-campos">

                      <select
                        [(ngModel)]="edicion.materiaId"
                        class="filtro-select"
                      >
                        <option [ngValue]="undefined">
                          Sin materia
                        </option>

                        @for (m of materias(); track m.id) {
                          <option [ngValue]="m.id">
                            {{ m.nombre }}
                          </option>
                        }
                      </select>

                      <input
                        type="date"
                        [(ngModel)]="edicion.fechaLimite"
                        class="filtro-select"
                      />

                      <select
                        [(ngModel)]="edicion.tipo"
                        class="filtro-select"
                      >
                        @for (tp of tipos; track tp) {
                          <option [value]="tp">
                            {{ tp }}
                          </option>
                        }
                      </select>

                    </div>

                    <div class="tarea-edicion-botones">

                      <button
                        (click)="cancelarEdicion()"
                        class="btn-secundario"
                      >
                        Cancelar
                      </button>

                      <button
                        (click)="guardarEdicion(t)"
                        class="btn-primario"
                      >
                        Guardar
                      </button>

                    </div>

                  </div>

                } @else {

                  <!-- FILA NORMAL -->
                  <div class="tarea-contenido">

                    <!-- INFORMACIÓN -->
                    <div class="tarea-info">

                      <p class="tareas-item-titulo">
                        {{ t.titulo }}
                      </p>

                      <p class="tareas-item-meta">

                        {{ t.materia?.nombre ?? 'Sin materia' }}

                        @if (t.fechaLimite) {
                          · {{ t.fechaLimite | date: 'dd/MM/yyyy' }}
                        }

                      </p>

                    </div>

                    <!-- ACCIONES -->
                    <div class="tarea-acciones">

                      <app-tarea-badge
                        [tipo]="t.tipo"
                        [estado]="t.estado"
                      />

                      <button
                        (click)="marcarHecha(t)"
                        [disabled]="t.estado === estadoHecha"
                        class="btn-secundario"
                        [class.btn-hecha]="t.estado === estadoHecha"
                      >
                        {{
                          t.estado === estadoHecha
                            ? 'Hecha'
                            : 'Marcar hecha'
                        }}
                      </button>

                      <button
                        (click)="iniciarEdicion(t)"
                        class="btn-secundario"
                      >
                        Editar
                      </button>

                      <button
                        (click)="eliminar(t)"
                        class="btn-peligro"
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
    </div>
  `,

  styles: `
    /* =========================================================
       FILTROS
       ========================================================= */

    .filtros-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 1.25rem;

      background: #EFEBDF;
      border: 1px solid #D9D3C2;
      border-radius: 0.65rem;

      padding: 1rem 1.25rem;
    }

    .recordatorio-aviso {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border: 1px solid #e2c2c7;
      border-left: 4px solid #6e1f2b;
      border-radius: 0.65rem;
      background: #fbf3f4;
    }

    .recordatorio-aviso-etiqueta {
      margin: 0 0 0.2rem;
      color: #6e1f2b;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .recordatorio-aviso h2 {
      color: #3a2a22;
      font-family: 'Fraunces', serif;
      font-size: 1.1rem;
    }

    .recordatorio-aviso p:not(.recordatorio-aviso-etiqueta) {
      margin: 0.2rem 0 0;
      color: #6b5f56;
      font-size: 0.82rem;
    }

    .recordatorio-aviso-enlace {
      flex-shrink: 0;
      border-radius: 0.5rem;
      background: #6e1f2b;
      color: #fffefa;
      padding: 0.6rem 0.85rem;
      font-size: 0.78rem;
      font-weight: 600;
      text-decoration: none;
    }

    .recordatorio-aviso-enlace:hover {
      background: #4f1620;
    }

    .filtro-campo {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .filtro-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #8C8570;
    }

    .filtro-select {
      appearance: none;
      -webkit-appearance: none;

      background-color: #FFFEFA;

      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%235B5748' stroke-width='1.5' fill='none' fill-rule='evenodd'/></svg>");

      background-repeat: no-repeat;
      background-position: right 0.75rem center;

      border: 1px solid #D9D3C2;
      border-radius: 0.5rem;

      padding: 0.5rem 2rem 0.5rem 0.75rem;

      font-size: 0.85rem;
      color: #3A2A22;

      min-width: 10rem;
      box-sizing: border-box;
    }

    .filtro-select:focus {
      outline: none;
      border-color: #6E1F2B;
    }

    .filtro-contador {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: #8C8570;

      margin-left: auto;
      align-self: center;
    }


    /* =========================================================
       LISTA
       ========================================================= */

    .tareas-lista {
      background: #FFFEFA;
      border: 1px solid #D9D3C2;
      border-radius: 0.65rem;

      overflow: hidden;

      margin: 0;
      padding: 0;

      list-style: none;
    }

    .tareas-item {
      padding: 1.1rem 1.25rem;

      border-bottom: 1px solid #EFEBDF;

      transition: background-color 0.15s ease;

      box-sizing: border-box;
    }

    .tareas-item:last-child {
      border-bottom: none;
    }

    .tareas-item:hover {
      background-color: #FAF6EE;
    }


    /* =========================================================
       CONTENIDO DE UNA TAREA
       ========================================================= */

    .tarea-contenido {
      display: flex;
      align-items: center;
      justify-content: space-between;

      gap: 1rem;

      width: 100%;
      min-width: 0;
    }

    .tarea-info {
      min-width: 0;
      flex: 1;
    }

    .tareas-item-titulo {
      margin: 0;

      font-family: 'Fraunces', serif;
      font-weight: 700;
      font-size: 1rem;
      line-height: 1.35;

      color: #3A2A22;

      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .tareas-item-meta {
      margin: 0.15rem 0 0;

      font-size: 0.85rem;
      line-height: 1.4;

      color: #8C8570;

      overflow-wrap: anywhere;
    }


    /* =========================================================
       ACCIONES
       ========================================================= */

    .tarea-acciones {
      display: flex;
      align-items: center;

      gap: 0.5rem;

      flex-shrink: 0;
    }


    /* =========================================================
       BOTONES
       ========================================================= */

    .btn-secundario,
    .btn-primario,
    .btn-peligro {
      font-size: 0.75rem;

      padding: 0.4rem 0.75rem;

      border-radius: 0.5rem;
      border: 1px solid transparent;

      transition:
        background-color 0.15s ease,
        border-color 0.15s ease;

      white-space: nowrap;

      cursor: pointer;

      box-sizing: border-box;
    }

    .btn-secundario {
      border-color: #D9D3C2;
      color: #5B5748;
      background: transparent;
    }

    .btn-secundario:hover {
      background-color: #EFEBDF;
    }

    .btn-secundario:disabled {
      cursor: default;
      opacity: 0.7;
    }

    .btn-hecha {
      border-color: #C3D4B4;
      color: #3F6B4A;
    }

    .btn-primario {
      border-color: #D8CBAE;
      color: #6E1F2B;
      background: transparent;
    }

    .btn-primario:hover {
      background-color: #F1DEE1;
    }

    .btn-peligro {
      border-color: #E8C9B8;
      color: #B3401A;
      background: transparent;
    }

    .btn-peligro:hover {
      background-color: #F6E2DA;
    }


    /* =========================================================
       VACÍO
       ========================================================= */

    .tareas-vacio {
      background: #FAF6EE;

      border: 1px dashed #D8CBAE;
      border-radius: 0.65rem;

      padding: 2.5rem 1rem;

      text-align: center;

      color: #8C8570;
      font-size: 0.9rem;
    }


    /* =========================================================
       EDICIÓN
       ========================================================= */

    .tarea-edicion {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .tarea-edicion-campos {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tarea-edicion-botones {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    @media (max-width: 640px) {
      .recordatorio-aviso {
        align-items: stretch;
        flex-direction: column;
      }

      .recordatorio-aviso-enlace {
        text-align: center;
      }
    }


    /* =========================================================
       MOBILE
       ========================================================= */

    @media (max-width: 640px) {

      .filtros-bar {
        flex-direction: column;
        align-items: stretch;

        gap: 0.85rem;

        padding: 0.9rem;
      }

      .filtro-campo {
        width: 100%;
      }

      .filtro-select {
        width: 100%;
        min-width: 0;
      }

      .filtro-contador {
        margin-left: 0;
        align-self: flex-start;
      }


      /* Cada tarea pasa a formato vertical */

      .tareas-item {
        padding: 1rem;
      }

      .tarea-contenido {
        flex-direction: column;
        align-items: stretch;

        gap: 0.85rem;
      }

      .tarea-info {
        width: 100%;
      }

      .tareas-item-titulo {
        font-size: 0.95rem;
        line-height: 1.35;
      }

      .tareas-item-meta {
        font-size: 0.8rem;
        line-height: 1.4;
      }


      /* Acciones */

      .tarea-acciones {
        width: 100%;

        display: flex;
        flex-wrap: wrap;

        align-items: center;

        gap: 0.5rem;
      }

      /*
       * El badge ocupa una fila completa.
       * Así no queda apretado junto con los botones.
       */

      .tarea-acciones app-tarea-badge {
        flex-basis: 100%;
      }

      .tarea-acciones button {
        flex: 1 1 auto;

        min-width: 0;
      }


      /* Edición en mobile */

      .tarea-edicion {
        width: 100%;
      }

      .tarea-edicion-campos {
        flex-direction: column;
      }

      .tarea-edicion-campos .filtro-select {
        width: 100%;
      }

      .tarea-edicion-botones {
        justify-content: stretch;
      }

      .tarea-edicion-botones button {
        flex: 1;
      }
    }
  `,

})
export class TareasComponent implements OnInit {
  private readonly tareasService = inject(TareasService);
  private readonly materiasService = inject(MateriasService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tareas = signal<Tarea[]>([]);
  protected readonly materias = signal<Materia[]>([]);
  protected readonly tareasFiltradas = signal<Tarea[]>([]);
  protected readonly mostrarAvisoRecordatorios = signal(false);

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
  } = {
    titulo: '',
    materiaId: undefined,
    fechaLimite: '',
    tipo: TipoTarea.OTRO,
  };

  ngOnInit(): void {
    this.cargar();
    this.auth.getPerfil().subscribe({
      next: (perfil) => this.mostrarAvisoRecordatorios.set(!perfil.recordatorioEmailHabilitado),
    });
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
      if (this.filtroEstado && t.estado !== this.filtroEstado) {
        return false;
      }

      if (this.filtroMateria && t.materia?.id !== this.filtroMateria) {
        return false;
      }

      return true;
    });

    this.tareasFiltradas.set(filtradas);
  }

  protected marcarHecha(tarea: Tarea): void {
    if (tarea.estado === EstadoTarea.HECHA) {
      return;
    }

    this.tareasService
      .actualizar(tarea.id, {
        estado: EstadoTarea.HECHA,
      })
      .subscribe({
        next: (actualizada) => this.reemplazarEnLista(actualizada),
        error: () => this.error.set('No se pudo actualizar la tarea.'),
      });
  }

  protected iniciarEdicion(tarea: Tarea): void {
    this.tareaEnEdicion.set(tarea.id);

    this.edicion = {
      titulo: tarea.titulo,
      materiaId: tarea.materia?.id,
      fechaLimite: tarea.fechaLimite
        ? this.aInputDate(tarea.fechaLimite)
        : '',
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

        error: () => {
          this.error.set('No se pudo actualizar la tarea.');
        },
      });
  }

  protected async eliminar(tarea: Tarea): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      titulo: 'Eliminar tarea',
      mensaje: `¿Eliminar la tarea "${tarea.titulo}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });

    if (!confirmado) {
      return;
    }

    this.tareasService.eliminar(tarea.id).subscribe({
      next: () => {
        this.tareas.set(
          this.tareas().filter((t) => t.id !== tarea.id)
        );

        this.aplicarFiltros();
      },

      error: () => {
        this.error.set('No se pudo eliminar la tarea.');
      },
    });
  }

  private reemplazarEnLista(actualizada: Tarea): void {
    this.tareas.set(
      this.tareas().map((t) =>
        t.id === actualizada.id ? actualizada : t
      )
    );

    this.aplicarFiltros();
  }

  private aInputDate(fecha: Date | string): string {
    const d = new Date(fecha);

    return d.toISOString().slice(0, 10);
  }

}