import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly navItems = [
    { path: '/', label: 'Calendario', icon: '📅' },
    { path: '/tareas', label: 'Tareas', icon: '✓' },
    { path: '/materias', label: 'Materias', icon: '📚' },
    { path: '/mensajes', label: 'Mensajes', icon: '💬' },
  ];

  protected cerrarSesion(): void {
    this.auth.logout();
  }
}
