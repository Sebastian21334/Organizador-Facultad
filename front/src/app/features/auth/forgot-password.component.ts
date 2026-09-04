import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-[100dvh] flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      <!-- Bloque de Marca -->
      <div class="flex flex-col items-center text-center mb-6">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6E1F2B] to-[#4F1620] text-[#FAF6EE] flex items-center justify-center font-display font-bold text-2xl shadow-md ring-4 ring-[#F3DFE2] mb-3">
          T
        </div>
        <h1 class="font-display font-bold text-2xl text-[#2B231F] tracking-tight">Tempo</h1>
        <p class="text-xs text-[#7A6F66] mt-0.5">Organizá tu vida universitaria.</p>
      </div>

      <!-- Tarjeta -->
      <section class="w-full max-w-md bg-[#FFFEFA] rounded-3xl border border-[#D8CBAE] shadow-sm shadow-[#2B231F]/5 p-6 sm:p-8">
        <div class="mb-6">
          <h2 class="text-xl sm:text-2xl font-display font-bold text-[#2B231F]">Recuperar contraseña</h2>
          <p class="text-xs sm:text-sm text-[#7A6F66] mt-1">Ingresá tu correo registrado y te enviaremos un enlace de recuperación.</p>
        </div>

        @if (success()) {
          <div class="bg-[#EAF6EE] border border-[#BCE3C8] rounded-2xl p-5 text-center animate-message-in" role="status">
            <div class="w-12 h-12 rounded-full bg-[#1E6E38]/10 text-[#1E6E38] flex items-center justify-center text-2xl mx-auto mb-3">
              ✉️
            </div>
            <h3 class="font-display font-bold text-lg text-[#1E6E38]">Correo enviado</h3>
            <p class="text-sm text-[#245834] mt-2 leading-relaxed">
              {{ success() }}
            </p>
            <a
              routerLink="/login"
              class="button-primary inline-flex items-center justify-center w-full mt-5"
            >
              Volver a Iniciar sesión
            </a>
          </div>
        } @else {
          <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
            <div>
              <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-[#5E534B] mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="field-input"
                [class.field-error]="form.controls.email.invalid && form.controls.email.touched"
                placeholder="ejemplo@facultad.edu.ar"
                autocomplete="email"
              />
              @if (form.controls.email.invalid && form.controls.email.touched) {
                <p class="field-error-msg flex items-center gap-1 mt-1.5">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  Ingresá un email válido.
                </p>
              }
            </div>

            @if (error()) {
              <div class="bg-[#FDF0F0] border border-[#F8C8C8] text-[#A62828] rounded-xl p-3 text-xs sm:text-sm flex items-start gap-2.5 animate-message-in" role="alert">
                <svg class="w-4 h-4 shrink-0 mt-0.5 text-[#A62828]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <span>{{ error() }}</span>
              </div>
            }

            <button
              type="submit"
              [disabled]="loading()"
              class="button-primary w-full mt-2"
            >
              @if (loading()) {
                <svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span>Enviando instrucciones...</span>
              } @else {
                <span>Enviar instrucciones</span>
              }
            </button>
          </form>
        }

        <div class="mt-6 pt-5 border-t border-[#E5DFD3] text-center">
          <a routerLink="/login" class="text-xs sm:text-sm text-[#6E1F2B] font-semibold hover:underline inline-flex items-center gap-1">
            ← Volver a Iniciar sesión
          </a>
        </div>
      </section>
    </div>
  `,
  styles: `
    .field-input {
      @apply w-full border border-[#D5CBB9] rounded-xl px-3.5 py-3 text-[15px] sm:text-sm bg-[#FAF8F5] text-[#2B231F] placeholder:text-[#968A7E] outline-none transition-all duration-150;
    }
    .field-input:focus {
      @apply bg-white border-[#6E1F2B] ring-2 ring-[#6E1F2B]/15;
    }
    .field-error {
      @apply border-[#A62828] bg-[#FFF8F8] focus:border-[#A62828] focus:ring-[#A62828]/15;
    }
    .field-error-msg {
      @apply text-xs text-[#A62828] font-medium;
    }
    .button-primary {
      @apply h-12 rounded-xl bg-[#6E1F2B] px-5 text-sm font-semibold text-white hover:bg-[#541721] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#6E1F2B]/20;
    }
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