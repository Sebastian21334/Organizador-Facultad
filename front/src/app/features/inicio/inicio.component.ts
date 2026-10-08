import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TareasService } from '../tareas/tareas.service';
import { MateriasService } from '../materias/materias.service';
import { Tarea, Materia, EstadoTarea, EstadoMateria, Cuatrimestre, OrigenTarea, TipoTarea } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { LoaderComponent } from '../../shared/components/loader.component';
import { ErrorComponent } from '../../shared/components/error.component';
import { TareaBadgeComponent } from '../../shared/components/tarea-badge.component';
import { AgendaDiaComponent } from '../../shared/components/agenda-dia.component';
import { LucideDynamicIcon, LucideCalendarDays } from '@lucide/angular';

interface DiaSemana {
  fecha: Date;
  label: string;
  tareas: Tarea[];
  esHoy: boolean;
}

@Component({
  selector: 'app-inicio',
  host: { '[class.inicio-preview]': 'vistaPrevia()' },
  imports: [CommonModule, RouterLink, LoaderComponent, ErrorComponent, TareaBadgeComponent, AgendaDiaComponent, LucideDynamicIcon],
  template: `
    <div class="inicio-page">
      @if (cargando()) {
        <div class="inicio-loading">
          <app-loader mensaje="Preparando tu semana..." />
        </div>
      } @else if (error()) {
        <div class="inicio-loading">
          <app-error [mensaje]="error()" [permitirReintento]="true" (reintentar)="cargar()" />
        </div>
      } @else {
        <div class="inicio-layout">
          <aside class="inicio-welcome">
            <div>
              <p class="text-xs font-mono uppercase tracking-[0.15em] text-[#F1DEE1]/70">
                {{ hoy | date: "EEEE d 'de' MMMM" : undefined : 'es-AR' }}
              </p>
              <div class="inicio-welcome-divider"></div>
              <h1 class="text-5xl md:text-6xl font-display font-bold text-[#FAF6EE] mt-4 leading-[1.05]">
                {{ saludo() }}
              </h1>
               <p class="text-sm text-[#F1DEE1]/80 mt-5 leading-relaxed max-w-[26ch]">
                 {{ resumen() }}
               </p>
               <div class="inicio-quick-actions">
                 <a routerLink="/tareas">+ Nueva tarea</a>
                 <a routerLink="/mensajes">✦ Hablar con IA</a>
               </div>
            </div>
          </aside>

          <div class="inicio-dashboard">
            <div class="inicio-dashboard-inner">
              <!-- Franja semanal -->
              <section class="weekly-overview" aria-labelledby="weekly-title">
                <header class="weekly-heading">
                  <div>
                    <p class="dashboard-eyebrow">Tu organización</p>
                    <h2 id="weekly-title">Esta semana</h2>
                    <p class="weekly-summary">{{ tareasSemanaPendientes() }} {{ tareasSemanaPendientes() === 1 ? 'tarea pendiente' : 'tareas pendientes' }}</p>
                  </div>
                  <a routerLink="/calendario" class="weekly-calendar-link" aria-label="Abrir calendario completo">
                    <svg [lucideIcon]="calendarIcon" [size]="20" aria-hidden="true"></svg>
                  </a>
                </header>
                <div class="weekly-days" aria-label="Elegir un día de esta semana">
                  @for (dia of semana(); track dia.fecha.getTime(); let i = $index) {
                    <button type="button" class="weekly-day" [class.is-selected]="dia.fecha.getTime() === diaSemanaSeleccionado().fecha.getTime()"
                      [attr.aria-pressed]="dia.fecha.getTime() === diaSemanaSeleccionado().fecha.getTime()"
                      [attr.aria-current]="dia.esHoy ? 'date' : null"
                      [attr.aria-label]="(dia.fecha | date: 'fullDate' : undefined : 'es-AR') + ': ' + dia.tareas.length + ' tareas'"
                      aria-controls="weekly-day-agenda" (click)="fechaSemanaSeleccionada.set(dia.fecha)">
                      <span class="weekly-day-label">{{ diasSemanaIniciales[i] }}</span>
                      <strong>{{ dia.fecha | date: 'd' }}</strong>
                      <span class="weekly-day-dot" [class.has-tasks]="dia.tareas.length > 0" aria-hidden="true"></span>
                    </button>
                  }
                </div>
                <app-agenda-dia id="weekly-day-agenda" [fecha]="diaSemanaSeleccionado().fecha" [tareas]="diaSemanaSeleccionado().tareas" [esHoy]="diaSemanaSeleccionado().esHoy" (seleccionar)="seleccionarTarea($event)" />
                <a routerLink="/calendario" class="weekly-footer-link">Ver calendario completo <span aria-hidden="true">→</span></a>
              </section>

               <!-- Resumen académico -->
               <section class="academic-progress-card">
                 <div class="academic-progress-copy">
                   <p class="dashboard-eyebrow">Tu carrera</p>
                   <h2>Progreso académico</h2>
                   <p>{{ materiasAprobadas() }} de {{ materias().length }} materias aprobadas</p>
                 </div>
                 <div class="academic-progress-ring" [style.--progress]="porcentajeAprobadas() + '%'" role="img" [attr.aria-label]="porcentajeAprobadas() + '% de materias aprobadas'">
                   <span>{{ porcentajeAprobadas() }}<small>%</small></span>
                 </div>
                 <a routerLink="/materias" class="academic-progress-link">Ver materias <span aria-hidden="true">→</span></a>
               </section>

               <!-- Stats rápidas -->
               <section class="inicio-stats grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <a routerLink="/materias" class="stat-card">
                   <p class="text-3xl font-display font-bold text-[#6E1F2B]">{{ materias().length }}</p>
                   <p class="text-xs text-[#8C8570] mt-1">materias registradas</p>
                 </a>
                 <a routerLink="/materias" class="stat-card stat-card--success">
                   <p class="text-3xl font-display font-bold text-[#3F6B4A]">{{ materiasAprobadas() }}</p>
                   <p class="text-xs text-[#8C8570] mt-1">materias aprobadas</p>
                 </a>
                 <a routerLink="/tareas" class="stat-card">
                   <p class="text-3xl font-display font-bold text-[#B3401A]">{{ tareasPendientes().length }}</p>
                   <p class="text-xs text-[#8C8570] mt-1">tareas pendientes</p>
                 </a>
               </section>

              <!-- Tus tareas (lista completa) -->
              <section class="bg-[#FFFEFA] border border-[#D9D3C2] rounded-lg p-5 flex-1">
                <p class="text-xs font-mono uppercase tracking-wide text-[#8C8570] mb-3">Tus tareas</p>
                @if (tareasPendientesOrdenadas().length === 0) {
                  <p class="text-sm text-[#5B5748]">No tenés tareas pendientes. 🎉</p>
                } @else {
                  <div class="space-y-2">
                    @for (t of tareasPendientesOrdenadas(); track t.id) {
                      <button (click)="seleccionarTarea(t)" class="tarea-row">
                        <span class="tarea-row-nombre">{{ t.titulo }}</span>
                        <span class="tarea-row-fecha">
                          @if (t.fechaLimite) {
                            {{ t.fechaLimite | date: "EEE d 'de' MMM, HH:mm'hs'" : 'UTC' : 'es-AR' }}
                          } @else {
                            Sin fecha
                          }
                          @if (t.materia) { · {{ t.materia.nombre }} }
                        </span>
                      </button>
                    }
                  </div>
                }
              </section>
            </div>
          </div>
        </div>
      }

      @if (tareaSeleccionada()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="cerrarDetalle()">
          <div class="bg-[#FFFEFA] rounded-lg shadow-xl max-w-md w-full p-5 space-y-3" (click)="$event.stopPropagation()">
            <div class="flex items-start justify-between">
              <h2 class="text-lg font-display font-bold text-[#3A2A22]">{{ tareaSeleccionada()!.titulo }}</h2>
              <button (click)="cerrarDetalle()" class="text-[#A39C87] hover:text-[#5B5748]">✕</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <app-tarea-badge [tipo]="tareaSeleccionada()!.tipo" [estado]="tareaSeleccionada()!.estado" />
            </div>
            <dl class="text-sm space-y-1.5">
              <div>
                <dt class="text-[#8C8570] inline">Materia: </dt>
                <dd class="inline text-[#3A2A22]">{{ tareaSeleccionada()!.materia?.nombre ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-[#8C8570] inline">Fecha límite: </dt>
                <dd class="inline text-[#3A2A22]">{{ tareaSeleccionada()!.fechaLimite ? (tareaSeleccionada()!.fechaLimite | date: 'medium' : 'UTC' : 'es-AR') : '—' }}</dd>
              </div>
              <div>
                <dt class="text-[#8C8570] inline">Descripción: </dt>
                <dd class="inline text-[#3A2A22]">{{ tareaSeleccionada()!.descripcion ?? '—' }}</dd>
              </div>
            </dl>
            <a routerLink="/tareas" class="block text-xs text-[#5B5748] hover:underline pt-1">Ver todas las tareas →</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    /* inicio-page ocupa toda la altura disponible del área de contenido.
       Si el shell de la app (el <router-outlet> o su contenedor padre) tiene
       padding propio, hay que sacarlo ahí también para que el bordó llegue
       realmente hasta el borde de la ventana, como en la referencia. */
    .inicio-page { min-height: 100%; }
    :host { display: block; }
    :host.inicio-preview .inicio-layout { grid-template-columns: minmax(280px, 30%) 1fr; min-height: 730px; }
    :host.inicio-preview .inicio-welcome { padding: 3rem 2.5rem; }
    :host.inicio-preview .inicio-dashboard-inner { padding: 2.5rem; }
    :host.inicio-preview .academic-progress-card { grid-template-columns: 1fr auto auto; }
    :host.inicio-preview .academic-progress-link { grid-column: auto; border-top: 0; padding-top: 0; }
    :host.inicio-preview .tarea-row { flex-direction: row; align-items: center; }
    :host.inicio-preview .tarea-row-fecha { margin-left: 1rem; }
    :host.inicio-preview .inicio-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    :host.inicio-preview h1 { font-size: 3.75rem; }
    .inicio-loading { padding: 2rem; }

    .inicio-layout {
      display: grid;
      grid-template-columns: minmax(280px, 30%) 1fr;
      min-height: 100vh;
    }

    .inicio-welcome {
      background: linear-gradient(160deg, #6E1F2B 0%, #5A1621 100%);
      padding: 3rem 2.5rem;
      display: flex;
      align-items: flex-start;
    }
    .inicio-welcome-divider { width: 2.5rem; height: 2px; background: #F0C9BC; margin-top: 0.85rem; opacity: 0.7; }
    .inicio-quick-actions { display: flex; flex-direction: column; gap: .55rem; margin-top: 2.5rem; }
    .inicio-quick-actions a { width: fit-content; padding: .6rem .8rem; border: 1px solid rgba(241,222,225,.3); border-radius: .65rem; color: #fffefa; font-size: .72rem; text-decoration: none; background: rgba(255,255,255,.08); }
    .inicio-quick-actions a:hover { background: rgba(255,255,255,.16); transform: translateX(3px); }

    .inicio-dashboard { min-width: 0; background: var(--bg); display: flex; }
    .inicio-dashboard-inner {
      padding: 2.5rem 2.5rem;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stat-card { @apply bg-[#FFFEFA] border border-[#D9D3C2] rounded-lg p-6 text-center hover:bg-[#EFEBDF] transition-colors block; }
    .stat-card--success { background: linear-gradient(145deg, #FFFEFA, #F1F7EE); }
    .academic-progress-card { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 1.25rem; background: linear-gradient(120deg, #fffefa, #f7efe5); border: 1px solid #d9d3c2; border-radius: .75rem; padding: 1.25rem 1.5rem; box-shadow: var(--shadow-soft); animation: softPop 500ms var(--ease-out) both; }
    .dashboard-eyebrow { color: #a69577; font: 600 .65rem 'JetBrains Mono', monospace; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 .25rem; }
    .academic-progress-copy h2 { color: #3a2a22; font: 700 1.25rem var(--font-display); }
    .academic-progress-copy > p:last-child { color: #7a6f66; font-size: .78rem; margin-top: .25rem; }
    .academic-progress-ring { --progress: 0%; width: 4.5rem; height: 4.5rem; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(#3f6b4a var(--progress), #e5dfd3 0); position: relative; }
    .academic-progress-ring::before { content: ''; position: absolute; inset: .42rem; background: #fffefa; border-radius: 50%; }
    .academic-progress-ring span { position: relative; color: #3f6b4a; font: 700 1.1rem var(--font-display); }
    .academic-progress-ring small { font: .65rem var(--font-body); }
    .academic-progress-link { color: #6e1f2b; font-size: .75rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .academic-progress-link:hover { transform: translateX(3px); }
    .weekly-overview { padding: 1.25rem; background: var(--card-strong); border: 1px solid var(--border); border-radius: .9rem; }
    .weekly-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .weekly-heading h2 { font: 700 1.2rem var(--font-display); }
    .weekly-summary { margin: .25rem 0 0; color: var(--muted); font-size: .75rem; }
    .weekly-calendar-link { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: .65rem; background: var(--bg-subtle); color: var(--accent); }
    .weekly-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .3rem; padding-bottom: 1.25rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border); }
    .weekly-day { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .35rem; min-width: 0; min-height: 4.5rem; padding: .55rem .1rem; border: 1px solid transparent; border-radius: .65rem; background: var(--bg-subtle); color: var(--ink); cursor: pointer; }
    .weekly-day:hover { border-color: var(--accent-border); }
    .weekly-day.is-selected { background: var(--accent); color: #fff; }
    .weekly-day-label { color: var(--muted); font-size: .65rem; }
    .is-selected .weekly-day-label { color: inherit; }
    .weekly-day strong { font-size: .95rem; }
    .weekly-day-dot { width: .3rem; height: .3rem; border-radius: 50%; background: var(--warning-text); visibility: hidden; }
    .weekly-day-dot.has-tasks { visibility: visible; }
    .is-selected .weekly-day-dot { background: #f0c9bc; }
    .weekly-footer-link { display: flex; justify-content: center; gap: .5rem; margin-top: 1.1rem; color: var(--accent); font-size: .75rem; text-decoration: none; }
    @media (max-width: 480px) { .weekly-overview { padding: 1rem .75rem; } }

    .tarea-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      text-align: left;
      padding: 0.85rem 1.1rem;
      background-color: #EFEBDF;
      border-radius: 0.6rem;
      border: 1px solid #D9D3C2;
      transition: background-color 0.15s ease;
    }
    .tarea-row:hover { background-color: #E3DCC8; }
    .tarea-row-nombre {
      font-weight: 700;
      color: #3A2A22;
      font-size: 0.95rem;
    }
    .tarea-row-fecha {
      font-size: 0.75rem;
      color: #B3401A;
      white-space: nowrap;
      margin-left: 1rem;
    }

    @media (max-width: 767px) {
      .inicio-layout { grid-template-columns: 1fr; min-height: auto; }
      .inicio-welcome { padding: 2rem 1.5rem; }
      .inicio-dashboard-inner { padding: 1.5rem 1.25rem; }
      .academic-progress-card { grid-template-columns: 1fr auto; }
      .academic-progress-link { grid-column: 1 / -1; border-top: 1px solid #e5dfd3; padding-top: .75rem; }
      .tarea-row { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
      .tarea-row-fecha { margin-left: 0; }
    }
  `,
})
export class InicioComponent implements OnInit {
  /** Reutiliza el panel real en la portada, sin consultar ni modificar datos del usuario. */
  readonly vistaPrevia = input(false);
  private readonly tareasService = inject(TareasService);
  private readonly materiasService = inject(MateriasService);
  private readonly authService = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tareas = signal<Tarea[]>([]);
  protected readonly materias = signal<Materia[]>([]);
  protected readonly tareaSeleccionada = signal<Tarea | null>(null);
  protected readonly calendarIcon = LucideCalendarDays;
  protected readonly fechaSemanaSeleccionada = signal(new Date(new Date().setHours(0, 0, 0, 0)));
  protected readonly diasSemanaIniciales = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  protected readonly hoy = new Date();
  protected readonly materiasAprobadas = computed(() => this.materias().filter((m) => m.estado === EstadoMateria.APROBADO).length);
  protected readonly porcentajeAprobadas = computed(() => {
    const total = this.materias().length;
    return total === 0 ? 0 : Math.round((this.materiasAprobadas() / total) * 100);
  });
  private readonly diasSemanaLabels = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  protected readonly tareasPendientes = computed(() =>
    this.tareas().filter((t) => t.estado !== EstadoTarea.HECHA)
  );

