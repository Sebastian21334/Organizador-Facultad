import { Component, OnInit, signal, inject } from '@angular/core';
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
      <header class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-slate-800">Calendario</h1>
        <div class="flex items-center gap-2">
          <button (click)="mesAnterior()" class="px-3 py-1.5 text-sm rounded-md border border-slate-200 hover:bg-slate-100">←</button>
          <span class="text-sm font-medium text-slate-700 min-w-[160px] text-center">
            {{ mesActual() | date: 'MMMM yyyy' : undefined : 'es-AR' }}
          </span>
          <button (click)="mesSiguiente()" class="px-3 py-1.5 text-sm rounded-md border border-slate-200 hover:bg-slate-100">→</button>
        </div>
      </header>

      @if (cargando()) {
        <app-loader mensaje="Cargando tareas del calendario..." />
      } @else if (error()) {
        <app-error [mensaje]="error()" />
      } @else {
        <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
          @for (d of diasSemana; track d) {
            <div class="py-2">{{ d }}</div>
          }
        </div>
        <div class="grid grid-cols-7 gap-1">
          @for (dia of dias(); track dia.fecha.getTime()) {
            <div
              class="min-h-[96px] p-1.5 rounded-md border text-xs transition-colors"
              [class]="dia.esDelMesActual ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 text-slate-400'"
              [class.border-blue-300]="dia.esHoy"
              [class.bg-blue-50]="dia.esHoy"
            >
              <div class="font-medium mb-1" [class.text-blue-600]="dia.esHoy">
                {{ dia.fecha | date: 'd' }}
              </div>
              <div class="space-y-1">
                @for (t of dia.tareas; track t.id) {
                  <button
                    (click)="seleccionarTarea(t)"
                    class="block w-full text-left px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 truncate"
                    [title]="t.titulo"
                  >
                    {{ t.titulo }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (tareaSeleccionada()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="cerrarDetalle()">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-3" (click)="$event.stopPropagation()">
            <div class="flex items-start justify-between">
              <h2 class="text-lg font-semibold text-slate-800">{{ tareaSeleccionada()!.titulo }}</h2>
              <button (click)="cerrarDetalle()" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <app-tarea-badge [tipo]="tareaSeleccionada()!.tipo" [estado]="tareaSeleccionada()!.estado" />
            </div>
            <dl class="text-sm space-y-1.5">
              <div>
                <dt class="text-slate-500 inline">Materia: </dt>
                <dd class="inline text-slate-800">{{ tareaSeleccionada()!.materia?.nombre ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-slate-500 inline">Fecha límite: </dt>
                <dd class="inline text-slate-800">{{ tareaSeleccionada()!.fechaLimite ? (tareaSeleccionada()!.fechaLimite | date: 'medium' : 'UTC' : 'es-AR') : '—' }}</dd>
              </div>
              <div>
                <dt class="text-slate-500 inline">Descripción: </dt>
                <dd class="inline text-slate-800">{{ tareaSeleccionada()!.descripcion ?? '—' }}</dd>
              </div>
            </dl>
          </div>
        </div>
      }
    </div>
  `,
})
export class CalendarioComponent implements OnInit {
  private readonly tareasService = inject(TareasService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly dias = signal<DiaCalendario[]>([]);
  protected readonly mesActual = signal(new Date());
  protected readonly tareaSeleccionada = signal<Tarea | null>(null);

  protected readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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
