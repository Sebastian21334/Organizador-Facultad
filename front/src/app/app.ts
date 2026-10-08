import { Component, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import {
  LucideDynamicIcon,
  LucideBookOpen,
  LucideCalendar,
  LucideCheckSquare,
  LucideCompass,
  LucideLogOut,
  LucideMenu,
  LucideMessageCircle,
  LucideMoon,
  LucideSun,
  LucideUserCircle,
  LucideMail,
  LucideDownload,
} from '@lucide/angular';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog.component';
import { ConfirmDialogService } from './shared/components/confirm-dialog.service';
import { ToastComponent } from './shared/components/toast.component';
import { MotionDirective } from './shared/directives/motion.directive';
import { LoaderComponent } from './shared/components/loader.component';
import { ErrorComponent } from './shared/components/error.component';
import { InstallPromptComponent } from './shared/components/install-prompt.component';
import { PushNotificationsService } from './core/services/push-notifications.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogComponent, ToastComponent, LucideDynamicIcon, MotionDirective, LoaderComponent, ErrorComponent, InstallPromptComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly push = inject(PushNotificationsService);

  protected readonly fullBleed = signal(this.calcularFullBleed());

  // Estado del drawer de navegación en mobile.
  protected readonly menuAbierto = signal(false);

  protected readonly navItems = [
    { path: '/inicio', label: 'Inicio', icon: LucideCompass },
    { path: '/calendario', label: 'Calendario', icon: LucideCalendar },
    { path: '/tareas', label: 'Tareas', icon: LucideCheckSquare },
    { path: '/materias', label: 'Materias', icon: LucideBookOpen },
    { path: '/mensajes', label: 'Mensajes', icon: LucideMessageCircle },
    { path: '/perfil', label: 'Perfil', icon: LucideUserCircle },
    { path: '/instalar', label: 'Instalar app', icon: LucideDownload },
    { path: '/contacto', label: 'Ayuda y contacto', icon: LucideMail },
  ];
  protected readonly logOutIcon = LucideLogOut;
  protected readonly menuIcon = LucideMenu;
  protected readonly moonIcon = LucideMoon;
  protected readonly sunIcon = LucideSun;

  constructor() {
    effect(() => {
      const active = this.auth.isAuthenticated();
      untracked(() => this.push.setSessionActive(active));
    });
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        map(() => this.calcularFullBleed()),
        takeUntilDestroyed(),
      )
      .subscribe((valor) => {
        this.fullBleed.set(valor);
        // Al navegar a otra sección, el drawer se cierra solo.
        this.menuAbierto.set(false);
      });
  }

  protected toggleMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected async cerrarSesion(): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      titulo: 'Cerrar sesión',
      mensaje: '¿Seguro que querés salir? Por seguridad se cerrarán todas las sesiones de tu cuenta.',
      textoConfirmar: 'Salir',
    });
    if (confirmado) {
      this.cerrarMenu();
      this.auth.logout();
    }
  }

  protected reintentarSesion(): void {
    const destino = window.location.pathname + window.location.search + window.location.hash;
    this.auth.ensureSession(true).subscribe({
      next: (ok) => { void this.router.navigateByUrl(ok ? destino : '/'); },
      error: () => {}, // El mensaje y el botón de reintento siguen visibles.
    });
  }

  private calcularFullBleed(): boolean {
    let ruta: ActivatedRoute | null = this.activatedRoute.firstChild;
    while (ruta) {
      if (ruta.snapshot.data?.['fullBleed']) return true;
      ruta = ruta.firstChild;
    }
    return false;
  }
}
