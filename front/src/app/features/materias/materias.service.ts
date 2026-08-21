import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Materia, CrearMateriaDto } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class MateriasService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Materia[]> {
    return this.http.get<Materia[]>('/materias');
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
}