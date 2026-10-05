import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { listarPaginas } from '../../core/services/paginacion';
import { MensajeEntrante, FuenteMensaje } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class MensajesService {
  private readonly http = inject(HttpClient);

  listar(): Observable<MensajeEntrante[]> {
    return listarPaginas<MensajeEntrante>(this.http, '/mensajes');
  }

  enviar(texto: string, fuente: FuenteMensaje): Observable<MensajeEntrante> {
    return this.http.post<MensajeEntrante>('/mensajes', { texto, fuente });
  }
}
