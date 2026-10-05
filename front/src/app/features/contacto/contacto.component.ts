import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-contacto',
  imports: [ReactiveFormsModule],
  template: `
    <section class="contact" id="contacto" aria-labelledby="contact-title">
      <div class="contact-copy">
        <p class="eyebrow">Estamos del otro lado</p>
        <h2 id="contact-title">¿Algo no funciona?<br>Contame.</h2>
        <p>Si tenés un problema, una duda o una idea para mejorar Tempo, dejá tu mensaje. Te respondo por mail.</p>
        <a [href]="'mailto:' + email">{{ email }} <span aria-hidden="true">↗</span></a>
        <small>No incluyas contraseñas ni datos sensibles.</small>
      </div>
      <form [formGroup]="form" (ngSubmit)="enviar()" novalidate [attr.aria-busy]="enviando()">
        <div class="fields">
          <label for="contact-name">Tu nombre
            <input id="contact-name" formControlName="nombre" class="field" autocomplete="name" maxlength="80" [attr.aria-invalid]="invalido('nombre')" aria-describedby="contact-name-error" placeholder="¿Cómo te llamás?" />
            <small id="contact-name-error" class="field-error">@if (invalido('nombre')) { Escribí un nombre de al menos 2 caracteres. }</small>
          </label>
          <label for="contact-email">Tu email
            <input id="contact-email" type="email" formControlName="email" class="field" autocomplete="email" maxlength="254" [attr.aria-invalid]="invalido('email')" aria-describedby="contact-email-error" placeholder="Para poder responderte" />
            <small id="contact-email-error" class="field-error">@if (invalido('email')) { Ingresá un email válido. }</small>
          </label>
        </div>
        <label for="contact-reason">¿En qué te puedo ayudar?
          <select id="contact-reason" formControlName="motivo" class="field"><option value="problema">Tengo un problema</option><option value="consulta">Tengo una consulta</option><option value="sugerencia">Quiero proponer una mejora</option></select>
        </label>
        <label for="contact-message">Tu mensaje
          <textarea id="contact-message" formControlName="mensaje" class="field" rows="5" maxlength="3000" placeholder="Contame qué pasó y en qué pantalla. Si aparece un error, copiá el mensaje acá." [attr.aria-invalid]="invalido('mensaje')" aria-describedby="contact-message-error"></textarea>
          <small id="contact-message-error" class="field-error">@if (invalido('mensaje')) { Escribí entre 10 y 3000 caracteres. }</small>
        </label>
        <div class="honeypot" aria-hidden="true"><label>Sitio web<input formControlName="website" tabindex="-1" autocomplete="off" /></label></div>
        @if (error()) { <p class="form-error" role="alert">{{ error() }} Tu mensaje se conserva para que puedas reintentar.</p> }
        @if (enviado()) { <p class="form-success" role="status">Mensaje enviado. Te voy a responder al email que indicaste.</p> }
        <div class="form-bottom"><small>Tu mensaje llegará a Sebastián, creador de Tempo.</small><button class="button-primary" type="submit" [disabled]="enviando()">{{ enviando() ? 'Enviando...' : 'Enviar mensaje →' }}</button></div>
      </form>
    </section>
  `,
  styles: `
    :host { display: block; }
    .contact { display: grid; grid-template-columns: .9fr 1.1fr; gap: 70px; max-width: 1176px; margin: auto; padding: 90px 32px; color: var(--ink); }
    .eyebrow { color: var(--accent); font: 600 .68rem 'JetBrains Mono',monospace; text-transform: uppercase; letter-spacing: .12em; }
    h2 { font: 700 clamp(2.3rem,4vw,3.3rem)/1.06 var(--font-display); margin: 20px 0; }
    .contact-copy>p:not(.eyebrow) { color: var(--muted); max-width: 36ch; font-size: .9rem; line-height: 1.8; }
    .contact-copy>a { display: inline-block; margin: 24px 0 14px; color: var(--accent); font-size: .8rem; overflow-wrap: anywhere; }
    .contact-copy>small { display: block; color: var(--muted); font-size: .72rem; }
    form { display: grid; gap: 14px; padding: 26px; background: var(--card); border: 1px solid var(--border); border-radius: 18px; box-shadow: var(--shadow-soft); }
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    label { display: flex; flex-direction: column; gap: 7px; min-width: 0; font-size: .75rem; font-weight: 600; }
    .field { width: 100%; font-size: .8rem; font-weight: 400; }
    textarea { resize: vertical; min-height: 130px; }
    .field-error { font-size: .68rem; color: var(--error-text); font-weight: 400; }
    .field[aria-invalid=true] { border-color: var(--error-text); }
    .form-error,.form-success { border: 1px solid var(--error-border); border-radius: .65rem; background: var(--error-bg); color: var(--error-text); padding: .8rem; font-size: .78rem; line-height: 1.5; }
    .form-success { border-color: var(--success-border); background: var(--success-bg); color: var(--success-text); }
    .form-bottom { display: flex; align-items: center; gap: 20px; justify-content: space-between; }
    .form-bottom>small { color: var(--muted); font-size: .65rem; line-height: 1.6; }
    .button-primary { padding: 12px 18px; background: var(--accent); color: white; border: 0; font-size: .78rem; white-space: nowrap; }
    button:disabled { opacity: .6; cursor: wait; }
    .honeypot { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    @media(max-width:900px) { .contact { gap: 35px; } }
    @media(max-width:640px) { .contact { padding: 64px 22px; grid-template-columns: 1fr; } form { padding: 20px; } .fields { grid-template-columns: 1fr; } .form-bottom { align-items: stretch; flex-direction: column; gap: 12px; } }
  `,
})
export class ContactoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly email = 'sebastiangonzalez100106@gmail.com';
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    motivo: 'problema',
    mensaje: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
    website: '',
  });

  protected invalido(campo: 'nombre' | 'email' | 'mensaje'): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.invalid;
  }

  protected enviar(): void {
    if (this.enviando()) return;
    for (const campo of ['nombre', 'email', 'mensaje'] as const) this.form.controls[campo].setValue(this.form.controls[campo].value.trim());
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enviando.set(true);
    this.enviado.set(false);
    this.error.set(null);
    this.http.post<{ mensaje: string }>('/contacto', this.form.getRawValue()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
        this.form.controls.mensaje.reset('');
        this.toast.success('Mensaje enviado a Sebastián. ¡Gracias por ayudarnos a mejorar Tempo!');
      },
      error: (error: { status: number }) => {
        this.enviando.set(false);
        this.error.set(error.status === 429 ? 'Esperá unos minutos antes de enviar otro mensaje.' : 'No pudimos enviar el mensaje. Podés escribir directamente al mail de contacto.');
      },
    });
  }
}
