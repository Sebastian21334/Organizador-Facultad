import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TareasService } from '../tareas/tareas.service';
import { Tarea } from '../../core/models';

interface Objetivo { id: string; titulo: string; fecha: string; completado: boolean; tareaId: string | null; }

@Component({
  selector: 'app-objetivos',
  imports: [FormsModule],
  template: `
    <section class="objetivos">
      <header><p class="eyebrow">UN DÍA A LA VEZ</p><h1>Objetivos diarios</h1><p>Elegí en qué querés avanzar. Lo que quede pendiente seguirá acá.</p></header>
      <form (ngSubmit)="crear()" class="panel formulario">
        <h2>Nuevo objetivo</h2>
        <label for="titulo">¿Qué querés lograr?</label>
        <input id="titulo" name="titulo" [(ngModel)]="titulo" maxlength="200" required placeholder="Por ejemplo: repasar el tema 3">
        <div class="campos">
          <div><label for="fecha">Día</label><input id="fecha" name="fecha" type="date" [(ngModel)]="fecha" required></div>
          <div><label for="tarea">Asociar a una tarea <span>(opcional)</span></label><select id="tarea" name="tarea" [(ngModel)]="tareaId"><option value="">Sin tarea asociada</option>@for (tarea of tareas(); track tarea.id) { <option [value]="tarea.id">{{ tarea.titulo }}</option> }</select></div>
        </div>
        <button type="submit" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Agregar objetivo' }}</button>
      </form>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      <section class="panel lista" aria-labelledby="lista-titulo">
        <h2 id="lista-titulo">Tus objetivos</h2>
        <p class="nota">Cada día a las 9:00 (hora argentina) recibirás un correo con los objetivos de días anteriores que sigan pendientes.</p>
        @if (cargando()) { <p>Cargando objetivos…</p> }
        @else if (!objetivos().length) { <p>Todavía no agregaste objetivos.</p> }
        @else {
          @for (objetivo of objetivos(); track objetivo.id) {
            <div class="fila" [class.completado]="objetivo.completado">
              <label class="check"><input type="checkbox" [checked]="objetivo.completado" (change)="cambiar(objetivo, $event)"><span><strong>{{ objetivo.titulo }}</strong><small>{{ mostrarFecha(objetivo.fecha) }} @if (nombreTarea(objetivo.tareaId); as nombre) { · {{ nombre }} }</small></span></label>
              <button type="button" class="eliminar" (click)="eliminar(objetivo)" [attr.aria-label]="'Eliminar ' + objetivo.titulo">Eliminar</button>
            </div>
          }
        }
      </section>
    </section>`,
  styles: [`
    .objetivos{max-width:900px;margin:0 auto;padding:clamp(1.25rem,4vw,3rem);display:grid;gap:1.5rem} header h1{font-size:clamp(2rem,5vw,3rem);margin:.3rem 0} header p,.nota{opacity:.75;line-height:1.5}.eyebrow{font-size:.75rem;letter-spacing:.12em;font-weight:700}.panel{border:1px solid var(--border, #d9ded8);border-radius:18px;padding:clamp(1rem,3vw,1.75rem);background:var(--surface, transparent)} h2{font-size:1.2rem;margin:0 0 1rem}.formulario{display:grid;gap:.65rem}label{font-weight:600;font-size:.9rem}label span,.nota{font-weight:400}input:not([type=checkbox]),select{width:100%;padding:.75rem;border:1px solid #a3afa6;border-radius:8px;background:transparent;color:inherit;font:inherit}.campos{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.campos div{display:grid;gap:.5rem}button{cursor:pointer;border:0;border-radius:8px;padding:.75rem 1rem;background:#315e4b;color:white;font:inherit;font-weight:600;justify-self:start}button:disabled{opacity:.6;cursor:wait}.fila{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-top:1px solid #a3afa6;padding:1rem 0}.check{display:flex;align-items:flex-start;gap:.75rem;min-width:0}.check input{width:1.2rem;height:1.2rem;accent-color:#315e4b}.check strong{overflow-wrap:anywhere}.check small{display:block;opacity:.7;margin-top:.3rem}.completado strong{text-decoration:line-through;opacity:.65}.eliminar{background:transparent;color:inherit;border:1px solid #a3afa6;font-size:.8rem}.error{color:#b42318} @media(max-width:600px){.campos{grid-template-columns:1fr}}
  `],
})
export class ObjetivosComponent {
  private readonly http = inject(HttpClient);
  private readonly tareasService = inject(TareasService);
  readonly objetivos = signal<Objetivo[]>([]);
  readonly tareas = signal<Tarea[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  titulo = '';
  fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  tareaId = '';
  constructor() { this.cargar(); this.tareasService.listar().subscribe({ next: t => this.tareas.set(t), error: () => this.error.set('No se pudieron cargar las tareas para asociar.') }); }
  cargar(): void { this.http.get<Objetivo[]>('/objetivos').subscribe({ next: o => { this.objetivos.set(o); this.cargando.set(false); }, error: () => { this.error.set('No se pudieron cargar los objetivos.'); this.cargando.set(false); } }); }
  crear(): void {
    if (!this.titulo.trim() || !this.fecha || this.guardando()) return;
    this.error.set(''); this.guardando.set(true);
    this.http.post<Objetivo>('/objetivos', { titulo: this.titulo.trim(), fecha: this.fecha, ...(this.tareaId ? { tareaId: this.tareaId } : {}) }).subscribe({ next: () => { this.titulo = ''; this.tareaId = ''; this.guardando.set(false); this.cargar(); }, error: () => { this.guardando.set(false); this.error.set('No se pudo guardar el objetivo.'); } });
  }
  cambiar(objetivo: Objetivo, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.http.patch<Objetivo>(`/objetivos/${objetivo.id}`, { completado: input.checked }).subscribe({ next: actualizado => this.objetivos.update(lista => lista.map(o => o.id === actualizado.id ? actualizado : o)), error: () => { input.checked = objetivo.completado; this.error.set('No se pudo actualizar el objetivo.'); } });
  }
  eliminar(objetivo: Objetivo): void { if (!confirm('¿Eliminar este objetivo?')) return; this.http.delete(`/objetivos/${objetivo.id}`).subscribe({ next: () => this.objetivos.update(lista => lista.filter(o => o.id !== objetivo.id)), error: () => this.error.set('No se pudo eliminar el objetivo.') }); }
  nombreTarea(id: string | null): string | undefined { return this.tareas().find(t => t.id === id)?.titulo; }
  mostrarFecha(fecha: string): string { const [a, m, d] = fecha.split('-'); return `${d}/${m}/${a}`; }
}
