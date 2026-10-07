import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { TareasService } from '../tareas/tareas.service';
import { Tarea, TipoTarea, EstadoTarea } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader.component';
import { ErrorComponent } from '../../shared/components/error.component';
import { TareaBadgeComponent } from '../../shared/components/tarea-badge.component';
import { RouterLink } from '@angular/router';
import { TareaCalendarioDialogComponent } from './tarea-calendario-dialog.component';

interface DiaCalendario {
  fecha: Date;
  tareas: Tarea[];
  esDelMesActual: boolean;
  esHoy: boolean;
}

@Component({
  selector: 'app-calendario',
  imports: [CommonModule, LoaderComponent, ErrorComponent, TareaBadgeComponent, RouterLink, TareaCalendarioDialogComponent],
  template: `
    <div class="calendario-page">
      <h1 class="title-bar">Calendario</h1>
      <div class="calendario-content">
      <header class="calendar-heading">
        <div>
          <span class="calendar-eyebrow">PLANIFICACIÓN</span>
          <p>Organiza tus fechas importantes</p>
        </div>
        <div class="calendar-actions">
          <div class="view-toggle" aria-label="Vista del calendario">
            <button type="button" [class.active]="vista() === 'mes'" (click)="cambiarVista('mes')">Mes</button>
            <button type="button" [class.active]="vista() === 'semana'" (click)="cambiarVista('semana')">Semana</button>
          </div>
          <a routerLink="/tareas" class="new-task">＋ Nueva tarea</a>
        </div>
      </header>

      <div class="calendar-layout">
      <main class="calendar-main">
        <div class="calendar-toolbar">
          <button (click)="periodoAnterior()" [attr.aria-label]="vista() === 'mes' ? 'Mes anterior' : 'Semana anterior'">‹</button>
          <strong>{{ periodoLabel() }}</strong>
          <button (click)="periodoSiguiente()" [attr.aria-label]="vista() === 'mes' ? 'Mes siguiente' : 'Semana siguiente'">›</button>
          <button class="today-button" (click)="irAHoy()">Hoy</button>
        </div>

      @if (cargando()) {
        <app-loader mensaje="Cargando tareas del calendario..." />
      } @else if (error()) {
        <app-error [mensaje]="error()" />
      } @else {
        <div class="dias-semana-header grid grid-cols-7 text-center text-[11px] font-mono uppercase tracking-wide">
          @for (d of diasSemana; track d; let i = $index) {
            <div class="py-2.5 flex items-center justify-center gap-1.5">
              <span class="dia-punto" [class.punto-bordo]="i % 3 === 0" [class.punto-oscuro]="i % 3 === 1" [class.punto-muted]="i % 3 === 2"></span>
              <span class="dia-nombre-largo">{{ d }}</span>
              <span class="dia-nombre-corto">{{ diasSemanaCortos[i] }}</span>
            </div>
          }
        </div>
        <div class="calendar-grid grid grid-cols-7" [class.week-view]="vista() === 'semana'">
          @for (dia of dias(); track dia.fecha.getTime(); let i = $index) {
            <div
              class="calendar-cell min-h-[96px] p-1.5 text-xs transition-colors"
              [style.--calendar-delay]="(i % 7) * 25 + 'ms'"
              [class]="dia.esDelMesActual ? 'bg-[#FFFEFA] border-[#D9D3C2]' : 'bg-[#F5F2E9] border-[#EFEBDF] text-[#A39C87]'"
              [class.hoy-borde]="dia.esHoy"
              [class.hoy-fondo]="dia.esHoy"
            >
              <div class="font-medium mb-1" [class.hoy-texto]="dia.esHoy">
                {{ dia.fecha | date: 'd' }}
              </div>
              <div class="space-y-1">
                @for (t of dia.tareas; track t.id) {
                  <button
                    type="button"
                    [class.tarea-hecha]="t.estado === estadoHecha"
                    [attr.aria-label]="t.titulo + (t.estado === estadoHecha ? ': hecha. Editar tarea' : ': editar tarea')"
                    (click)="seleccionarTarea(t)"
                    class="block w-full text-left px-1.5 py-1 rounded bg-[#EFEBDF] hover:bg-[#D9D3C2] truncate"
                    [title]="t.titulo"
                  >
                    {{ t.titulo }}
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <section class="month-tasks">
          <h2>{{ tituloFechas() }}</h2>
          @if (tareasDelMes().length === 0) {
            <p class="text-sm text-[#7A6B57] mt-3">No hay tareas cargadas para este mes.</p>
          } @else {
            <div class="mt-3 divide-y divide-[#D8CBAE]">
              @for (t of tareasDelMes(); track t.id) {
                <button type="button" class="month-task" (click)="seleccionarTarea(t)">
                  <span class="month-task-date">{{ t.fechaLimite | date: 'd MMM' : 'UTC' : 'es-AR' }}</span>
                  <span class="month-task-copy">
                    <strong>{{ t.titulo }}</strong>
                    <small>{{ t.materia?.nombre ?? 'Sin materia' }}</small>
                  </span>
                  <app-tarea-badge [tipo]="t.tipo" [estado]="t.estado" />
                </button>
              }
            </div>
          }
        </section>
      }

      @if (tareaSeleccionada(); as tarea) {
        <app-tarea-calendario-dialog [tarea]="tarea" (cancelada)="cerrarDetalle()" (actualizada)="tareaActualizada()" />
      }
      </main>
      <aside class="upcoming-panel">
        <section class="upcoming-section" aria-labelledby="proximas-title">
        <div class="upcoming-title"><h2 id="proximas-title">Próximas fechas</h2><span>{{ tareasPendientes().length }} pendientes</span></div>
        @for (t of tareasPendientes().slice(0, 3); track t.id) {
          <button class="upcoming-card" (click)="seleccionarTarea(t)">
            <span class="upcoming-date">{{ t.fechaLimite | date: 'd' : 'UTC' }}<small>{{ t.fechaLimite | date: 'MMM' : 'UTC' : 'es-AR' }}</small></span>
            <span class="upcoming-copy"><strong>{{ t.titulo }}</strong><small>{{ t.materia?.nombre ?? 'Sin materia' }}</small><em>{{ t.tipo }}</em></span>
          </button>
        } @empty { <p class="empty-upcoming">No hay próximas fechas pendientes.</p> }
        </section>
        <section class="overdue-section" aria-labelledby="vencidas-title">
          <div class="upcoming-title"><h2 id="vencidas-title">Fechas vencidas</h2><span>{{ tareasVencidas().length }} pendientes</span></div>
          <div class="overdue-list">
            @for (t of tareasVencidas(); track t.id) {
              <button type="button" class="upcoming-card overdue-card" (click)="seleccionarTarea(t)">
                <span class="upcoming-date">{{ t.fechaLimite | date: 'd' : 'UTC' }}<small>{{ t.fechaLimite | date: 'MMM' : 'UTC' : 'es-AR' }}</small></span>
                <span class="upcoming-copy"><strong>{{ t.titulo }}</strong><small>{{ t.materia?.nombre ?? 'Sin materia' }}</small><em>Vencida · {{ t.tipo }}</em></span>
              </button>
            } @empty { <p class="empty-upcoming">No hay tareas vencidas pendientes.</p> }
          </div>
        </section>
        <a routerLink="/tareas" class="all-tasks">Ver todas las tareas →</a>
      </aside>
      </div>
      </div>
    </div>
  `,
  styles: `
    .tarea-hecha { text-decoration: line-through; opacity: .65; }
    .calendario-page { min-height: 100%; }
    .calendario-content { padding: 0 1.25rem 2.5rem; }
    .dias-semana-header {
      background: #EFEBDF;
      border: 1px solid #D9D3C2;
      border-radius: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .hoy-borde { border-color: #6E1F2B; border-width: 2px; }
    .hoy-fondo { background-color: #F1DEE1; }
    .hoy-texto { color: #6E1F2B; }
    .month-tasks { background: #FAF6EE; border: 1px solid #D8CBAE; border-radius: 0.65rem; padding: 1.1rem; }
    .month-task { display: flex; align-items: center; gap: 0.85rem; width: 100%; padding: 0.8rem 0; text-align: left; }
    .month-task:hover { background: #F1DEE1; }
    .month-task-date { width: 3.5rem; flex: 0 0 auto; color: #6E1F2B; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; text-transform: uppercase; }
    .month-task-copy { display: grid; gap: 0.15rem; min-width: 0; flex: 1; }
    .month-task-copy strong { color: #3A2A22; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .month-task-copy small { color: #7A6B57; font-size: 0.7rem; }
    .dia-punto { width: 0.35rem; height: 0.35rem; border-radius: 50%; display: inline-block; }
    .punto-bordo { background: #6E1F2B; }
    .punto-oscuro { background: #7A6B57; }
    .punto-muted { background: #A69577; }
    .dia-nombre-corto { display: none; }
    .calendar-heading { display:flex; justify-content:space-between; align-items:end; gap:1rem; padding:1.4rem .4rem 1.2rem; }
    .calendar-eyebrow { color:#8c8570; font:600 .72rem/1 'JetBrains Mono',monospace; letter-spacing:.16em; }
    .calendar-heading h1 { margin:.45rem 0 .15rem; color:#3a2a22; font:700 2.25rem/1 'Fraunces',Georgia,serif; }
    .calendar-heading p { margin:0; color:#7a6f66; font-size:.95rem; }
    .calendar-actions { display:flex; align-items:center; gap:1rem; }
    .view-toggle { display:flex; padding:.2rem; background:#efebe1; border:1px solid #d9d3c2; border-radius:.55rem; }
    .view-toggle button { border:0; color:#7a6f66; background:transparent; padding:.55rem 1.1rem; border-radius:.4rem; }
    .view-toggle .active { background:#6e1f2b; color:#fff; }
    .new-task { background:#6e1f2b; color:#fff; border-radius:.55rem; padding:.72rem 1rem; text-decoration:none; font-weight:600; }
    .calendar-layout { display:grid; grid-template-columns:minmax(0,1fr) 350px; gap:1rem; }
    .calendar-main,.upcoming-panel { background:#fffefa; border:1px solid #d9d3c2; border-radius:.7rem; padding:1rem; }
    .calendar-toolbar { display:flex; align-items:center; gap:.8rem; margin-bottom:1rem; }
    .calendar-toolbar button { width:2.3rem;height:2.3rem;border:1px solid #d9d3c2;border-radius:.5rem;background:#faf6ee;color:#5b5748;font-size:1.5rem; }
    .calendar-toolbar strong { color:#3a2a22; font:700 1.25rem 'Fraunces',Georgia,serif; min-width:170px; text-transform:capitalize; }
    .calendar-toolbar .today-button { margin-left:.25rem; font-size:.8rem; width:auto; padding:0 .8rem; }
    .dias-semana-header { border:0; background:transparent; color:#7a6f66; margin:0; }
    .dias-semana-header > div { padding:.65rem .2rem; }
    .calendar-grid { border:1px solid #d9d3c2; border-radius:.45rem; overflow:hidden; }
    .calendar-cell { min-height:92px; border-right:1px solid #d9d3c2; border-bottom:1px solid #d9d3c2; background:#fffefa; color:#3a2a22; border-radius:0!important; }
    .calendar-cell:nth-child(7n) { border-right:0; }
    .week-view .calendar-cell { min-height:260px; }
    .calendar-cell[class*="F5F2E9"] { background:#f5f2e9; color:#a39c87; }
    .hoy-borde { border:2px solid #6e1f2b!important; }
    .hoy-fondo { background:#f1dee1!important; }
    .hoy-texto { color:#6e1f2b; }
    .upcoming-panel { padding:1.1rem; }
    .overdue-section { margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border); }
    .overdue-list { max-height:24rem; overflow-y:auto; }
    .overdue-card { border-left:3px solid var(--error-text); }
    .upcoming-title { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; }
    .upcoming-title h2 { margin:0; color:#3a2a22; font:700 1.2rem 'Fraunces',Georgia,serif; }
    .upcoming-title span { color:#8c8570; font-size:.75rem; }
    .upcoming-card { display:flex; width:100%; text-align:left; padding:0; margin-bottom:.65rem; overflow:hidden; border:1px solid #d9d3c2; border-radius:.65rem; background:#faf6ee; color:#3a2a22; }
    .upcoming-date { display:flex; flex-direction:column; align-items:center; justify-content:center; width:4rem; background:#efebe1; color:#6e1f2b; font-size:1.25rem; font-weight:700; }
    .upcoming-date small { font-size:.65rem; text-transform:uppercase; }
    .upcoming-copy { display:grid; gap:.25rem; padding:.8rem; min-width:0; }
    .upcoming-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .upcoming-copy small { color:#7a6f66; }
    .upcoming-copy em { justify-self:start; font-style:normal; font-size:.65rem; color:#6e1f2b; background:#f3dfe2; border:1px solid #e2c2c7; border-radius:.3rem; padding:.18rem .42rem; }
    .all-tasks { display:block; text-align:center; padding:1rem 0; color:#6e1f2b; border-top:1px solid #d9d3c2; text-decoration:none; font-size:.85rem; }
    .empty-upcoming { color:#7a6f66; font-size:.85rem; padding:1rem 0; }
    :host-context(.dark) .calendar-eyebrow { color:#8793aa; }
    :host-context(.dark) .calendar-heading h1,
    :host-context(.dark) .calendar-toolbar strong,
    :host-context(.dark) .upcoming-title h2 { color:#f4f6fb; }
    :host-context(.dark) .calendar-heading p,
    :host-context(.dark) .upcoming-title span,
    :host-context(.dark) .upcoming-copy small,
    :host-context(.dark) .empty-upcoming { color:#9aa6b8; }
    :host-context(.dark) .view-toggle,
    :host-context(.dark) .calendar-main,
    :host-context(.dark) .upcoming-panel { background:linear-gradient(145deg,#171d25,#121820); border-color:#2d3745; }
    :host-context(.dark) .view-toggle button { color:#9aa5b6; }
    :host-context(.dark) .view-toggle .active,
    :host-context(.dark) .new-task { background:linear-gradient(135deg,#8794ff,#6574e8); color:#fff; }
    :host-context(.dark) .calendar-toolbar button { border-color:#344052; background:#202936; color:#dce1ff; }
    :host-context(.dark) .dias-semana-header { color:#98a1b0; }
    :host-context(.dark) .calendar-grid { border-color:#2f3845; }
    :host-context(.dark) .calendar-cell { border-color:#2f3845; background:#131922; color:#dce1ea; }
    :host-context(.dark) .calendar-cell[class*="F5F2E9"] { background:#0f141c; color:#667180; }
    :host-context(.dark) .hoy-borde { border-color:#8794ff!important; }
    :host-context(.dark) .hoy-fondo { background:#232b43!important; }
    :host-context(.dark) .hoy-texto { color:#aab2ff; }
    :host-context(.dark) .upcoming-card { border-color:#303a48; background:#19212b; color:#fff; }
    :host-context(.dark) .upcoming-date { background:#202936; color:#8794ff; }
    :host-context(.dark) .upcoming-copy em { color:#b9c0ff; background:#252d48; border-color:#46528d; }
    :host-context(.dark) .all-tasks { color:#9da7ff; border-color:#2d3745; }
    @media (max-width: 900px) { .calendar-layout { grid-template-columns:1fr; } .upcoming-panel { order:2; } }
    @media (max-width: 600px) { .calendar-heading { align-items:flex-start; flex-direction:column; } .calendar-actions { width:100%; justify-content:space-between; } .calendar-heading h1 { font-size:1.9rem; } .calendar-cell { min-height:70px; } .week-view .calendar-cell { min-height:150px; } }
    @media (max-width: 480px) {
      .calendario-content { padding: 0 .75rem 1.5rem; }
      .dias-semana-header > div { gap: 0.15rem; }
      .dia-nombre-largo { display: none; }
      .dia-nombre-corto { display: inline; }
    }
  `,
})
export class CalendarioComponent implements OnInit {
  private readonly tareasService = inject(TareasService);
  private readonly ahora = signal(new Date());

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly dias = signal<DiaCalendario[]>([]);
  protected readonly mesActual = signal(new Date());
  protected readonly vista = signal<'mes' | 'semana'>('mes');
  protected readonly estadoHecha = EstadoTarea.HECHA;
  protected readonly tareaSeleccionada = signal<Tarea | null>(null);

