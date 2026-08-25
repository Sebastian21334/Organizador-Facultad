import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-[#FFFEFA] rounded-lg border border-[#D9D3C2] shadow-sm p-6 text-center">
      @if (loading()) {
        <h1 class="text-2xl font-display font-bold text-[#3A2A22]">Verificando...</h1>
        <p class="text-sm text-[#8C8570] mt-2">Estamos confirmando tu dirección de email.</p>
      } @else if (verified()) {
        <p class="text-4xl" aria-hidden="true">✅</p>
        <h1 class="text-2xl font-display font-bold text-[#3A2A22] mt-3">Email verificado</h1>
        <p class="text-sm text-[#8C8570] mt-2">Ya podés iniciar sesión.</p>
        <a routerLink="/login" class="button-primary inline-block mt-6">Iniciar sesión</a>
      } @else {
        <p class="text-4xl" aria-hidden="true">❌</p>
        <h1 class="text-2xl font-display font-bold text-[#3A2A22] mt-3">No se pudo verificar el email</h1>
        <p class="text-sm text-[#B3401A] mt-2" role="alert">El link es inválido o expiró.</p>
        <button type="button" (click)="verify()" class="button-primary mt-6">Volver a intentar</button>
      }
    </section>
  `,
  styles: `
    .button-primary { @apply rounded-md bg-[#6E1F2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F1620]; }
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