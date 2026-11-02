import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TareasService } from '../tareas/tareas.service';
import { EstadoTarea, Tarea } from '../../core/models';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog.service';

interface Objetivo { id: string; titulo: string; fecha: string; completado: boolean; tareaId: string | null; }
interface ObjetivoRecurrente { id: string; titulo: string; fechaInicio: string; fechasCompletadas: string[]; }
interface Dia { fecha: string; nombre: string; numero: string; }

function fechaArgentina(): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find(p => p.type === tipo)?.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}
function sumarDias(fecha: string, cantidad: number): string {
  const dia = new Date(`${fecha}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + cantidad);
  return dia.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-objetivos',
  imports: [FormsModule],
  templateUrl: './objetivos.component.html',
  styleUrl: './objetivos.component.css',
})
export class ObjetivosComponent {
  private readonly http = inject(HttpClient);
  private readonly tareasService = inject(TareasService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly hoy = fechaArgentina();
  readonly seleccionado = signal(this.hoy);
  readonly objetivos = signal<Objetivo[]>([]);
  readonly tareas = signal<Tarea[]>([]);
  readonly recurrentes = signal<ObjetivoRecurrente[]>([]);
  readonly recurrentesCargando = signal(true);
  readonly recurrentesError = signal(false);
  readonly recurrenteGuardando = signal(false);
  readonly tareasDisponibles = computed(() => this.tareas().filter(t => t.estado !== EstadoTarea.HECHA));
  readonly delDia = computed(() => this.objetivos().filter(o => o.fecha === this.seleccionado()));
  readonly completados = computed(() => this.delDia().filter(o => o.completado).length);
  readonly pendientesAnteriores = computed(() => this.objetivos().filter(o => !o.completado && o.fecha < this.hoy));
  readonly dias = computed<Dia[]>(() => {
    const seleccion = this.seleccionado();
    const diaSemana = new Date(`${seleccion}T12:00:00Z`).getUTCDay();
    const lunes = sumarDias(seleccion, -((diaSemana + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = sumarDias(lunes, i);
      const date = new Date(`${fecha}T12:00:00Z`);
      return { fecha, nombre: new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', ''), numero: new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date).replace('.', '') };
    });
  });
  readonly cargando = signal(true);
  readonly errorCarga = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly filtroMateria = signal('');
  readonly materias = computed(() => {
    const materias = this.tareas().flatMap(t => t.materia ? [t.materia] : []);
    return materias.filter((m, i) => materias.findIndex(otra => otra.id === m.id) === i);
  });
  titulo = '';
  fecha = this.hoy;
  tareaId = '';
  tituloRecurrente = '';

  constructor() { this.cargar(); this.cargarTareas(); this.cargarRecurrentes(); }
  cargarRecurrentes(): void {
    this.recurrentesCargando.set(true); this.recurrentesError.set(false);
    this.http.get<ObjetivoRecurrente[]>('/objetivos/recurrentes').subscribe({ next: lista => { this.recurrentes.set(lista); this.recurrentesCargando.set(false); }, error: () => { this.recurrentesError.set(true); this.recurrentesCargando.set(false); } });
  }
  crearRecurrente(): void {
    const titulo = this.tituloRecurrente.trim();
    if (!titulo || this.recurrenteGuardando()) return;
    this.recurrenteGuardando.set(true); this.error.set('');
    this.http.post<ObjetivoRecurrente>('/objetivos/recurrentes', { titulo }).subscribe({ next: objetivo => { this.recurrentes.update(lista => [...lista, objetivo]); this.tituloRecurrente = ''; this.recurrenteGuardando.set(false); }, error: () => { this.error.set('No se pudo agregar el objetivo de todos los días.'); this.recurrenteGuardando.set(false); } });
  }
  marcarRecurrente(objetivo: ObjetivoRecurrente, event: Event): void {
    const input = event.target as HTMLInputElement;
    const fecha = this.seleccionado();
    const completado = input.checked;
    input.disabled = true;
    this.http.patch(`/objetivos/recurrentes/${objetivo.id}`, { fecha, completado }).subscribe({ next: () => { this.recurrentes.update(lista => lista.map(o => o.id === objetivo.id ? { ...o, fechasCompletadas: completado ? [...o.fechasCompletadas, fecha] : o.fechasCompletadas.filter(d => d !== fecha) } : o)); input.disabled = false; }, error: () => { input.checked = !completado; input.disabled = false; this.error.set('No se pudo actualizar el objetivo de todos los días.'); } });
  }
  async eliminarRecurrente(objetivo: ObjetivoRecurrente): Promise<void> {
    if (!(await this.confirmDialog.confirm({ titulo: 'Eliminar objetivo diario', mensaje: 'Se eliminarán este objetivo de todos los días y su historial. ¿Querés continuar?', textoConfirmar: 'Eliminar', peligroso: true }))) return;
    this.http.delete(`/objetivos/recurrentes/${objetivo.id}`).subscribe({ next: () => this.recurrentes.update(lista => lista.filter(o => o.id !== objetivo.id)), error: () => this.error.set('No se pudo eliminar el objetivo de todos los días.') });
  }
  cargarTareas(): void {
    this.tareasService.listar().subscribe({ next: tareas => this.tareas.set(tareas), error: () => this.error.set('No se pudieron cargar las tareas para asociar.') });
  }
  cargar(): void {
    this.cargando.set(true); this.errorCarga.set(false);
    this.http.get<Objetivo[]>('/objetivos').subscribe({ next: objetivos => { this.objetivos.set(objetivos); this.cargando.set(false); }, error: () => { this.errorCarga.set(true); this.cargando.set(false); } });
  }
  seleccionar(fecha: string): void { this.seleccionado.set(fecha); this.fecha = fecha; }
  moverSemana(cantidad: number): void { this.seleccionar(sumarDias(this.seleccionado(), cantidad * 7)); }
  cambiarFecha(fecha: string): void { if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) this.seleccionado.set(fecha); }
  crear(): void {
    if (!this.titulo.trim() || !this.fecha || this.guardando()) return;
    this.error.set(''); this.guardando.set(true);
    this.http.post<Objetivo>('/objetivos', { titulo: this.titulo.trim(), fecha: this.fecha, ...(this.tareaId ? { tareaId: this.tareaId } : {}) }).subscribe({
      next: objetivo => { this.titulo = ''; this.tareaId = ''; this.guardando.set(false); this.seleccionado.set(objetivo.fecha); this.objetivos.update(lista => [objetivo, ...lista]); },
      error: (err: HttpErrorResponse) => { this.guardando.set(false); this.error.set(err.status === 400 && this.tareaId ? 'La tarea seleccionada ya no está disponible. Elegí una tarea pendiente.' : 'No se pudo guardar el objetivo.'); this.cargarTareas(); },
    });
  }
  cambiar(objetivo: Objetivo, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.http.patch<Objetivo>(`/objetivos/${objetivo.id}`, { completado: input.checked }).subscribe({ next: actualizado => this.objetivos.update(lista => lista.map(o => o.id === actualizado.id ? actualizado : o)), error: () => { input.checked = objetivo.completado; this.error.set('No se pudo actualizar el objetivo.'); } });
  }
  async eliminar(objetivo: Objetivo): Promise<void> {
    if (!(await this.confirmDialog.confirm({ titulo: 'Eliminar objetivo', mensaje: '¿Querés eliminar este objetivo?', textoConfirmar: 'Eliminar', peligroso: true }))) return;
    this.http.delete(`/objetivos/${objetivo.id}`).subscribe({ next: () => this.objetivos.update(lista => lista.filter(o => o.id !== objetivo.id)), error: () => this.error.set('No se pudo eliminar el objetivo.') });
  }
  tarea(id: string | null): Tarea | undefined { return this.tareas().find(t => t.id === id); }
  visibles(lista: Objetivo[]): Objetivo[] { const filtro = this.filtroMateria(); return filtro ? lista.filter(o => this.tarea(o.tareaId)?.materia?.id === filtro) : lista; }
  anterioresVisibles(): Objetivo[] { return this.visibles(this.pendientesAnteriores()).filter(o => o.fecha !== this.seleccionado()); }
  fechaLarga(fecha: string): string { return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${fecha}T12:00:00Z`)); }
  estadoDia(fecha: string): string { const lista = this.objetivos().filter(o => o.fecha === fecha); return lista.length && lista.every(o => o.completado) ? '✓' : '○'; }
}
