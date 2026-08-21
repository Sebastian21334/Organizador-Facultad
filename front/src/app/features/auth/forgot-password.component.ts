import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h1 class="text-2xl font-semibold text-slate-800">Recuperar contraseña</h1>
      <p class="text-sm text-slate-500 mt-1 mb-6">Ingresá tu email y te enviaremos instrucciones.</p>
      @if (success()) {
        <p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{{ success() }}</p>
      } @else {
        <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
          <label class="block text-sm text-slate-600">Email
            <input type="email" formControlName="email" class="field" autocomplete="email" />
          </label>
          @if (form.controls.email.invalid && form.controls.email.touched) { <p class="text-sm text-red-600">Ingresá un email válido.</p> }
          @if (error()) { <p class="text-sm text-red-600" role="alert">{{ error() }}</p> }
          <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Enviando...' : 'Enviar instrucciones' }}</button>
        </form>
      }
      <a routerLink="/login" class="block text-sm text-slate-600 mt-5 text-center hover:underline">Volver a iniciar sesión</a>
    </section>
  `,
  styles: `
    .field { @apply mt-1 w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300; }
    .button-primary { @apply rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50; }
  `,
})
export class ForgotPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly form = this.formBuilder.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: ({ mensaje }) => { this.loading.set(false); this.success.set(mensaje); },
      error: (error) => { this.loading.set(false); this.error.set(this.messageFromError(error, 'No se pudo procesar la solicitud.')); },
    });
  }

  private messageFromError(error: { error?: { message?: string | string[] } }, fallback: string): string {
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : message || fallback;
  }
}