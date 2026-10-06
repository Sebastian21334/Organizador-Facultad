import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = new URL(environment.apiUrl, window.location.origin);
  const destino = new URL(req.url, window.location.origin);
  const basePath = api.pathname.replace(/\/$/, '');
  if (destino.origin !== api.origin || !destino.pathname.startsWith(basePath + '/')) return next(req);
  const auth = inject(AuthService);
  const headers: Record<string, string> = !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && auth.csrfToken()
    ? { 'X-CSRF-Token': auth.csrfToken() } : {};
  const solicitud = req.clone({ withCredentials: true, setHeaders: headers });
  return next(solicitud).pipe(catchError((error: HttpErrorResponse) => {
    const publica = ['/auth/login', '/auth/session', '/auth/register', '/auth/forgot-password', '/auth/resend-verification', '/auth/reset-password', '/auth/verify-email'].includes(destino.pathname.slice(basePath.length));
    if (error.status === 401 && !publica) {
      // Un 401 también puede ser una contraseña actual incorrecta o un proveedor externo.
      return auth.ensureSession(true).pipe(
        catchError(() => of(null)),
        switchMap((ok) => {
          if (ok === false) auth.expireSession();
          return throwError(() => error);
        }),
      );
    }
    return throwError(() => error);
  }));
};
