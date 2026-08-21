import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tarea, CrearTareaDto, EstadoTarea } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class TareasService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>('/tareas');
  }

  listarCalendario(desde?: Date, hasta?: Date): Observable<Tarea[]> {
    let params = new HttpParams();
    if (desde && hasta) {
      params = params.set('desde', desde.toISOString());
      params = params.set('hasta', hasta.toISOString());
    }
    return this.http.get<Tarea[]>('/tareas/calendario', { params });
  }

  crear(dto: CrearTareaDto): Observable<Tarea> {
    return this.http.post<Tarea>('/tareas', dto);
  }

  actualizar(id: string, cambios: Partial<CrearTareaDto> & { estado?: EstadoTarea }): Observable<Tarea> {
    return this.http.patch<Tarea>(`/tareas/${id}`, cambios);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`/tareas/${id}`);
  }
}
