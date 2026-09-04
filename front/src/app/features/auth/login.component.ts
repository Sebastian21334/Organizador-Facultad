import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
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

      <!-- Tarjeta de Login -->
      <section class="w-full max-w-md bg-[#FFFEFA] rounded-3xl border border-[#D8CBAE] shadow-sm shadow-[#2B231F]/5 p-6 sm:p-8">
        <div class="mb-6">
          <h2 class="text-xl sm:text-2xl font-display font-bold text-[#2B231F]">Iniciar sesión</h2>
          <p class="text-xs sm:text-sm text-[#7A6F66] mt-1">Accedé a tus materias, tareas y chat con IA.</p>
        </div>

        <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
          <!-- Campo Email -->
          <div>
            <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-[#5E534B] mb-1.5">
              Correo electrónico
            </label>
            <div class="relative">
              <input
                id="email"
                type="email"
                formControlName="email"
                class="field-input"
                [class.field-error]="form.controls.email.invalid && form.controls.email.touched"
                placeholder="ejemplo@facultad.edu.ar"
                autocomplete="email"
              />
            </div>
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <p class="field-error-msg flex items-center gap-1 mt-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Ingresá un email válido.
              </p>
            }
          </div>

          <!-- Campo Contraseña -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-[#5E534B]">
                Contraseña
              </label>
              <a routerLink="/olvide-password" class="text-xs text-[#6E1F2B] hover:underline font-medium py-1">
                ¿La olvidaste?
              </a>
            </div>
            <div class="relative">
              <input
                id="password"
                [type]="mostrarPassword() ? 'text' : 'password'"
                formControlName="password"
                class="field-input pr-12"
                [class.field-error]="form.controls.password.invalid && form.controls.password.touched"
                placeholder="Tu contraseña"
                autocomplete="current-password"
              />
              <button
                type="button"
                (click)="mostrarPassword.set(!mostrarPassword())"
                class="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#7A6F66] hover:text-[#2B231F] rounded-lg transition"
                [attr.aria-label]="mostrarPassword() ? 'Ocultar contraseña' : 'Ver contraseña'"
              >
                @if (mostrarPassword()) {
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                } @else {
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              </button>
            </div>
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <p class="field-error-msg flex items-center gap-1 mt-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Ingresá tu contraseña.
              </p>
            }
          </div>

          <!-- Mensaje de Error del Servidor -->
          @if (error()) {
            <div class="bg-[#FDF0F0] border border-[#F8C8C8] text-[#A62828] rounded-xl p-3 text-xs sm:text-sm flex items-start gap-2.5 animate-message-in" role="alert">
              <svg class="w-4 h-4 shrink-0 mt-0.5 text-[#A62828]" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>{{ error() }}</span>
            </div>
          }

          <!-- Botón de Envío -->
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
              <span>Ingresando...</span>
            } @else {
              <span>Ingresar a Tempo</span>
            }
          </button>
        </form>

        <div class="mt-6 pt-5 border-t border-[#E5DFD3] text-center">
          <p class="text-xs sm:text-sm text-[#7A6F66]">
            ¿Todavía no tenés cuenta?
            <a routerLink="/register" class="text-[#6E1F2B] font-semibold hover:underline ml-1">
              Registrate gratis
            </a>
          </p>
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
  protected readonly mostrarPassword = signal(false);

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