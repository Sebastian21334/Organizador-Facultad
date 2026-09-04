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
    <div class="mensajes-page flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden">
      <!-- Header Superior Moderno tipo Mensajería -->
      <header class="shrink-0 z-20 bg-[#FAF6EE]/90 backdrop-blur-md border-b border-[#D8CBAE] px-4 py-2.5 sm:px-6 shadow-xs">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative flex-shrink-0">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#6E1F2B] to-[#4F1620] text-[#FAF6EE] flex items-center justify-center font-display font-bold text-base shadow-sm ring-2 ring-[#F3DFE2]">
                T
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="font-display font-bold text-base sm:text-lg text-[#2B231F] leading-tight">
                  Tempo Asistente
                </h1>
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#F3DFE2] text-[#6E1F2B]">
                  IA
                </span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot"></span>
                <p class="text-xs text-[#7A6F66]">
                  En línea · Organizador de tareas
                </p>
              </div>
            </div>
          </div>

          <div class="hidden sm:flex items-center gap-2 text-xs text-[#7A6F66] bg-[#F3EFE6] px-3 py-1.5 rounded-full border border-[#E5DFD3]">
            <svg class="w-3.5 h-3.5 text-[#6E1F2B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Escribí en lenguaje natural</span>
          </div>
        </div>
      </header>

      <!-- Flujo de Mensajes / Conversación -->
      <div
        #scrollContainer
        class="flex-1 min-h-0 overflow-y-auto chat-scroll px-3 sm:px-6 py-4 overscroll-contain"
      >
        <div class="max-w-4xl mx-auto flex flex-col justify-end min-h-full space-y-4">
          @if (cargando()) {
            <div class="py-12">
              <app-loader mensaje="Cargando tu conversación..." />
            </div>
          } @else if (error() && mensajes().length === 0) {
            <div class="py-8">
              <app-error [mensaje]="error()" />
            </div>
          } @else if (mensajesOrdenados().length === 0 && !textoPendiente()) {
            <!-- Empty State Amigable con Sugerencias Rápidas -->
            <div class="my-auto py-8 px-4 flex flex-col items-center text-center animate-message-in">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F3DFE2] to-[#FFF5F6] border border-[#E2C2C7] flex items-center justify-center text-2xl shadow-sm mb-4">
                ✨
              </div>
              <h2 class="text-xl sm:text-2xl font-display font-bold text-[#2B231F]">
                ¿Qué tenés que preparar hoy?
              </h2>
              <p class="text-sm text-[#5E534B] max-w-md mt-1.5 leading-relaxed">
                Escribile a Tempo cualquier compromiso o tarea de la facultad y la IA lo interpretará para agendarlo automáticamente.
              </p>

              <!-- Sugerencias de ejemplo como Chips clickeables -->
              <div class="mt-6 w-full max-w-md">
                <p class="text-[11px] font-mono uppercase tracking-wider text-[#968A7E] mb-2.5">
                  Podés probar con estos ejemplos:
                </p>
                <div class="flex flex-wrap justify-center gap-2">
                  @for (sug of sugerencias; track sug) {
                    <button
                      type="button"
                      (click)="usarSugerencia(sug)"
                      class="text-xs text-left bg-white hover:bg-[#F3DFE2]/40 active:scale-95 border border-[#D5CBB9] hover:border-[#6E1F2B]/40 text-[#5E534B] hover:text-[#6E1F2B] px-3 py-2 rounded-xl transition shadow-xs"
                    >
                      💬 {{ sug }}
                    </button>
                  }
                </div>
              </div>
            </div>
          } @else {
            <!-- Lista de Mensajes -->
            @for (m of mensajesOrdenados(); track m.id) {
              <!-- 1. Burbuja del Usuario -->
              <div class="flex justify-end animate-message-in">
                <div class="max-w-[85%] sm:max-w-[70%] bg-gradient-to-br from-[#6E1F2B] via-[#661c28] to-[#4F1620] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-sm shadow-[#6E1F2B]/20">
                  <p class="text-[14px] leading-relaxed break-words whitespace-pre-wrap selection:bg-[#FAF6EE] selection:text-[#6E1F2B]">
                    {{ m.textoOriginal }}
                  </p>
                  <div class="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-[#F3DFE2]/75">
                    <span>{{ m.fechaRecibido | date: 'shortTime' : undefined : 'es-AR' }}</span>
                    <!-- Icono doble check -->
                    <svg class="w-3.5 h-3.5 text-[#F3DFE2]" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- 2. Burbuja de Respuesta de la IA -->
              <div class="flex justify-start gap-2.5 max-w-[92%] sm:max-w-[78%] animate-message-in">
                <!-- Avatar de la IA -->
                <div class="w-7 h-7 rounded-full bg-[#F3DFE2] border border-[#E2C2C7] text-[#6E1F2B] flex items-center justify-center text-xs font-bold shrink-0 self-end mb-1">
                  T
                </div>

                <div
                  class="rounded-2xl rounded-tl-xs px-4 py-3 text-sm border transition-shadow shadow-xs w-full"
                  [class.bg-[#FAFDF9]]="m.procesado && m.tareaGenerada"
                  [class.border-[#BCE3C8]]="m.procesado && m.tareaGenerada"
                  [class.bg-[#FEFCF7]]="m.procesado && !m.tareaGenerada && m.resultadoIA?.aclaracion"
                  [class.border-[#F6DFB3]]="m.procesado && !m.tareaGenerada && m.resultadoIA?.aclaracion"
                  [class.bg-[#FFFFFF]]="!(m.procesado && m.tareaGenerada) && !(m.procesado && m.resultadoIA?.aclaracion)"
                  [class.border-[#E5DFD3]]="!(m.procesado && m.tareaGenerada) && !(m.resultadoIA?.aclaracion)"
                >
                  <!-- CASO A: Tarea Creada Exitosamente -->
                  @if (m.procesado && m.tareaGenerada) {
                    <div class="flex items-center gap-1.5 text-xs font-semibold text-[#1E6E38] pb-2 border-b border-[#E0F2E6]">
                      <svg class="w-4 h-4 text-[#1E6E38] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      <span>Tarea agendada con éxito</span>
                    </div>

                    <h3 class="font-display font-bold text-base text-[#1F2E23] mt-2 mb-2 leading-snug">
                      {{ m.tareaGenerada.titulo }}
                    </h3>

                    @if (m.resultadoIA) {
                      <div class="flex flex-wrap items-center gap-1.5 mt-2">
                        <!-- Materia -->
                        @if (m.tareaGenerada.materia) {
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#EAF6EE] text-[#1E6E38] border border-[#BCE3C8]">
                            📚 {{ m.tareaGenerada.materia.nombre }}
                          </span>
                        } @else if (m.resultadoIA.materia) {
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#FEF8EC] text-[#8C580B] border border-[#F6DFB3]">
                            📚 {{ m.resultadoIA.materia }}
                            <span class="text-[10px] opacity-80">(sin vincular)</span>
                          </span>
                        } @else {
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F3EFE6] text-[#7A6F66] border border-[#E5DFD3]">
                            Sin materia
                          </span>
                        }

                        <!-- Tipo de Tarea -->
                        @if (m.resultadoIA.tipo) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase bg-[#F3EFE6] text-[#5E534B] border border-[#E5DFD3]">
                            {{ m.resultadoIA.tipo }}
                          </span>
                        }

                        <!-- Fecha Límite -->
                        @if (m.resultadoIA.fecha) {
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#FFFFFF] text-[#2B231F] border border-[#D5CBB9]">
                            📅 {{ m.resultadoIA.fecha }}
                          </span>
                        }

                        <!-- Confianza IA -->
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[#7A6F66] bg-[#F3EFE6]/60 ml-auto">
                          IA: {{ (m.resultadoIA.confianza * 100).toFixed(0) }}%
                        </span>
                      </div>
                    }
                  } @else if (m.procesado && m.resultadoIA?.aclaracion) {
                    <!-- CASO B: Aclaración Requerida -->
                    <div class="flex items-center gap-1.5 text-xs font-semibold text-[#8C580B] pb-1.5 border-b border-[#F6DFB3]">
                      <svg class="w-4 h-4 text-[#8C580B] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                      <span>Aclaración de Tempo</span>
                    </div>
                    <p class="text-sm text-[#382E2B] mt-2 leading-relaxed">
                      {{ m.resultadoIA.aclaracion }}
                    </p>
                  } @else if (m.procesado) {
                    <!-- CASO C: Mensaje Recibido sin tarea identificada -->
                    <div class="flex items-start gap-2">
                      <span class="text-base">🤔</span>
                      <p class="text-sm text-[#5E534B] leading-relaxed">
                        Recibí tu mensaje, pero no identifiqué una tarea o fecha clara. Probá agregar datos como la materia y el día (ej: "TP de Álgebra para el martes").
                      </p>
                    </div>
                  } @else {
                    <!-- CASO D: En proceso -->
                    <p class="text-sm text-[#7A6F66] italic flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-[#6E1F2B] animate-ping"></span>
                      Interpretando mensaje...
                    </p>
                  }

                  <!-- Timestamp del Asistente -->
                  <div class="mt-2 pt-1 flex justify-end text-[10px] font-mono text-[#968A7E]">
                    {{ m.fechaRecibido | date: 'shortTime' : undefined : 'es-AR' }}
                  </div>
                </div>
              </div>
            }

            <!-- Mensaje pendiente mientras la IA procesa -->
            @if (enviando() && textoPendiente()) {
              <div class="flex justify-end animate-message-in">
                <div class="max-w-[85%] sm:max-w-[70%] bg-[#6E1F2B]/85 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-sm">
                  <p class="text-[14px] leading-relaxed break-words">{{ textoPendiente() }}</p>
                  <div class="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-[#F3DFE2]/70">
                    <span>Enviando...</span>
                  </div>
                </div>
              </div>

              <!-- Indicador de "Escribiendo / Pensando" -->
              <div class="flex justify-start gap-2.5 animate-message-in">
                <div class="w-7 h-7 rounded-full bg-[#F3DFE2] border border-[#E2C2C7] text-[#6E1F2B] flex items-center justify-center text-xs font-bold shrink-0 self-end mb-1">
                  T
                </div>
                <div class="bg-white border border-[#E5DFD3] rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-3">
                  <span class="flex gap-1 items-center">
                    <span class="w-2 h-2 bg-[#6E1F2B] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span class="w-2 h-2 bg-[#6E1F2B]/75 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span class="w-2 h-2 bg-[#6E1F2B]/50 rounded-full animate-bounce"></span>
                  </span>
                  <span class="text-xs font-medium text-[#6E1F2B]">
                    Tempo está organizando tu tarea...
                  </span>
                </div>
              </div>
            }

            <!-- Error al enviar -->
            @if (error() && mensajes().length > 0) {
              <div class="flex justify-center my-2 animate-message-in">
                <div class="max-w-md bg-[#FDF0F0] border border-[#F8C8C8] text-[#A62828] text-xs sm:text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-xs" role="alert">
                  <svg class="w-4 h-4 shrink-0 text-[#A62828]" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <span>{{ error() }}</span>
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- Barra de Entrada Inferior Ergonómica Mobile-First -->
      <div class="shrink-0 z-20 bg-[#FAF6EE]/95 backdrop-blur-md border-t border-[#D8CBAE] px-3 sm:px-6 py-3 pb-safe shadow-lg">
        <div class="max-w-4xl mx-auto">
          <form
            (ngSubmit)="enviar()"
            class="flex items-center gap-2 bg-[#FFFEFA] border border-[#D8CBAE] focus-within:border-[#6E1F2B] focus-within:ring-2 focus-within:ring-[#6E1F2B]/20 rounded-full px-3 py-1.5 transition-all shadow-inner"
          >
            <input
              [(ngModel)]="texto"
              name="texto"
              (keydown.enter)="$event.preventDefault(); enviar()"
              class="flex-1 bg-transparent px-2 py-2 text-[16px] sm:text-sm text-[#2B231F] outline-none placeholder:text-[#968A7E]"
              placeholder="Escribí una tarea (ej: 'Parcial de Física el martes')..."
              [disabled]="enviando()"
              autocomplete="off"
            />

            <button
              type="submit"
              [disabled]="enviando() || !texto.trim()"
              class="w-11 h-11 sm:w-10 sm:h-10 shrink-0 rounded-full bg-[#6E1F2B] text-white flex items-center justify-center hover:bg-[#541721] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-sm shadow-[#6E1F2B]/25"
              aria-label="Enviar mensaje a Tempo"
            >
              @if (enviando()) {
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              } @else {
                <svg class="h-5 w-5 transform translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.5 12.5l18-8-6 8 6 8-18-8z" />
                </svg>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
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

  protected readonly sugerencias = [
    'Parcial de Redes el 15 de octubre',
    'Entrega TP2 de Bases de Datos para el lunes',
    'Final de Sistemas el jueves 14hs',
    'Estudiar Álgebra para mañana',
  ];

  // El servicio devuelve los mensajes más nuevos primero; para el chat los mostramos
  // en orden cronológico (el más nuevo abajo del todo).
  protected readonly mensajesOrdenados = computed(() => [...this.mensajes()].reverse());

  protected texto = '';

  protected usarSugerencia(sugerencia: string): void {
    this.texto = sugerencia;
  }

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