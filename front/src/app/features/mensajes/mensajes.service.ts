import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MensajeEntrante, FuenteMensaje } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class MensajesService {
  private readonly http = inject(HttpClient);

  listar(): Observable<MensajeEntrante[]> {
    return this.http.get<MensajeEntrante[]>('/mensajes');
  }

  enviar(texto: string, fuente: FuenteMensaje): Observable<MensajeEntrante> {
    return this.http.post<MensajeEntrante>('/mensajes', { texto, fuente });
  }
}
