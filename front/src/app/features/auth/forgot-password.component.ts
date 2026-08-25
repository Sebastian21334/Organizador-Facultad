import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-[#FFFEFA] rounded-lg border border-[#D9D3C2] shadow-sm p-6">
      <h1 class="text-2xl font-display font-bold text-[#3A2A22]">Recuperar contraseña</h1>
      <p class="text-sm text-[#8C8570] mt-1 mb-6">Ingresá tu email y te enviaremos instrucciones.</p>
      @if (success()) {
        <p class="rounded-md bg-[#E7EEE1] px-3 py-2 text-sm text-[#3F6B4A]" role="status">{{ success() }}</p>
      } @else {
        <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
          <label class="block text-sm text-[#5B5748]">Email
            <input type="email" formControlName="email" class="field" autocomplete="email" />
          </label>
          @if (form.controls.email.invalid && form.controls.email.touched) { <p class="text-sm text-[#B3401A]">Ingresá un email válido.</p> }
          @if (error()) { <p class="text-sm text-[#B3401A]" role="alert">{{ error() }}</p> }
          <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Enviando...' : 'Enviar instrucciones' }}</button>
        </form>
      }
      <a routerLink="/login" class="auth-link block text-sm mt-5 text-center hover:underline">Volver a iniciar sesión</a>
    </section>
  `,
  styles: `
    .field { @apply mt-1 w-full border border-[#D9D3C2] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9C2AC]; }
    .button-primary { @apply rounded-md bg-[#6E1F2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F1620] disabled:opacity-50; }
    .auth-link { color: #6E1F2B; }
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