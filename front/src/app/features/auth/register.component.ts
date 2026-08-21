import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h1 class="text-2xl font-semibold text-slate-800">Crear cuenta</h1>
      <p class="text-sm text-slate-500 mt-1 mb-6">Empezá a organizar tu cursada.</p>
      @if (success()) {
        <p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{{ success() }}</p>
      } @else {
      <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
        <label class="block text-sm text-slate-600">Nombre
          <input type="text" formControlName="nombre" class="field" autocomplete="name" />
        </label>
        <label class="block text-sm text-slate-600">Email
          <input type="email" formControlName="email" class="field" autocomplete="email" />
        </label>
        <label class="block text-sm text-slate-600">Contraseña
          <input type="password" formControlName="password" class="field" autocomplete="new-password" />
        </label>
        <label class="block text-sm text-slate-600">Confirmar contraseña
          <input type="password" formControlName="confirmarPassword" class="field" autocomplete="new-password" />
        </label>
        @if (form.controls.email.invalid && form.controls.email.touched) { <p class="text-sm text-red-600">Ingresá un email válido.</p> }
        @if (form.controls.password.hasError('minlength') && form.controls.password.touched) { <p class="text-sm text-red-600">La contraseña debe tener al menos 6 caracteres.</p> }
        @if (form.hasError('passwordMismatch') && form.controls.confirmarPassword.touched) { <p class="text-sm text-red-600">Las contraseñas no coinciden.</p> }
        @if (error()) { <p class="text-sm text-red-600" role="alert">{{ error() }}</p> }
        <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Creando cuenta...' : 'Registrarme' }}</button>
      </form>
      }
      <p class="text-sm text-slate-500 mt-5 text-center">¿Ya tenés cuenta? <a routerLink="/login" class="text-slate-800 font-medium hover:underline">Iniciá sesión</a></p>
    </section>
  `,
  styles: `
    .field { @apply mt-1 w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300; }
    .button-primary { @apply rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50; }
  `,
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', Validators.required],
  }, { validators: (group) => group.get('password')?.value === group.get('confirmarPassword')?.value ? null : { passwordMismatch: true } });
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
    const { email, password, nombre } = this.form.getRawValue();
    this.auth.register({ email, password, nombre }).subscribe({
      next: ({ mensaje }) => { this.loading.set(false); this.success.set(mensaje || 'Revisá tu email para confirmar tu cuenta.'); },
      error: (error) => { this.loading.set(false); this.error.set(this.messageFromError(error, 'No se pudo crear la cuenta.')); },
    });
  }

  private messageFromError(error: { error?: { message?: string | string[] } }, fallback: string): string {
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : message || fallback;
  }
}
