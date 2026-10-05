import { HttpClient } from '@angular/common/http';
import { EMPTY, expand, reduce } from 'rxjs';

export function listarPaginas<T>(http: HttpClient, url: string) {
  const limit = 100;
  return http.get<T[]>(url, { params: { limit, offset: 0 } }).pipe(
    expand((pagina, indice) => pagina.length === limit && (indice + 1) * limit <= 10000
      ? http.get<T[]>(url, { params: { limit, offset: (indice + 1) * limit } }) : EMPTY),
    reduce((items, pagina) => [...items, ...pagina], [] as T[]),
  );
}