  protected readonly tareasPendientesOrdenadas = computed(() =>
    [...this.tareasPendientes()].sort((a, b) => {
      if (!a.fechaLimite) return 1;
      if (!b.fechaLimite) return -1;
      return new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime();
    })
  );

  protected readonly tareasVencidas = computed(() => {
    const ahora = new Date();
    return this.tareasPendientes().filter((t) => t.fechaLimite && new Date(t.fechaLimite) < ahora);
  });

  protected readonly proximaTarea = computed(() => {
    const ahora = new Date();
    const conFecha = this.tareasPendientes()
      .filter((t) => t.fechaLimite && new Date(t.fechaLimite) >= ahora)
      .sort((a, b) => new Date(a.fechaLimite!).getTime() - new Date(b.fechaLimite!).getTime());
    return conFecha[0] ?? null;
  });

  protected readonly semana = computed<DiaSemana[]>(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const offset = (base.getDay() + 6) % 7; // lunes = 0
    const lunes = new Date(base);
    lunes.setDate(base.getDate() - offset);

    const tareas = this.tareas();
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + i);
      const tareasDelDia = tareas.filter((t) => {
        if (!t.fechaLimite) return false;
        const f = new Date(t.fechaLimite);
        // Mismo criterio que el calendario: fechaLimite viaja en UTC medianoche,
        // por eso comparamos con los getters UTC contra la fecha local del día.
        return (
          f.getUTCFullYear() === fecha.getFullYear() &&
          f.getUTCMonth() === fecha.getMonth() &&
          f.getUTCDate() === fecha.getDate()
        );
      });
      return {
        fecha,
        label: this.diasSemanaLabels[i],
        tareas: tareasDelDia,
        esHoy: fecha.getTime() === base.getTime(),
      };
    });
  });

  protected readonly diaSemanaSeleccionado = computed(() => this.semana().find((dia) =>
    dia.fecha.getTime() === this.fechaSemanaSeleccionada().getTime()) ?? this.semana().find((dia) => dia.esHoy)!);
  protected readonly tareasSemanaPendientes = computed(() => this.semana().reduce((total, dia) =>
    total + dia.tareas.filter((tarea) => tarea.estado !== EstadoTarea.HECHA).length, 0));

  protected readonly saludo = computed(() => {
    if (this.vistaPrevia()) return 'Hola, Seba';
    const nombre = this.authService.currentUserName();
    return nombre ? `Hola, ${nombre}` : 'Hola';
  });

  protected readonly resumen = computed(() => {
    const pendientes = this.tareasPendientes().length;
    const proxima = this.proximaTarea();
    if (pendientes === 0) return 'No tenés tareas pendientes por ahora.';
    if (!proxima) return `Tenés ${pendientes} ${pendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'}.`;
    const esHoy = this.esMismoDia(new Date(proxima.fechaLimite!), new Date());
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const esManiana = this.esMismoDia(new Date(proxima.fechaLimite!), manana);
    const cuando = esHoy ? 'vence hoy' : esManiana ? 'vence mañana' : 'vence pronto';
    return `Tenés ${pendientes} ${pendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'} y "${proxima.titulo}" ${cuando}.`;
  });

  ngOnInit(): void {
    if (this.vistaPrevia()) {
      this.cargarEjemplo();
      return;
    }
    this.cargar();
  }

  private cargarEjemplo(): void {
    const materias: Materia[] = ['Programación II', 'Bases de Datos', 'Álgebra', 'Redes', 'Sistemas', 'Inglés'].map((nombre, index) => ({
      id: `demo-materia-${index}`, nombre, anioCursado: 2,
      cuatrimestre: Cuatrimestre.SEGUNDO, usuarioId: 'demo',
      estado: index < 2 ? EstadoMateria.APROBADO : EstadoMateria.REGULAR,
    }));
    const ejemplos = [
      { titulo: 'Entrega TP de Programación', dias: 0, materia: 0, tipo: TipoTarea.TP },
      { titulo: 'Parcial de Bases de Datos', dias: 2, materia: 1, tipo: TipoTarea.EXAMEN },
      { titulo: 'Práctica de Álgebra', dias: 4, materia: 2, tipo: TipoTarea.TAREA },
    ];
    this.materias.set(materias);
    this.tareas.set(ejemplos.map((ejemplo, index) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + ejemplo.dias);
      const limite = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59));
      return {
        id: `demo-tarea-${index}`, titulo: ejemplo.titulo, descripcion: null,
        materia: materias[ejemplo.materia], tipo: ejemplo.tipo,
        estado: EstadoTarea.PENDIENTE, fechaLimite: limite.toISOString(),
        recordatorioMinutos: 1440, origen: OrigenTarea.IA_CHAT, fechaCreacion: new Date().toISOString(),
      };
    }));
    this.cargando.set(false);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.materiasService.listar().subscribe({
      next: (materias) => this.materias.set(materias),
      error: () => this.materias.set([]),
    });
    this.tareasService.listar().subscribe({
      next: (tareas) => {
        this.tareas.set(tareas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar tu resumen.');
        this.cargando.set(false);
      },
    });
  }

  protected seleccionarTarea(t: Tarea): void {
    this.tareaSeleccionada.set(t);
  }

  protected cerrarDetalle(): void {
    this.tareaSeleccionada.set(null);
  }

  private esMismoDia(a: Date, b: Date): boolean {
    return a.getUTCFullYear() === b.getFullYear() && a.getUTCMonth() === b.getMonth() && a.getUTCDate() === b.getDate();
  }
}
