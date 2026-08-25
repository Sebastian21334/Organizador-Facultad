import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule],
  template: `
    <main class="max-w-md mx-auto space-y-6 py-8">
      <section class="card">
        <p class="section-label">Perfil</p>
        <h1 class="page-title">Tu perfil</h1>

        @if (successNombre()) {
          <p class="message-success" role="status">{{ successNombre() }}</p>
        }

        <form (ngSubmit)="guardarNombre()" [formGroup]="nombreForm" class="space-y-4 mt-5">
          <label class="block text-sm text-[#5B5748]">
            Nombre completo
            <input type="text" formControlName="nombre" class="field" autocomplete="name" />
          </label>

          @if (nombreForm.controls.nombre.invalid && nombreForm.controls.nombre.touched) {
            <p class="message-error">Ingresá tu nombre.</p>
          }

          @if (errorNombre()) {
            <p class="message-error" role="alert">{{ errorNombre() }}</p>
          }

          <button type="submit" [disabled]="loadingNombre()" class="button-primary w-full">
            {{ loadingNombre() ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </form>
      </section>

      <section class="card">
        <p class="section-label">Seguridad</p>
        <h2 class="sub-title">Cambiar contraseña</h2>

        @if (successPassword()) {
          <p class="message-success" role="status">{{ successPassword() }}</p>
        }

        <form (ngSubmit)="cambiarPassword()" [formGroup]="passwordForm" class="space-y-4 mt-5">
          <label class="block text-sm text-[#5B5748]">
            Contraseña actual
            <input type="password" formControlName="contraseñaActual" class="field" autocomplete="current-password" />
          </label>

          <label class="block text-sm text-[#5B5748]">
            Nueva contraseña
            <input type="password" formControlName="nuevaPassword" class="field" autocomplete="new-password" />
          </label>

          <label class="block text-sm text-[#5B5748]">
            Confirmar nueva contraseña
            <input type="password" formControlName="confirmarPassword" class="field" autocomplete="new-password" />
          </label>

          @if (passwordForm.controls.nuevaPassword.invalid && passwordForm.controls.nuevaPassword.touched) {
            <p class="message-error">La contraseña debe tener al menos 6 caracteres.</p>
          }

          @if (passwordForm.hasError('passwordMismatch') && passwordForm.controls.confirmarPassword.touched) {
            <p class="message-error">Las contraseñas no coinciden.</p>
          }

          @if (errorPassword()) {
            <p class="message-error" role="alert">{{ errorPassword() }}</p>
          }

          <button type="submit" [disabled]="loadingPassword()" class="button-primary w-full">
            {{ loadingPassword() ? 'Cambiando...' : 'Cambiar contraseña' }}
          </button>
        </form>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      color: #3a2a22;
    }

    .card {
      background: #fffefa;
      border: 1px solid #d9d3c2;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 2px rgba(34, 48, 77, 0.04);
    }

    .page-title {
      margin: 0.15rem 0 0;
      font-family: 'Fraunces', Georgia, serif;
      font-size: 2rem;
      font-weight: 700;
      color: #3a2a22;
    }

    .sub-title {
      margin: 0.15rem 0 0;
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #3a2a22;
    }

    .section-label {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #8c8570;
      font-family: 'SFMono-Regular', Consolas, monospace;
    }

    .field {
      margin-top: 0.35rem;
      width: 100%;
      border: 1px solid #d9d3c2;
      border-radius: 0.5rem;
      background: #fffefa;
      padding: 0.7rem 0.8rem;
      color: #3a2a22;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .field:focus {
      border-color: #c9c2ac;
      box-shadow: 0 0 0 3px rgba(110, 31, 43, 0.12);
    }

    .button-primary {
      border: none;
      border-radius: 0.5rem;
      background: #6e1f2b;
      color: #efebdf;
      padding: 0.75rem 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .button-primary:hover:not(:disabled) {
      background: #4f1620;
    }

    .button-primary:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .message-success {
      margin: 0.75rem 0 0;
      border: 1px solid #c3d4b4;
      background: #e7eee1;
      color: #3f6b4a;
      border-radius: 0.5rem;
      padding: 0.7rem 0.85rem;
      font-size: 0.9rem;
    }

    .message-error {
      margin: 0.35rem 0 0;
      color: #b3401a;
      font-size: 0.85rem;
    }
  `,
})
export class PerfilComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly nombreForm = this.formBuilder.nonNullable.group({
    nombre: ['', Validators.required],
  });

  protected readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      contraseñaActual: ['', Validators.required],
      nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', Validators.required],
    },
    {
      validators: (group) =>
        group.get('nuevaPassword')?.value === group.get('confirmarPassword')?.value
          ? null
          : { passwordMismatch: true },
    },
  );

  protected readonly loadingNombre = signal(false);
  protected readonly loadingPassword = signal(false);
  protected readonly errorNombre = signal<string | null>(null);
  protected readonly errorPassword = signal<string | null>(null);
  protected readonly successNombre = signal<string | null>(null);
  protected readonly successPassword = signal<string | null>(null);

  ngOnInit(): void {
    this.auth.getPerfil().subscribe({
      next: ({ nombre }) => {
        this.nombreForm.patchValue({ nombre: nombre ?? '' });
      },
      error: (error) => {
        this.errorNombre.set(this.messageFromError(error, 'No se pudo cargar tu perfil.'));
      },
    });
  }

  protected guardarNombre(): void {
    if (this.nombreForm.invalid) {
      this.nombreForm.markAllAsTouched();
      return;
    }

    this.loadingNombre.set(true);
    this.errorNombre.set(null);
    this.successNombre.set(null);

    const { nombre } = this.nombreForm.getRawValue();

    this.auth.actualizarPerfil(nombre).subscribe({
      next: ({ mensaje }) => {
        this.loadingNombre.set(false);
        this.successNombre.set(mensaje || 'Nombre actualizado con éxito.');
      },
      error: (error) => {
        this.loadingNombre.set(false);
        this.errorNombre.set(this.messageFromError(error, 'No se pudo guardar el nombre.'));
      },
    });
  }

  protected cambiarPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.loadingPassword.set(true);
    this.errorPassword.set(null);
    this.successPassword.set(null);

    const { contraseñaActual, nuevaPassword } = this.passwordForm.getRawValue();

    this.auth.cambiarPassword(contraseñaActual, nuevaPassword).subscribe({
      next: ({ mensaje }) => {
        this.loadingPassword.set(false);
        this.successPassword.set(mensaje || 'La contraseña se actualizó correctamente.');
        this.passwordForm.reset({
          contraseñaActual: '',
          nuevaPassword: '',
          confirmarPassword: '',
        });
      },
      error: (error) => {
        this.loadingPassword.set(false);
        this.errorPassword.set(this.messageFromError(error, 'No se pudo cambiar la contraseña.'));
      },
    });
  }

  private messageFromError(error: { error?: { message?: string | string[] } }, fallback: string): string {
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : message || fallback;
  }
}
