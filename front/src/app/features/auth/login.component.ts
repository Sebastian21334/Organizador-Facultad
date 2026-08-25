import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-[#FFFEFA] rounded-lg border border-[#D9D3C2] shadow-sm p-6">
      <h1 class="text-2xl font-display font-bold text-[#3A2A22]">Iniciar sesión</h1>
      <p class="text-sm text-[#8C8570] mt-1 mb-6">Accedé a tu organizador universitario.</p>
      <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
        <label class="block text-sm text-[#5B5748]">Email
          <input type="email" formControlName="email" class="field" autocomplete="email" />
        </label>
        <label class="block text-sm text-[#5B5748]">Contraseña
          <input type="password" formControlName="password" class="field" autocomplete="current-password" />
        </label>
        @if (form.controls.email.invalid && form.controls.email.touched) { <p class="text-sm text-[#B3401A]">Ingresá un email válido.</p> }
        @if (error()) { <p class="text-sm text-[#B3401A]" role="alert">{{ error() }}</p> }
        <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Ingresando...' : 'Ingresar' }}</button>
      </form>
      <a routerLink="/olvide-password" class="auth-link block text-sm mt-4 text-center hover:underline">¿Olvidaste tu contraseña?</a>
      <p class="text-sm text-[#8C8570] mt-5 text-center">¿Todavía no tenés cuenta? <a routerLink="/register" class="auth-link font-medium hover:underline">Registrate</a></p>
    </section>
  `,
  styles: `
    .field { @apply mt-1 w-full border border-[#D9D3C2] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9C2AC]; }
    .button-primary { @apply rounded-md bg-[#6E1F2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F1620] disabled:opacity-50; }
    .auth-link { color: #6E1F2B; }
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