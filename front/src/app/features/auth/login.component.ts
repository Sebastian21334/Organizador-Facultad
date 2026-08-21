import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h1 class="text-2xl font-semibold text-slate-800">Iniciar sesión</h1>
      <p class="text-sm text-slate-500 mt-1 mb-6">Accedé a tu organizador universitario.</p>
      <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
        <label class="block text-sm text-slate-600">Email
          <input type="email" formControlName="email" class="field" autocomplete="email" />
        </label>
        <label class="block text-sm text-slate-600">Contraseña
          <input type="password" formControlName="password" class="field" autocomplete="current-password" />
        </label>
        @if (form.controls.email.invalid && form.controls.email.touched) { <p class="text-sm text-red-600">Ingresá un email válido.</p> }
        @if (error()) { <p class="text-sm text-red-600" role="alert">{{ error() }}</p> }
        <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Ingresando...' : 'Ingresar' }}</button>
      </form>
      <a routerLink="/olvide-password" class="block text-sm text-slate-600 mt-4 text-center hover:underline">¿Olvidaste tu contraseña?</a>
      <p class="text-sm text-slate-500 mt-5 text-center">¿Todavía no tenés cuenta? <a routerLink="/register" class="text-slate-800 font-medium hover:underline">Registrate</a></p>
    </section>
  `,
  styles: `
    .field { @apply mt-1 w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300; }
    .button-primary { @apply rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50; }
  `,
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue().email, this.form.getRawValue().password).subscribe({
      next: () => { this.loading.set(false); void this.router.navigate(['/']); },
      error: (error) => {
        this.loading.set(false);
        const message = this.messageFromError(error, 'No se pudo iniciar sesión.');
        this.error.set(/verific|confirm/i.test(message)
          ? 'Tu email todavía no está verificado. Revisá tu correo para confirmar la cuenta.'
          : message);
      },
    });
  }

  private messageFromError(error: { error?: { message?: string | string[] } }, fallback: string): string {
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : message || fallback;
  }
}