  protected readonly diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  protected readonly diasSemanaCortos = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  protected readonly tareasMes = signal<Tarea[]>([]);
  protected readonly tareasDelMes = computed(() => [...this.tareasMes()].sort((a, b) => new Date(a.fechaLimite!).getTime() - new Date(b.fechaLimite!).getTime()));
  private readonly inicioHoy = computed(() => {
    const ahora = this.ahora();
    // Calendar dates use UTC fields, but today is the user's local calendar day.
    return Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  });
  protected readonly tareasPendientes = computed(() => this.tareasDelMes().filter((t) =>
    t.estado !== EstadoTarea.HECHA && !!t.fechaLimite && new Date(t.fechaLimite).getTime() >= this.inicioHoy(),
  ));
  protected readonly tareasVencidas = computed(() => this.tareasDelMes().filter((t) =>
    t.estado !== EstadoTarea.HECHA && !!t.fechaLimite && new Date(t.fechaLimite).getTime() < this.inicioHoy(),
  ));
  protected readonly periodoLabel = computed(() => {
    const base = this.mesActual();
    if (this.vista() === 'mes') {
      return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(base);
    }
    const inicio = this.inicioDeSemana(base);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    const formato = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
    return `${formato.format(inicio)} – ${formato.format(fin)}`;
  });
  protected readonly tituloFechas = computed(() => {
    if (this.vista() === 'semana') return 'Fechas de la semana';
    const mes = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(this.mesActual());
    return `Fechas de ${mes}`;
  });

