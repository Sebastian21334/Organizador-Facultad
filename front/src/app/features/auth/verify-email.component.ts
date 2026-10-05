import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="min-h-[100dvh] flex flex-col justify-center items-center px-4 py-8">
      <div class="text-center mb-6">
        <div class="w-12 h-12 rounded-2xl bg-[#6E1F2B] text-[#FAF6EE] font-display font-bold text-2xl grid place-items-center mx-auto mb-3">T</div>
        <h1 class="font-display font-bold text-2xl text-[#2B231F]">Tempo</h1>
        <p class="text-sm text-[#7A6F66]">Tu vida universitaria, en orden.</p>
      </div>
      <section class="w-full max-w-md bg-[#FFFEFA] rounded-3xl border border-[#D8CBAE] shadow-sm p-6 sm:p-8">
        @if (verified()) {
          <h2 class="font-display text-xl text-[#1E6E38]">¡Email confirmado!</h2>
          <p class="text-sm text-[#7A6F66] mt-3" role="status">Tu cuenta ya está lista. Iniciá sesión para entrar a Tempo.</p>
          <a routerLink="/login" class="button-primary mt-6">Iniciar sesión</a>
        } @else {
          <h2 class="font-display text-xl text-[#2B231F]">Confirmá tu cuenta</h2>
          <p class="text-sm text-[#7A6F66] mt-3">Ingresá la contraseña que elegiste al registrarte. Esto evita confirmar por accidente una cuenta creada por otra persona.</p>
          <form [formGroup]="form" (ngSubmit)="verify()" class="mt-5">
            <label for="password" class="block text-sm text-[#5E534B] mb-2">Tu contraseña</label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password" class="w-full rounded-xl border border-[#D8CBAE] px-4 py-3 bg-[#FAF8F5]" />
            @if (error()) { <p class="text-sm text-[#A62828] mt-3" role="alert">{{ error() }}</p> }
            <button type="submit" class="button-primary mt-5 w-full" [disabled]="loading() || !token">{{ loading() ? 'Confirmando…' : 'Confirmar mi cuenta' }}</button>
          </form>
          <a routerLink="/olvide-password" class="block text-sm text-[#6E1F2B] mt-5 hover:underline">¿No recordás la contraseña o no creaste esta cuenta? Recuperá tu acceso.</a>
          <a routerLink="/login" class="block text-sm text-[#6E1F2B] mt-3 hover:underline">Volver al inicio de sesión / solicitar otro enlace</a>
        }
      </section>
    </div>
  `,
  styles: `
    .button-primary { @apply h-12 rounded-xl bg-[#6E1F2B] px-5 text-sm font-semibold text-white hover:bg-[#541721] disabled:opacity-50 flex items-center justify-center transition-all; }
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  protected token = '';
  protected readonly form = inject(FormBuilder).nonNullable.group({ password: ['', Validators.required] });
  protected readonly loading = signal(false);
  protected readonly verified = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    this.location.replaceState(url.pathname + url.search + url.hash);
    if (!/^[a-f0-9]{64}$/.test(this.token)) { this.token = ''; this.error.set('El enlace no es válido. Solicitá uno nuevo desde el inicio de sesión.'); }
  }
  protected verify(): void {
    if (this.loading() || !this.token || this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set(null);
    this.auth.verifyEmail({ token: this.token, password: this.form.getRawValue().password }).subscribe({
      next: () => { this.loading.set(false); this.verified.set(true); this.form.reset(); this.token = ''; },
      error: (error) => {
        this.loading.set(false);
        const message = error.error?.message;
        this.error.set(Array.isArray(message) ? message.join(' ') : message || 'No pudimos confirmar la cuenta. Revisá la contraseña o solicitá otro enlace.');
      },
    });
  }
}
