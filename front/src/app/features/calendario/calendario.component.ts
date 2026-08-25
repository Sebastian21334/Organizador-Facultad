import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TareasService } from '../tareas/tareas.service';
import { Tarea, TipoTarea, EstadoTarea } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader.component';
import { ErrorComponent } from '../../shared/components/error.component';
import { TareaBadgeComponent } from '../../shared/components/tarea-badge.component';

interface DiaCalendario {
  fecha: Date;
  tareas: Tarea[];
  esDelMesActual: boolean;
  esHoy: boolean;
}

@Component({
  selector: 'app-calendario',
  imports: [CommonModule, LoaderComponent, ErrorComponent, TareaBadgeComponent],
  template: `
    <div class="space-y-4">
      <h1 class="title-bar">Calendario</h1>
      <header class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button (click)="mesAnterior()" class="px-3 py-1.5 text-sm rounded-md border border-[#D9D3C2] hover:bg-[#EFEBDF]">←</button>
          <span class="text-xs font-mono uppercase tracking-wide text-[#5B5748] min-w-[160px] text-center">
            {{ mesActual() | date: 'MMMM yyyy' : undefined : 'es-AR' }}
          </span>
          <button (click)="mesSiguiente()" class="px-3 py-1.5 text-sm rounded-md border border-[#D9D3C2] hover:bg-[#EFEBDF]">→</button>
        </div>
      </header>

      @if (cargando()) {
        <app-loader mensaje="Cargando tareas del calendario..." />
      } @else if (error()) {
        <app-error [mensaje]="error()" />
      } @else {
        <div class="dias-semana-header grid grid-cols-7 gap-1 text-center text-[11px] font-mono uppercase tracking-wide text-[#5B5748]">
          @for (d of diasSemana; track d; let i = $index) {
            <div class="py-2.5 flex items-center justify-center gap-1.5">
              <span class="dia-punto" [class.punto-bordo]="i % 3 === 0" [class.punto-oscuro]="i % 3 === 1" [class.punto-muted]="i % 3 === 2"></span>
              <span>{{ d }}</span>
            </div>
          }
        </div>
        <div class="grid grid-cols-7 gap-1">
          @for (dia of dias(); track dia.fecha.getTime()) {
            <div
              class="min-h-[96px] p-1.5 rounded-md border text-xs transition-colors"
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
          <h2 class="text-xl font-display font-bold text-[#3A2A22]">Tareas de {{ mesActual() | date: 'MMMM' : undefined : 'es-AR' }}</h2>
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
          </div>
        </div>
      }
    </div>
  `,
  styles: `
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
  `,
})
export class CalendarioComponent implements OnInit {
  private readonly tareasService = inject(TareasService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly dias = signal<DiaCalendario[]>([]);
  protected readonly mesActual = signal(new Date());
  protected readonly tareaSeleccionada = signal<Tarea | null>(null);

  protected readonly diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  protected readonly tareasMes = signal<Tarea[]>([]);
  protected readonly tareasDelMes = computed(() => [...this.tareasMes()].sort((a, b) => new Date(a.fechaLimite!).getTime() - new Date(b.fechaLimite!).getTime()));

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    const mesActual = this.mesActual();
    const desde = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
    const hasta = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);

    this.tareasService.listarCalendario(desde, hasta).subscribe({
      next: (tareas: Tarea[]) => {
        this.tareasMes.set(tareas.filter((t) => {
          if (!t.fechaLimite) return false;
          const fecha = new Date(t.fechaLimite);
          return fecha.getUTCFullYear() === mesActual.getFullYear() && fecha.getUTCMonth() === mesActual.getMonth();
        }));
        this.construirMes(tareas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las tareas del calendario.');
        this.cargando.set(false);
      },
    });
  }

  private construirMes(tareas: Tarea[]): void {
    const base = this.mesActual();
    const primerDia = new Date(base.getFullYear(), base.getMonth(), 1);
    const inicio = new Date(primerDia);
    const offset = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - offset);

    const celdas: DiaCalendario[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
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
        esDelMesActual: fecha.getMonth() === base.getMonth(),
        esHoy: fecha.getTime() === hoy.getTime(),
      });
    }
    this.dias.set(celdas);
  }

  protected mesAnterior(): void {
    const d = new Date(this.mesActual());
    d.setMonth(d.getMonth() - 1);
    this.mesActual.set(d);
    this.cargar();
  }

  protected mesSiguiente(): void {
    const d = new Date(this.mesActual());
    d.setMonth(d.getMonth() + 1);
    this.mesActual.set(d);
    this.cargar();
  }

  protected seleccionarTarea(t: Tarea): void {
    this.tareaSeleccionada.set(t);
  }

  protected cerrarDetalle(): void {
    this.tareaSeleccionada.set(null);
  }
}