import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inicio/inicio.component').then(
        (m) => m.InicioComponent,
      ),
    title: 'Inicio',
    data: { fullBleed: true },
  },
  {
    path: 'calendario',
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
    data: { fullBleed: true },
  },
  {
    path: 'materias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/materias/materias.component').then(
        (m) => m.MateriasComponent,
      ),
    title: 'Materias',
    data: { fullBleed: true },
  },
  {
    path: 'mensajes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/mensajes/mensajes.component').then(
        (m) => m.MensajesComponent,
      ),
    title: 'Mensajes',
    data: { fullBleed: true },
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/perfil/perfil.component').then((m) => m.PerfilComponent),
    title: 'Perfil',
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
  {
    path: 'verificar-email',
    loadComponent: () => import('./features/auth/verify-email.component').then((m) => m.VerifyEmailComponent),
    title: 'Verificar email',
  },
  {
    path: 'olvide-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    title: 'Recuperar contraseña',
  },
  {
    path: 'resetear-password',
    loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
    title: 'Restablecer contraseña',
  },
  { path: '**', redirectTo: '' },
];