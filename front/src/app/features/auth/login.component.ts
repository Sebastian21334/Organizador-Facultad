import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h1 class="text-2xl font-semibold text-slate-800">Iniciar sesión</h1>
      <p class="text-sm text-slate-500 mt-1 mb-6">Accedé a tu organizador universitario.</p>
      <form (submit)="submit($event)" class="space-y-4">
        <label class="block text-sm text-slate-600">Email
          <input type="email" required [value]="email()" (input)="email.set($any($event.target).value)" class="field" autocomplete="email" />
        </label>
        <label class="block text-sm text-slate-600">Contraseña
          <input type="password" required [value]="password()" (input)="password.set($any($event.target).value)" class="field" autocomplete="current-password" />
        </label>
        @if (error()) { <p class="text-sm text-red-600" role="alert">{{ error() }}</p> }
        <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Ingresando...' : 'Ingresar' }}</button>
      </form>
      <p class="text-sm text-slate-500 mt-5 text-center">¿Todavía no tenés cuenta? <a routerLink="/register" class="text-slate-800 font-medium hover:underline">Registrate</a></p>
    </section>
  `,
  styles: `
    .field { @apply mt-1 w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300; }
    .button-primary { @apply rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50; }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(event: Event): void {
    event.preventDefault();
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email(), this.password()).subscribe({
      next: () => { this.loading.set(false); void this.router.navigate(['/']); },
      error: (error) => { this.loading.set(false); this.error.set(this.messageFromError(error, 'No se pudo iniciar sesión.')); },
    });
  }

  private messageFromError(error: { error?: { message?: string | string[] } }, fallback: string): string {
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : message || fallback;
  }
}
