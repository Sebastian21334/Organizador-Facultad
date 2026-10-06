import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(map((ok) => ok ? true : router.createUrlTree(['/'])), catchError(() => of(false)));
};

export const publicOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(map((ok) => ok ? router.createUrlTree(['/inicio']) : true), catchError(() => of(false)));
};

/** La portada solo se muestra a visitantes; una sesión vigente entra directo a la app. */
export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(map((ok) => ok ? router.createUrlTree(['/inicio']) : true), catchError(() => of(false)));
};
