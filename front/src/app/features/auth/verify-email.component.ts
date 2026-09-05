import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  template: `
    <div class="min-h-[100dvh] flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-[#F9F7F2]">
      <!-- Bloque de Marca -->
      <div class="flex flex-col items-center text-center mb-6">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6E1F2B] to-[#4F1620] text-[#FAF6EE] flex items-center justify-center font-display font-bold text-2xl shadow-md ring-4 ring-[#F3DFE2] mb-3">
          T
        </div>
        <h1 class="font-display font-bold text-2xl text-[#2B231F] tracking-tight">Tempo</h1>
        <p class="text-xs text-[#7A6F66] mt-0.5">Organizá tu vida universitaria.</p>
      </div>

      <!-- Tarjeta -->
      <section class="w-full max-w-md bg-white rounded-3xl border border-[#E5DFD3] shadow-sm shadow-[#2B231F]/5 p-6 sm:p-8 text-center animate-message-in">
        @if (loading()) {
          <div class="py-6">
            <div class="w-12 h-12 rounded-full border-3 border-[#F3DFE2] border-t-[#6E1F2B] animate-spin mx-auto mb-4"></div>
            <h2 class="text-xl font-display font-bold text-[#2B231F]">Verificando correo...</h2>
            <p class="text-sm text-[#7A6F66] mt-2">Estamos confirmando tu cuenta de Tempo.</p>
          </div>
        } @else if (verified()) {
          <div class="py-4">
            <div class="w-14 h-14 rounded-2xl bg-[#EAF6EE] text-[#1E6E38] border border-[#BCE3C8] flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
              ✅
            </div>
            <h2 class="text-xl sm:text-2xl font-display font-bold text-[#2B231F]">¡Email verificado!</h2>
            <p class="text-sm text-[#5E534B] mt-2 max-w-xs mx-auto">
              Tu cuenta ya está activa. Podés iniciar sesión para empezar a organizar tus materias.
            </p>
            <a routerLink="/login" class="button-primary inline-flex items-center justify-center w-full mt-6">
              Iniciar sesión
            </a>
          </div>
        } @else {
          <div class="py-4">
            <div class="w-14 h-14 rounded-2xl bg-[#FDF0F0] text-[#A62828] border border-[#F8C8C8] flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
              ⚠️
            </div>
            <h2 class="text-xl sm:text-2xl font-display font-bold text-[#2B231F]">No se pudo verificar</h2>
            <p class="text-sm text-[#A62828] mt-2 font-medium" role="alert">
              El enlace es inválido o ha expirado.
            </p>
            <button
              type="button"
              (click)="verify()"
              class="button-primary inline-flex items-center justify-center w-full mt-6"
            >
              Volver a intentar
            </button>
            <div class="mt-4">
              <a routerLink="/login" class="text-xs sm:text-sm text-[#6E1F2B] font-semibold hover:underline">
                Volver a Iniciar sesión
              </a>
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .button-primary {
      @apply h-12 rounded-xl bg-[#6E1F2B] px-5 text-sm font-semibold text-white hover:bg-[#541721] active:scale-[0.98] flex items-center justify-center transition-all shadow-sm shadow-[#6E1F2B]/20;
    }
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private token = '';
  protected readonly loading = signal(true);
  protected readonly verified = signal(false);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.verify();
  }

  protected verify(): void {
    if (!this.token) {
      this.loading.set(false);
      this.verified.set(false);
      return;
    }
    this.loading.set(true);
    this.auth.verifyEmail({ token: this.token }).subscribe({
      next: () => { this.loading.set(false); this.verified.set(true); },
      error: () => { this.loading.set(false); this.verified.set(false); },
    });
  }
}