import { Location } from '@angular/common';
import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
import { authGuard } from './core/guards/auth.guard';

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
  private readonly location = inject(Location);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly push = inject(PushNotificationsService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sidebar = viewChild<ElementRef<HTMLElement>>('sidebar');
  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');
  private readonly contenido = viewChild<ElementRef<HTMLElement>>('contenido');

  protected readonly fullBleed = signal(this.calcularFullBleed());
  protected readonly navegacionInicialLista = signal(this.router.navigated);
  private readonly reservaInicialPendiente = signal(this.iniciaEnRutaPrivada());
  protected readonly reservarNavegacion = computed(() =>
    this.reservaInicialPendiente() && this.auth.checkingSession() && !this.auth.isAuthenticated(),
  );

  // Estado del drawer de navegación en mobile.
  protected readonly menuAbierto = signal(false);
  protected readonly esMovil = signal(false);

  protected readonly navItems = [
    { path: '/inicio', label: 'Inicio', icon: LucideCompass },
    { path: '/calendario', label: 'Calendario', icon: LucideCalendar },
    { path: '/tareas', label: 'Tareas', icon: LucideCheckSquare },
    { path: '/objetivos', label: 'Objetivos diarios', icon: LucideCheckSquare },
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
    afterNextRender(() => {
      const viewport = window.matchMedia('(max-width: 768px)');
      const actualizar = () => {
        this.esMovil.set(viewport.matches);
        if (!viewport.matches) this.menuAbierto.set(false);
      };
      actualizar();
      viewport.addEventListener('change', actualizar);
      this.destroyRef.onDestroy(() => viewport.removeEventListener('change', actualizar));
    });
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
        this.navegacionInicialLista.set(true);
        this.reservaInicialPendiente.set(false);
        this.fullBleed.set(valor);
        this.menuAbierto.set(false);
        afterNextRender(() => {
          const contenido = this.contenido()?.nativeElement;
          const fragmento = this.router.parseUrl(this.router.url).fragment;
          const destino = fragmento ? document.getElementById(fragmento) : null;
          if (destino) destino.scrollIntoView({ block: 'start', behavior: 'instant' });
          else {
            contenido?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          }
          contenido?.focus({ preventScroll: true });
        }, { injector: this.injector });
      });
  }

  protected saltarAlContenido(event: Event): void {
    // El base href de Angular resolvería un fragmento relativo contra la raíz.
    event.preventDefault();
    this.contenido()?.nativeElement.focus({ preventScroll: true });
    this.contenido()?.nativeElement.scrollTo({ top: 0, behavior: 'instant' });
  }

  protected toggleMenu(): void {
    if (this.menuAbierto()) { this.cerrarMenu(); return; }
    this.menuAbierto.set(true);
    afterNextRender(() => {
      this.sidebar()?.nativeElement.querySelector<HTMLElement>('.drawer-close')?.focus();
    }, { injector: this.injector });
  }

  protected cerrarMenu(): void {
    const devolverFoco = this.menuAbierto() && this.esMovil();
    this.menuAbierto.set(false);
    if (devolverFoco) afterNextRender(() => this.menuToggle()?.nativeElement.focus(), { injector: this.injector });
  }

  protected navegarMenu(event: KeyboardEvent): void {
    if (!this.esMovil() || !this.menuAbierto()) return;
    if (event.key === 'Escape') { event.preventDefault(); this.cerrarMenu(); return; }
    if (event.key !== 'Tab') return;
    const elementos = Array.from(this.sidebar()!.nativeElement.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'))
      .filter((elemento) => elemento.getClientRects().length > 0);
    const primero = elementos[0];
    const ultimo = elementos.at(-1);
    if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo?.focus(); }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero?.focus(); }
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

  private iniciaEnRutaPrivada(): boolean {
    // Antes de la primera navegación Router.url aún puede ser '/'. Location
    // respeta el base href y funciona sin depender de window. Las rutas actuales
    // son planas: su propio guard determina la reserva, sin duplicar sus paths.
    const segmentos = this.router.parseUrl(this.location.path()).root.children[PRIMARY_OUTLET]?.segments ?? [];
    const path = segmentos.map((segmento) => segmento.path).join('/');
    return this.router.config.some((ruta) => ruta.path === path && ruta.canActivate?.includes(authGuard));
  }
}
