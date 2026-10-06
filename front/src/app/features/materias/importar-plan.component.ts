import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Materia } from '../../core/models';
import { MateriasService } from './materias.service';
import { PdfPlanService } from './pdf-plan.service';
import { MAX_TEXTO_PLAN, MateriaPlan, ResultadoImportacion, normalizarNombreMateria } from './plan-estudios.model';

interface FilaPlan extends MateriaPlan { id: number; seleccionada: boolean; }

@Component({
  selector: 'app-importar-plan',
  imports: [FormsModule],
  templateUrl: './importar-plan.component.html',
  styleUrl: './importar-plan.component.css',
})
export class ImportarPlanComponent {
  private readonly servicio = inject(MateriasService);
  private readonly pdf = inject(PdfPlanService);
  private readonly destroyRef = inject(DestroyRef);
  private analisis?: Subscription;
  private intento = 0;
  readonly materiasExistentes = input<Materia[]>([]);
  readonly importado = output<Materia[]>();
  protected readonly maxTexto = MAX_TEXTO_PLAN;
  protected readonly modo = signal<'pdf' | 'texto'>('pdf');
  protected readonly archivo = signal<File | null>(null);
  protected readonly texto = signal('');
  protected readonly procesando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly progreso = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly advertencias = signal<string[]>([]);
  protected readonly filas = signal<FilaPlan[]>([]);
  protected readonly resultado = signal<ResultadoImportacion | null>(null);
  private readonly nombresExistentesDelPlan = signal<string[]>([]);
  protected readonly vista = computed(() => {
    const existentes = new Set([
      ...this.materiasExistentes().map(m => normalizarNombreMateria(m.nombre)),
      ...this.nombresExistentesDelPlan(),
    ]);
    const vistos = new Set(existentes);
    return this.filas().map(fila => {
      const key = normalizarNombreMateria(fila.nombre);
      const existente = existentes.has(key);
      const repetida = !existente && vistos.has(key);
      const invalida = !key || fila.nombre.trim().length > 150 ||
        (fila.anioCursado !== null && (!Number.isInteger(fila.anioCursado) || fila.anioCursado < 1 || fila.anioCursado > 20));
      const incluida = fila.seleccionada && !existente && !repetida && !invalida;
      if (incluida) vistos.add(key);
      return { ...fila, existente, repetida, invalida, incluida };
    });
  });
  protected readonly seleccionadas = computed(() => this.vista().filter(f => f.incluida).map(f => ({
    nombre: f.nombre.trim(), anioCursado: f.anioCursado, cuatrimestre: f.cuatrimestre,
  })));
  protected readonly omitidas = computed(() => this.vista().filter(f => f.existente || f.repetida).length);
  protected readonly hayInvalidas = computed(() => this.vista().some(f => f.seleccionada && !f.existente && !f.repetida && f.invalida));

  constructor() { this.destroyRef.onDestroy(() => { this.intento++; }); }

  protected cambiarModo(modo: 'pdf' | 'texto'): void {
    if (this.procesando() || this.guardando()) return;
    this.modo.set(modo); this.error.set(null); this.resultado.set(null);
  }

  protected elegirArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    input.value = '';
    this.error.set(null); this.resultado.set(null);
  }

  protected async analizar(): Promise<void> {
    if (this.procesando() || this.guardando()) return;
    const intento = ++this.intento;
    this.error.set(null); this.resultado.set(null); this.advertencias.set([]);
    this.procesando.set(true); this.progreso.set('Leyendo tu plan…');
    try {
      let texto = this.texto().trim();
      if (this.modo() === 'pdf') {
        const archivo = this.archivo();
        if (!archivo) throw new Error('Elegí el PDF de tu plan de estudios.');
        texto = await this.pdf.leer(archivo, mensaje => { if (intento === this.intento) this.progreso.set(mensaje); });
      }
      if (intento !== this.intento) return;
      if (texto.length < 20 || texto.length > MAX_TEXTO_PLAN) throw new Error('Ingresá el texto del plan: entre 20 y 60000 caracteres.');
      this.progreso.set('Identificando tus materias con IA. Puede tardar hasta un minuto…');
      this.analisis = this.servicio.analizarPlan(texto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: vista => {
          if (intento !== this.intento) return;
          this.filas.set(vista.materias.map((m, id) => ({ nombre: m.nombre, anioCursado: m.anioCursado, cuatrimestre: m.cuatrimestre, id, seleccionada: true })));
          this.nombresExistentesDelPlan.set(vista.materias.filter(m => m.existe).map(m => normalizarNombreMateria(m.nombre)));
          this.advertencias.set(vista.advertencias);
          this.procesando.set(false);
          if (!vista.materias.length) this.error.set('No se reconocieron materias. Revisá que el documento contenga el plan de estudios y probá de nuevo.');
        },
        error: error => {
          if (intento !== this.intento) return;
          this.error.set(this.mensajeError(error, 'No pudimos analizar el plan. Conservamos tu archivo para que reintentes.'));
          this.procesando.set(false);
        },
      });
    } catch (error) {
      if (intento !== this.intento) return;
      this.error.set(error instanceof Error ? error.message : 'No pudimos leer el PDF. Probá con otro archivo.');
      this.procesando.set(false);
    }
  }

  protected editar(id: number, datos: Partial<FilaPlan>): void {
    if (this.guardando()) return;
    this.filas.update(filas => filas.map(f => f.id === id ? { ...f, ...datos } : f));
    this.error.set(null);
  }

  protected guardar(): void {
    if (this.guardando() || this.procesando() || this.hayInvalidas() || !this.seleccionadas().length) return;
    this.guardando.set(true); this.error.set(null);
    this.servicio.importarPlan(this.seleccionadas()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resultado => {
        // Incluye las coincidencias que ya se omitieron durante la vista previa.
        const omitidasEnVista = this.vista().filter(f => f.existente || f.repetida).map(f => f.nombre.trim());
        this.resultado.set({ creadas: resultado.creadas, omitidas: [...omitidasEnVista, ...resultado.omitidas] });
        this.filas.set([]); this.advertencias.set([]); this.guardando.set(false);
        this.importado.emit(resultado.creadas);
      },
      error: error => { this.error.set(this.mensajeError(error, 'No pudimos guardar las materias. Conservamos la lista para que reintentes.')); this.guardando.set(false); },
    });
  }

  protected cancelar(): void {
    if (this.guardando()) return;
    this.intento++; this.analisis?.unsubscribe();
    this.filas.set([]); this.advertencias.set([]); this.error.set(null);
    this.procesando.set(false); this.resultado.set(null);
  }

  private mensajeError(error: { status?: number; error?: { message?: string | string[] } }, fallback: string): string {
    if (error.status === 429) return 'Alcanzaste el límite de análisis. Esperá un rato antes de volver a intentar; podés seguir cargando materias manualmente.';
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : message || fallback;
  }
}
