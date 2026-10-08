import { Component, inject } from '@angular/core';
import { PwaPlatformService } from '../../core/services/pwa-platform.service';

@Component({
  selector: 'app-install-instructions',
  template: `
    @if (pwa.installed()) {
      <p role="status">Tempo ya está instalada en este dispositivo.</p>
    } @else {
      <p>
        Usá la versión mobile de Tempo desde tu pantalla de inicio, con tus tareas y calendario a
        mano.
      </p>
      @if (pwa.platform === 'ios-safari' || pwa.platform === 'ios-other') {
        @if (pwa.platform === 'ios-other') {
          <p>Primero abrí esta página en Safari.</p>
        }
        <ol>
          <li>Tocá <strong>Compartir</strong> en Safari (el cuadrado con la flecha).</li>
          <li>Elegí <strong>Agregar a pantalla de inicio</strong>.</li>
          <li>Tocá <strong>Agregar</strong> y abrí Tempo desde el nuevo ícono.</li>
        </ol>
        <p>
          En iPhone y iPad, las notificaciones solo funcionan con la app instalada y con iOS/iPadOS
          16.4 o posterior.
        </p>
      } @else if (pwa.canInstall()) {
        <button type="button" class="button-primary" (click)="pwa.install()">Instalar</button>
      } @else {
        <p>
          Abrí el menú de tu navegador y buscá <strong>Instalar app</strong> o
          <strong>Agregar a pantalla de inicio</strong>. En escritorio también podés usar el ícono
          de instalación de la barra de direcciones.
        </p>
        <p>
          Si la opción no aparece, probá con Chrome o Edge actualizado y comprobá que estés
          conectado.
        </p>
      }
    }
    @if (pwa.error()) {
      <p role="alert">{{ pwa.error() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      color: var(--ink-secondary);
      line-height: 1.65;
    }
    p {
      margin: 0.75rem 0;
    }
    ol {
      padding-left: 1.4rem;
      list-style: decimal;
    }
    li {
      margin: 0.5rem 0;
    }
    button {
      margin: 0.5rem 0;
    }
  `,
})
export class InstallInstructionsComponent {
  protected readonly pwa = inject(PwaPlatformService);
}
