import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/calendario/calendario.component').then(
        (m) => m.CalendarioComponent,
      ),
    title: 'Calendario',
  },
  {
    path: 'tareas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tareas/tareas.component').then(
        (m) => m.TareasComponent,
      ),
    title: 'Tareas',
  },
  {
    path: 'materias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/materias/materias.component').then(
        (m) => m.MateriasComponent,
      ),
    title: 'Materias',
  },
  {
    path: 'mensajes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/mensajes/mensajes.component').then(
        (m) => m.MensajesComponent,
      ),
    title: 'Mensajes',
  },
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Iniciar sesión',
  },
  {
    path: 'register',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
    title: 'Crear cuenta',
  },
  { path: '**', redirectTo: '' },
];
