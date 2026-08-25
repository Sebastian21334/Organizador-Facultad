import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto mt-10 bg-[#FFFEFA] rounded-lg border border-[#D9D3C2] shadow-sm p-6">
      <h1 class="text-2xl font-display font-bold text-[#3A2A22]">Crear cuenta</h1>
      <p class="text-sm text-[#8C8570] mt-1 mb-6">Empezá a organizar tu cursada.</p>
      @if (success()) {
        <p class="rounded-md bg-[#E7EEE1] px-3 py-2 text-sm text-[#3F6B4A]" role="status">{{ success() }}</p>
      } @else {
      <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-4">
        <label class="block text-sm text-[#5B5748]">Nombre
          <input type="text" formControlName="nombre" class="field" autocomplete="name" />
        </label>
        <label class="block text-sm text-[#5B5748]">Email
          <input type="email" formControlName="email" class="field" autocomplete="email" />
        </label>
        <label class="block text-sm text-[#5B5748]">Contraseña
          <input type="password" formControlName="password" class="field" autocomplete="new-password" />
        </label>
        <label class="block text-sm text-[#5B5748]">Confirmar contraseña
          <input type="password" formControlName="confirmarPassword" class="field" autocomplete="new-password" />
        </label>
        @if (form.controls.email.invalid && form.controls.email.touched) { <p class="text-sm text-[#B3401A]">Ingresá un email válido.</p> }
        @if (form.controls.password.hasError('minlength') && form.controls.password.touched) { <p class="text-sm text-[#B3401A]">La contraseña debe tener al menos 6 caracteres.</p> }
        @if (form.hasError('passwordMismatch') && form.controls.confirmarPassword.touched) { <p class="text-sm text-[#B3401A]">Las contraseñas no coinciden.</p> }
        @if (error()) { <p class="text-sm text-[#B3401A]" role="alert">{{ error() }}</p> }
        <button type="submit" [disabled]="loading()" class="button-primary w-full">{{ loading() ? 'Creando cuenta...' : 'Registrarme' }}</button>
      </form>
      }
      <p class="text-sm text-[#8C8570] mt-5 text-center">¿Ya tenés cuenta? <a routerLink="/login" class="auth-link font-medium hover:underline">Iniciá sesión</a></p>
    </section>
  `,
  styles: `
    .field { @apply mt-1 w-full border border-[#D9D3C2] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9C2AC]; }
    .button-primary { @apply rounded-md bg-[#6E1F2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F1620] disabled:opacity-50; }
    .auth-link { color: #6E1F2B; }
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