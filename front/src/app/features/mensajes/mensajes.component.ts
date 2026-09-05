import { Component, OnInit, signal, inject, computed, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MensajesService } from './mensajes.service';
import { MensajeEntrante, FuenteMensaje } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader.component';
import { ErrorComponent } from '../../shared/components/error.component';

@Component({
  selector: 'app-mensajes',
  imports: [CommonModule, FormsModule, LoaderComponent, ErrorComponent],
  template: `
    <div class="mensajes-page h-screen flex flex-col">
      <h1 class="title-bar shrink-0">Mensajes</h1>

      <div class="flex-1 min-h-0 flex flex-col max-w-5xl mx-auto w-full px-4 md:px-6 py-4">
        <div class="pb-3 shrink-0">
          <p class="text-xs text-[#8C8570] mt-0.5">
            Escribí algo como "TP de reingeniería para el jueves" y la IA lo convierte en tarea.
          </p>
        </div>

        <div
          #scrollContainer
          class="flex-1 overflow-y-auto rounded-xl border border-[#D9D3C2] bg-[#F5F2E9] p-4 space-y-4 scroll-smooth"
        >
          @if (cargando()) {
            <app-loader mensaje="Cargando mensajes..." />
          } @else if (error() && mensajes().length === 0) {
            <app-error [mensaje]="error()" />
          } @else if (mensajesOrdenados().length === 0 && !textoPendiente()) {
            <div class="h-full flex flex-col items-center justify-center text-center py-12">
              <div class="w-12 h-12 rounded-full bg-[#D9D3C2] flex items-center justify-center text-xl mb-3">
                💬
              </div>
              <p class="text-sm text-[#8C8570] max-w-xs">
                Todavía no escribiste nada. Contame una tarea y la organizo por vos.
              </p>
            </div>
          } @else {
            @for (m of mensajesOrdenados(); track m.id) {
              <!-- Burbuja del usuario -->
              <div class="flex justify-end">
                <div class="max-w-[80%] bg-[#6E1F2B] text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5">
                  <p>{{ m.textoOriginal }}</p>
                  <p class="text-[10px] text-[#C9C2AC] mt-1 text-right">
                    {{ m.fechaRecibido | date: 'short' : undefined : 'es-AR' }}
                  </p>
                </div>
              </div>

              <!-- Burbuja de respuesta -->
              <div class="flex justify-start">
                <div
                  class="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm border"
                  [class.msg-ok-fondo]="m.procesado && m.tareaGenerada"
                  [class.msg-ok-borde]="m.procesado && m.tareaGenerada"
                  [class.msg-default-fondo]="!(m.procesado && m.tareaGenerada)"
                  [class.msg-default-borde]="!(m.procesado && m.tareaGenerada)"
                >
                  @if (m.procesado && m.tareaGenerada) {
                    <p class="text-green-800 font-medium">✓ Tarea creada: {{ m.tareaGenerada.titulo }}</p>
                    @if (m.resultadoIA) {
                      <dl class="mt-1.5 text-xs text-green-700/80 space-y-0.5">
                        <div>
                           @if (m.tareaGenerada.materia) {
                            {{ m.tareaGenerada.materia.nombre }}
                         } @else if (m.resultadoIA.materia) {
                            {{ m.resultadoIA.materia }} <span class="text-amber-600">(sin vincular, creá esta materia)</span>
                          } @else {
                            Sin materia
                          }
                          · {{ m.resultadoIA.tipo }}
                        </div>
                        @if (m.resultadoIA.fecha) {
                          <div>📅 {{ m.resultadoIA.fecha }}</div>
                        }
                        <div>Confianza: {{ (m.resultadoIA.confianza * 100).toFixed(0) }}%</div>
                      </dl>
                    }
                      } @else if (m.procesado && m.resultadoIA?.aclaracion) {
                    <p class="text-[#3A2A22]">{{ m.resultadoIA.aclaracion }}</p>
                  } @else if (m.procesado) {
                    <p class="text-[#5B5748]">Recibí el mensaje, pero no pude armar una tarea con esto.</p>
                  } @else {
                    <p class="text-[#8C8570]">Procesando tu mensaje...</p>
                  }
                </div>
              </div>
            }

            @if (enviando() && textoPendiente()) {
              <div class="flex justify-end">
                <div class="max-w-[80%] bg-[#6E1F2B]/70 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5">
                  {{ textoPendiente() }}
                </div>
              </div>
              <div class="flex justify-start">
                <div class="bg-[#FFFEFA] border border-[#D9D3C2] rounded-2xl rounded-bl-sm px-4 py-3">
                  <span class="flex gap-1">
                    <span class="w-1.5 h-1.5 bg-[#A39C87] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span class="w-1.5 h-1.5 bg-[#A39C87] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span class="w-1.5 h-1.5 bg-[#A39C87] rounded-full animate-bounce"></span>
                  </span>
                </div>
              </div>
            }

            @if (error() && mensajes().length > 0) {
              <div class="flex justify-start">
                <div class="max-w-[80%] bg-[#F6E2DA] border border-[#E8C9B8] text-red-700 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5">
                  {{ error() }}
                </div>
              </div>
            }
          }
        </div>

        <form
          (ngSubmit)="enviar()"
          class="mt-3 shrink-0 flex gap-2 items-center bg-[#FFFEFA] border border-[#D9D3C2] rounded-full px-2 py-1.5 shadow-sm"
        >
          <input
            [(ngModel)]="texto"
            name="texto"
            (keydown.enter)="$event.preventDefault(); enviar()"
            class="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-[#A39C87]"
            placeholder="Escribí tu mensaje..."
            [disabled]="enviando()"
          />
          <button
            type="submit"
            [disabled]="enviando() || !texto.trim()"
            class="w-9 h-9 shrink-0 rounded-full bg-[#6E1F2B] text-white flex items-center justify-center hover:bg-[#4F1620] disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Enviar mensaje"
          >
            @if (enviando()) {
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            } @else {
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.5 12.5l18-8-6 8 6 8-18-8z" />
              </svg>
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: `
    .msg-ok-fondo { background-color: #E7EEE1; }
    .msg-ok-borde { border-color: #C3D4B4; }
    .msg-default-fondo { background-color: #FFFEFA; }
    .msg-default-borde { border-color: #D9D3C2; }
    @media (max-width: 768px) {
      .mensajes-page { height: calc(100dvh - 124px); }
    }
  `,
})
export class MensajesComponent implements OnInit {
  private readonly mensajesService = inject(MensajesService);

  protected readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensajes = signal<MensajeEntrante[]>([]);
  protected readonly textoPendiente = signal<string | null>(null);

  // El servicio devuelve los mensajes más nuevos primero; para el chat los mostramos
  // en orden cronológico (el más nuevo abajo del todo).
  protected readonly mensajesOrdenados = computed(() => [...this.mensajes()].reverse());

  protected texto = '';

  constructor() {
    // Auto-scroll al último mensaje cada vez que cambia la conversación.
    effect(() => {
      this.mensajesOrdenados();
      this.textoPendiente();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.mensajesService.listar().subscribe({
      next: (mensajes) => {
        this.mensajes.set(mensajes);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los mensajes.');
        this.cargando.set(false);
      },
    });
  }

  protected enviar(): void {
    const texto = this.texto.trim();
    if (!texto) return;

    this.textoPendiente.set(texto);
    this.enviando.set(true);
    this.error.set(null);
    this.texto = '';

    this.mensajesService.enviar(texto, FuenteMensaje.CHAT_APP).subscribe({
      next: (mensaje) => {
        this.mensajes.update((lista) => [mensaje, ...lista]);
        this.textoPendiente.set(null);
        this.enviando.set(false);
      },
      error: () => {
        this.error.set('No se pudo procesar el mensaje. Probá de nuevo.');
        this.textoPendiente.set(null);
        this.enviando.set(false);
      },
    });
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}