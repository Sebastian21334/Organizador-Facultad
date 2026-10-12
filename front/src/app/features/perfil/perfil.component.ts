import { passwordBytes, passwordLength } from '../../core/services/password-policy';
import { ChangeDetectorRef, Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PushPreferencesComponent } from '../../shared/components/push-preferences.component';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, PushPreferencesComponent],
  template: `
    <div class="max-w-md mx-auto space-y-6 py-8">
      <section class="card">
        <p class="section-label">Perfil</p>
        <h1 class="page-title">Tu perfil</h1>
        @if (loadingPerfil()) {
          <p class="help-text" role="status">Cargando tu perfil…</p>
        }
        @if (!loadingPerfil() && !perfilCargado()) {
          <button type="button" class="button-primary mt-4" (click)="cargarPerfil()">Reintentar carga</button>
        }

        @if (successNombre()) {
          <p class="message-success" role="status">{{ successNombre() }}</p>
        }

        <form id="perfil-nombre-form" (ngSubmit)="guardarNombre()" [formGroup]="nombreForm" class="space-y-4 mt-5">
          <label class="block text-sm text-[#5B5748]">
            Nombre completo (obligatorio)
            <input type="text" formControlName="nombre" class="field" autocomplete="name" required
              [attr.aria-invalid]="nombreForm.controls.nombre.invalid && nombreForm.controls.nombre.touched"
              [attr.aria-describedby]="nombreForm.controls.nombre.invalid && nombreForm.controls.nombre.touched ? 'nombre-error' : null" />
          </label>

          @if (nombreForm.controls.nombre.invalid && nombreForm.controls.nombre.touched) {
            <p id="nombre-error" class="message-error">{{ nombreForm.controls.nombre.hasError('maxlength') ? 'El nombre debe tener hasta 80 caracteres.' : 'Ingresá tu nombre; no puede contener sólo espacios.' }}</p>
          }

          @if (errorNombre()) {
            <p class="message-error" role="alert">{{ errorNombre() }}</p>
          }

          <button type="submit" [disabled]="loadingNombre() || loadingRecordatorio() || !perfilCargado()" class="button-primary w-full">
            {{ loadingNombre() ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </form>
      </section>

      <section id="recordatorios" class="card" [class.recordatorio-destacado]="mostrarAvisoInicial()">
        <p class="section-label">Recordatorios</p>
        <h2 class="sub-title">Avisos por email</h2>
        <p class="help-text">Se aplicará el mismo aviso a todas tus tareas con fecha límite.</p>

        @if (mostrarAvisoInicial()) {
          <div class="recordatorio-bienvenida" role="status">
            Configurá este aviso una sola vez y se aplicará a todas tus materias.
          </div>
        }

        @if (successRecordatorio()) {
          <p class="message-success" role="status">{{ successRecordatorio() }}</p>
        }

        <form id="perfil-recordatorio-form" (ngSubmit)="guardarRecordatorio()" [formGroup]="recordatorioForm" class="space-y-4 mt-5">
          <label class="toggle-row">
            <input type="checkbox" formControlName="habilitado" />
            <span>Recibir recordatorios por email</span>
          </label>

          @if (recordatorioForm.controls.habilitado.value) {
            <div class="reminder-fields">
              <label class="block text-sm text-[#5B5748]">
                Anticipación (obligatoria)
                <input type="number" formControlName="cantidad" min="1" max="30" step="1" class="field" required
                  [attr.aria-invalid]="recordatorioForm.controls.cantidad.invalid && recordatorioForm.controls.cantidad.touched"
                  [attr.aria-describedby]="recordatorioForm.controls.cantidad.invalid && recordatorioForm.controls.cantidad.touched ? 'cantidad-help cantidad-error' : 'cantidad-help'" />
              </label>

              <label class="block text-sm text-[#5B5748]">
                Unidad
                <select formControlName="unidad" class="field">
                  <option value="horas">horas antes</option>
                  <option value="dias">días antes</option>
                </select>
              </label>
            </div>
            <p id="cantidad-help" class="help-text">Elegí un número entero entre 1 y 30, en horas o días.</p>
            @if (recordatorioForm.controls.cantidad.invalid && recordatorioForm.controls.cantidad.touched) {
              <p id="cantidad-error" class="message-error">Ingresá un número entero entre 1 y 30.</p>
            }
          }

          @if (errorRecordatorio()) {
            <p class="message-error" role="alert">{{ errorRecordatorio() }}</p>
          }

          <button type="submit" [disabled]="loadingRecordatorio() || loadingNombre() || !perfilCargado()" class="button-primary w-full">
            {{ loadingRecordatorio() ? 'Guardando...' : 'Guardar recordatorio' }}
          </button>
        </form>
      </section>

      <app-push-preferences />

      <section class="card">
        <p class="section-label">Seguridad</p>
        <h2 class="sub-title">Cambiar contraseña</h2>

        @if (successPassword()) {
          <p class="message-success" role="status">{{ successPassword() }}</p>
        }

        <form id="perfil-password-form" (ngSubmit)="cambiarPassword()" [formGroup]="passwordForm" class="space-y-4 mt-5">
          <p class="help-text">Los tres campos son obligatorios.</p>
          <label class="block text-sm text-[#5B5748]">
            Contraseña actual
            <input type="password" formControlName="contraseñaActual" class="field" autocomplete="current-password" required
              [attr.aria-invalid]="passwordForm.controls['contraseñaActual'].invalid && passwordForm.controls['contraseñaActual'].touched"
              [attr.aria-describedby]="passwordForm.controls['contraseñaActual'].invalid && passwordForm.controls['contraseñaActual'].touched ? 'password-actual-error' : null" />
          </label>
          @if (passwordForm.controls['contraseñaActual'].invalid && passwordForm.controls['contraseñaActual'].touched) {
            <p id="password-actual-error" class="message-error">Ingresá tu contraseña actual.</p>
          }

          <label class="block text-sm text-[#5B5748]">
            Nueva contraseña
            <input type="password" formControlName="nuevaPassword" class="field" autocomplete="new-password" required
              [attr.aria-invalid]="passwordForm.controls.nuevaPassword.invalid && passwordForm.controls.nuevaPassword.touched"
              [attr.aria-describedby]="passwordForm.controls.nuevaPassword.invalid && passwordForm.controls.nuevaPassword.touched ? 'password-help password-error' : 'password-help'" />
          </label>
          <p id="password-help" class="help-text">Usá una frase de al menos 15 caracteres. Máximo 72 bytes; los emojis y algunas letras ocupan varios bytes.</p>
          @if (passwordForm.controls.nuevaPassword.invalid && passwordForm.controls.nuevaPassword.touched) {
            <p id="password-error" class="message-error">{{ passwordForm.controls.nuevaPassword.hasError('required') ? 'Ingresá una nueva contraseña.' : passwordForm.controls.nuevaPassword.hasError('passwordBytes') || passwordForm.controls.nuevaPassword.hasError('maxlength') ? 'La contraseña supera el máximo de 72 bytes. Acortá la frase.' : 'La contraseña debe tener al menos 15 caracteres.' }}</p>
          }

          <label class="block text-sm text-[#5B5748]">
            Confirmar nueva contraseña
            <input type="password" formControlName="confirmarPassword" class="field" autocomplete="new-password" required
              [attr.aria-invalid]="(passwordForm.hasError('passwordMismatch') || passwordForm.controls.confirmarPassword.invalid) && passwordForm.controls.confirmarPassword.touched"
              [attr.aria-describedby]="(passwordForm.hasError('passwordMismatch') || passwordForm.controls.confirmarPassword.invalid) && passwordForm.controls.confirmarPassword.touched ? 'confirmar-password-error' : null" />
          </label>

          @if ((passwordForm.hasError('passwordMismatch') || passwordForm.controls.confirmarPassword.invalid) && passwordForm.controls.confirmarPassword.touched) {
            <p id="confirmar-password-error" class="message-error">{{ passwordForm.controls.confirmarPassword.hasError('required') ? 'Repetí la nueva contraseña.' : 'Las contraseñas no coinciden.' }}</p>
          }

          @if (errorPassword()) {
            <p class="message-error" role="alert">{{ errorPassword() }}</p>
          }

          <button type="submit" [disabled]="loadingPassword()" class="button-primary w-full">
            {{ loadingPassword() ? 'Cambiando...' : 'Cambiar contraseña' }}
          </button>
        </form>
      </section>
    </div>
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

    .help-text {
      margin: 0.45rem 0 0;
      color: #8c8570;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .recordatorio-destacado {
      border-color: #6e1f2b;
      box-shadow: 0 0 0 4px rgba(110, 31, 43, 0.1);
    }

    .recordatorio-bienvenida {
      margin-top: 1rem;
      border: 1px solid #e2c2c7;
      border-radius: 0.5rem;
      background: #fbf3f4;
      color: #6e1f2b;
      padding: 0.7rem 0.8rem;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: #5b5748;
      font-size: 0.9rem;
    }

    .toggle-row input {
      accent-color: #6e1f2b;
      width: 1rem;
      height: 1rem;
    }

    .reminder-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    @media (max-width: 480px) {
      .reminder-fields {
        grid-template-columns: 1fr;
      }
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly nombreForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
  });

  protected readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      contraseñaActual: ['', Validators.required],
      nuevaPassword: ['', [Validators.required, passwordLength, passwordBytes]],
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
  protected readonly loadingPerfil = signal(false);
  protected readonly perfilCargado = signal(false);
  private nombreConfirmado = '';
  protected readonly loadingPassword = signal(false);
  protected readonly errorNombre = signal<string | null>(null);
  protected readonly errorPassword = signal<string | null>(null);
  protected readonly successNombre = signal<string | null>(null);
  protected readonly successPassword = signal<string | null>(null);
  protected readonly loadingRecordatorio = signal(false);
  protected readonly errorRecordatorio = signal<string | null>(null);
  protected readonly successRecordatorio = signal<string | null>(null);
  protected readonly mostrarAvisoInicial = signal(false);

  protected readonly recordatorioForm = this.formBuilder.nonNullable.group({
    habilitado: false,
    cantidad: [1, [Validators.required, Validators.min(1), Validators.max(30), Validators.pattern(/^\d+$/)]],
    unidad: 'dias' as 'horas' | 'dias',
  });

  ngOnInit(): void {
    const claveAviso = 'tempo-recordatorios-perfil-v1';
    try {
      const esPrimeraVisita = localStorage.getItem(claveAviso) !== 'visto';
      this.mostrarAvisoInicial.set(esPrimeraVisita);
      if (esPrimeraVisita) localStorage.setItem(claveAviso, 'visto');
    } catch {
      // El aviso es opcional: una preferencia bloqueada no debe impedir cargar el perfil.
      this.mostrarAvisoInicial.set(true);
    }
    this.cargarPerfil();
  }

  protected cargarPerfil(): void {
    if (this.loadingPerfil()) return;
    this.loadingPerfil.set(true);
    this.errorNombre.set(null);
    this.auth.getPerfil().subscribe({
      next: ({ nombre, recordatorioEmailHabilitado, recordatorioMinutos }) => {
        this.loadingPerfil.set(false);
        this.perfilCargado.set(true);
        this.nombreConfirmado = nombre ?? '';
        this.nombreForm.patchValue({ nombre: nombre ?? '' });
        if (recordatorioEmailHabilitado) {
          this.mostrarAvisoInicial.set(false);
        }
        this.recordatorioForm.patchValue({
          habilitado: recordatorioEmailHabilitado,
          cantidad: this.cantidadRecordatorio(recordatorioMinutos),
          unidad: this.unidadRecordatorio(recordatorioMinutos),
        });
      },
      error: (error) => {
        this.loadingPerfil.set(false);
        this.errorNombre.set(this.messageFromError(error, 'No se pudo cargar tu perfil.'));
      },
    });
  }

  protected guardarRecordatorio(): void {
    if (this.loadingRecordatorio() || this.loadingNombre() || !this.perfilCargado()) return;
    if (this.recordatorioForm.controls.habilitado.value && this.recordatorioForm.invalid) {
      this.recordatorioForm.markAllAsTouched();
      this.focusFirstInvalid('perfil-recordatorio-form');
      return;
    }
    if (!this.nombreConfirmado.trim()) {
      this.errorRecordatorio.set('Guardá tu nombre en la sección Perfil antes de configurar recordatorios.');
      this.host.nativeElement.querySelector<HTMLElement>('#perfil-nombre-form input')?.focus();
      return;
    }

    this.loadingRecordatorio.set(true);
    this.errorRecordatorio.set(null);
    this.successRecordatorio.set(null);

    const { habilitado, cantidad, unidad } = this.recordatorioForm.getRawValue();
    const minutos = habilitado ? cantidad * (unidad === 'dias' ? 1440 : 60) : null;
    // Esta acción guarda preferencias; nunca debe guardar un borrador del nombre.
    this.auth.actualizarPerfil(this.nombreConfirmado, {
      recordatorioEmailHabilitado: habilitado,
      recordatorioMinutos: minutos,
    }).subscribe({
      next: () => {
        this.loadingRecordatorio.set(false);
        this.mostrarAvisoInicial.set(false);
        this.successRecordatorio.set('Preferencia de recordatorios guardada con éxito.');
      },
      error: (error) => {
        this.loadingRecordatorio.set(false);
        this.errorRecordatorio.set(this.messageFromError(error, 'No se pudo guardar el recordatorio.'));
      },
    });
  }

  protected guardarNombre(): void {
    if (this.loadingNombre() || this.loadingRecordatorio() || !this.perfilCargado()) return;
    if (this.nombreForm.invalid) {
      this.nombreForm.markAllAsTouched();
      this.focusFirstInvalid('perfil-nombre-form');
      return;
    }

    this.loadingNombre.set(true);
    this.errorNombre.set(null);
    this.successNombre.set(null);

    const nombre = this.nombreForm.getRawValue().nombre.trim();

    this.auth.actualizarPerfil(nombre).subscribe({
      next: ({ mensaje }) => {
        this.loadingNombre.set(false);
        this.nombreConfirmado = nombre;
        this.successNombre.set(mensaje || 'Nombre actualizado con éxito.');
      },
      error: (error) => {
        this.loadingNombre.set(false);
        this.errorNombre.set(this.messageFromError(error, 'No se pudo guardar el nombre.'));
      },
    });
  }

  protected cambiarPassword(): void {
    if (this.loadingPassword()) return;
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.focusFirstInvalid('perfil-password-form');
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

  private focusFirstInvalid(formId: string): void {
    this.changeDetector.detectChanges();
    this.host.nativeElement.querySelector<HTMLElement>(`#${formId} input[aria-invalid="true"]`)?.focus();
  }

  private messageFromError(error: { error?: { message?: string | string[] } }, fallback: string): string {
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : message || fallback;
  }

  private unidadRecordatorio(minutos: number | null): 'horas' | 'dias' {
    return minutos && minutos % 1440 === 0 ? 'dias' : 'horas';
  }

  private cantidadRecordatorio(minutos: number | null): number {
    if (!minutos) return 1;
    return minutos % 1440 === 0 ? minutos / 1440 : Math.ceil(minutos / 60);
  }
}