  constructor() {
    // Recompute upcoming dates when the day changes, even if the page stays open.
    interval(60_000).pipe(takeUntilDestroyed()).subscribe(() => this.ahora.set(new Date()));
  }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    const mesActual = this.mesActual();
    const inicioLocal = this.vista() === 'mes'
      ? new Date(mesActual.getFullYear(), mesActual.getMonth(), 1)
      : this.inicioDeSemana(mesActual);
    const desde = new Date(Date.UTC(inicioLocal.getFullYear(), inicioLocal.getMonth(), inicioLocal.getDate()));
    const hasta = this.vista() === 'mes'
      ? new Date(Date.UTC(mesActual.getFullYear(), mesActual.getMonth() + 1, 1) - 1)
      : new Date(desde.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    this.tareasService.listarCalendario(desde, hasta).subscribe({
      next: (tareas: Tarea[]) => {
        this.tareasMes.set(tareas.filter((t) => {
          if (!t.fechaLimite) return false;
          if (this.vista() === 'semana') return true;
          const fecha = new Date(t.fechaLimite);
          return fecha.getUTCFullYear() === mesActual.getFullYear() && fecha.getUTCMonth() === mesActual.getMonth();
        }));
        this.construirPeriodo(tareas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las tareas del calendario.');
        this.cargando.set(false);
      },
    });
  }

  private construirPeriodo(tareas: Tarea[]): void {
    const base = this.mesActual();
    const inicio = this.vista() === 'mes'
      ? this.inicioDeSemana(new Date(base.getFullYear(), base.getMonth(), 1))
      : this.inicioDeSemana(base);

    const celdas: DiaCalendario[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const cantidadDias = this.vista() === 'mes' ? 42 : 7;
    for (let i = 0; i < cantidadDias; i++) {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + i);
      const tareasDelDia = tareas.filter((t) => {
        if (!t.fechaLimite) return false;
        const f = new Date(t.fechaLimite);
        // Usamos los getters UTC porque fechaLimite viaja como medianoche UTC
        // (ej: 2026-08-28T00:00:00.000Z). Si se leyera con getFullYear/getMonth/getDate
        // "normales", Angular los interpreta en horario local (UTC-3 en Argentina)
        // y la fecha se corre un día para atrás. Esto mantiene el día "real" que
        // calculó el backend/la IA, sin que el timezone del navegador lo afecte.
        return (
          f.getUTCFullYear() === fecha.getFullYear() &&
          f.getUTCMonth() === fecha.getMonth() &&
          f.getUTCDate() === fecha.getDate()
        );
      });
      celdas.push({
        fecha,
        tareas: tareasDelDia,
        esDelMesActual: this.vista() === 'semana' || fecha.getMonth() === base.getMonth(),
        esHoy: fecha.getTime() === hoy.getTime(),
      });
    }
    this.dias.set(celdas);
  }

  protected periodoAnterior(): void {
    const d = new Date(this.mesActual());
    if (this.vista() === 'mes') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    this.mesActual.set(d);
    this.cargar();
  }

  protected periodoSiguiente(): void {
    const d = new Date(this.mesActual());
    if (this.vista() === 'mes') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    this.mesActual.set(d);
    this.cargar();
  }

  protected irAHoy(): void {
    this.mesActual.set(new Date());
    this.cargar();
  }

  protected cambiarVista(vista: 'mes' | 'semana'): void {
    if (this.vista() === vista) return;
    this.vista.set(vista);
    this.cargar();
  }

  private inicioDeSemana(fecha: Date): Date {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const offset = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - offset);
    return inicio;
  }

  protected seleccionarTarea(t: Tarea): void {
    this.tareaSeleccionada.set(t);
  }

  protected tareaActualizada(): void {
    this.cerrarDetalle();
    this.cargar();
  }

  protected cerrarDetalle(): void {
    this.tareaSeleccionada.set(null);
  }
}
