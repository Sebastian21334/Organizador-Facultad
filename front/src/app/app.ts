import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { BookOpen, Calendar, CheckSquare, Compass, LogOut, MessageCircle, UserCircle, LucideAngularModule } from 'lucide-angular';
import { AuthService } from './core/services/auth.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog.component';
import { ConfirmDialogService } from './shared/components/confirm-dialog.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogComponent, LucideAngularModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  // Se activa cuando la ruta actual (o alguna de sus rutas hijas) tiene
  // `data: { fullBleed: true }` en la configuración de rutas. Sirve para que
  // páginas como Inicio, Tareas o Mensajes puedan ocupar todo el ancho del
  // área de contenido, sin el padding que .app-content le da al resto.
  protected readonly fullBleed = signal(this.calcularFullBleed());

  protected readonly navItems = [
    { path: '/', label: 'Inicio', icon: Compass },
    { path: '/calendario', label: 'Calendario', icon: Calendar },
    { path: '/tareas', label: 'Tareas', icon: CheckSquare },
    { path: '/materias', label: 'Materias', icon: BookOpen },
    { path: '/mensajes', label: 'Mensajes', icon: MessageCircle },
    { path: '/perfil', label: 'Perfil', icon: UserCircle },
  ];
  protected readonly logOutIcon = LogOut;

  constructor() {
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        map(() => this.calcularFullBleed()),
        takeUntilDestroyed(),
      )
      .subscribe((valor) => this.fullBleed.set(valor));
  }

  protected async cerrarSesion(): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      titulo: 'Cerrar sesión',
      mensaje: '¿Seguro que querés salir?',
      textoConfirmar: 'Salir',
    });
    if (confirmado) this.auth.logout();
  }

  // Recorre la cadena de rutas activas (la ruta puede tener hijos, ej. layouts
  // anidados) buscando data.fullBleed en alguna de ellas.
  private calcularFullBleed(): boolean {
    let ruta: ActivatedRoute | null = this.activatedRoute.firstChild;
    while (ruta) {
      if (ruta.snapshot.data?.['fullBleed']) return true;
      ruta = ruta.firstChild;
    }
    return false;
  }
}
