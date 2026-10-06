import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { listarPaginas } from '../../core/services/paginacion';
import { Materia, CrearMateriaDto } from '../../core/models';
import { MateriaPlan, VistaPlan, ResultadoImportacion } from './plan-estudios.model';

@Injectable({ providedIn: 'root' })
export class MateriasService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Materia[]> {
    return listarPaginas<Materia>(this.http, '/materias');
  }

  crear(dto: CrearMateriaDto): Observable<Materia> {
    return this.http.post<Materia>('/materias', dto);
  }

  actualizar(id: string, datos: Partial<Materia>): Observable<Materia> {
    return this.http.patch<Materia>(`/materias/${id}`, datos);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`/materias/${id}`);
  }

  analizarPlan(texto: string): Observable<VistaPlan> {
    return this.http.post<VistaPlan>('/materias/plan/analizar', { texto });
  }

  importarPlan(materias: MateriaPlan[]): Observable<ResultadoImportacion> {
    return this.http.post<ResultadoImportacion>('/materias/plan/importar', { materias });
  }
}
