import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-[#FFFEFA] rounded-lg border border-[#D9D3C2] shadow-sm p-6">
      <h1 class="text-2xl font-display font-bold text-[#3A2A22]">Restablecer contraseña</h1>
      <p class="text-sm text-[#8C8570] mt-1 mb-6">Elegí una nueva contraseña para tu cuenta.</p>
      @if (success()) {
        <p class="rounded-md bg-[#E7EEE1] px-3 py-2 text-sm text-[#3F6B4A]" role="status">{{ success() }}</p>
      } @else {
        <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
          <label class="block text-sm text-[#5B5748]">Nueva contraseña
            <input type="password" formControlName="nuevaPassword" class="field" autocomplete="new-password" />
          </label>
          <label class="block text-sm text-[#5B5748]">Confirmar contraseña
            <input type="password" formControlName="confirmarPassword" class="field" autocomplete="new-password" />
          </label>
          @if (form.controls.nuevaPassword.hasError('minlength') && form.controls.nuevaPassword.touched) { <p class="text-sm text-[#B3401A]">La contraseña debe tener al menos 6 caracteres.</p> }
          @if (form.hasError('passwordMismatch') && form.controls.confirmarPassword.touched) { <p class="text-sm text-[#B3401A]">Las contraseñas no coinciden.</p> }
          @if (error()) { <p class="text-sm text-[#B3401A]" role="alert">{{ error() }}</p> }
          <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Guardando...' : 'Cambiar contraseña' }}</button>
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
export class ResetPasswordComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private token = '';
  protected readonly form = this.formBuilder.nonNullable.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', Validators.required],
  }, { validators: (group) => group.get('nuevaPassword')?.value === group.get('confirmarPassword')?.value ? null : { passwordMismatch: true } });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.error.set('El link es inválido o expiró.');
  }

  protected submit(): void {
    if (!this.token) {
      this.error.set('El link es inválido o expiró.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.resetPassword({ token: this.token, nuevaPassword: this.form.getRawValue().nuevaPassword }).subscribe({
      next: ({ mensaje }) => {
        this.loading.set(false);
        this.success.set(mensaje || 'Contraseña actualizada. Te redirigiremos al inicio de sesión.');
        setTimeout(() => void this.router.navigate(['/login']), 2500);
      },
      error: () => { this.loading.set(false); this.error.set('El link es inválido o expiró.'); },
    });
  }
}