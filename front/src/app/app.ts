import { Component, inject, signal } from '@angular/core';
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
  LucideUserCircle,
} from '@lucide/angular';
import { AuthService } from './core/services/auth.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog.component';
import { ConfirmDialogService } from './shared/components/confirm-dialog.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogComponent, LucideDynamicIcon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly fullBleed = signal(this.calcularFullBleed());

  // Estado del drawer de navegación en mobile.
  protected readonly menuAbierto = signal(false);

  protected readonly navItems = [
    { path: '/', label: 'Inicio', icon: LucideCompass },
    { path: '/calendario', label: 'Calendario', icon: LucideCalendar },
    { path: '/tareas', label: 'Tareas', icon: LucideCheckSquare },
    { path: '/materias', label: 'Materias', icon: LucideBookOpen },
    { path: '/mensajes', label: 'Mensajes', icon: LucideMessageCircle },
    { path: '/perfil', label: 'Perfil', icon: LucideUserCircle },
  ];
  protected readonly logOutIcon = LucideLogOut;
  protected readonly menuIcon = LucideMenu;

  constructor() {
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
      mensaje: '¿Seguro que querés salir?',
      textoConfirmar: 'Salir',
    });
    if (confirmado) {
      this.cerrarMenu();
      this.auth.logout();
    }
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