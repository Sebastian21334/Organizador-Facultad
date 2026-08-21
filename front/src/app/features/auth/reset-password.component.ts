import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h1 class="text-2xl font-semibold text-slate-800">Restablecer contraseña</h1>
      <p class="text-sm text-slate-500 mt-1 mb-6">Elegí una nueva contraseña para tu cuenta.</p>
      @if (success()) {
        <p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{{ success() }}</p>
      } @else {
        <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
          <label class="block text-sm text-slate-600">Nueva contraseña
            <input type="password" formControlName="nuevaPassword" class="field" autocomplete="new-password" />
          </label>
          <label class="block text-sm text-slate-600">Confirmar contraseña
            <input type="password" formControlName="confirmarPassword" class="field" autocomplete="new-password" />
          </label>
          @if (form.controls.nuevaPassword.hasError('minlength') && form.controls.nuevaPassword.touched) { <p class="text-sm text-red-600">La contraseña debe tener al menos 6 caracteres.</p> }
          @if (form.hasError('passwordMismatch') && form.controls.confirmarPassword.touched) { <p class="text-sm text-red-600">Las contraseñas no coinciden.</p> }
          @if (error()) { <p class="text-sm text-red-600" role="alert">{{ error() }}</p> }
          <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Guardando...' : 'Cambiar contraseña' }}</button>
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