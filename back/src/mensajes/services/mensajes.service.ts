import { Injectable } from '@nestjs/common';
import { MensajesRepository } from '../repositories/mensajes.repository';
import { IaService } from '../../ia/services/ia.service';
import { TareasService } from '../../tareas/services/tareas.service';
import { MateriasRepository } from '../../materias/repositories/materias.repository';
import { MensajeEntrante, FuenteMensaje } from '../entities/mensaje-entrante.entity';
import { Materia } from '../../materias/entities/materia.entity';
import { TipoTarea, OrigenTarea } from '../../tareas/entities/tarea.entity';

@Injectable()
export class MensajesService {
  constructor(
    private readonly mensajesRepository: MensajesRepository,
    private readonly iaService: IaService,
    private readonly tareasService: TareasService,
    private readonly materiasRepository: MateriasRepository,
  ) {}

  async obtenerTodos(usuarioId: string): Promise<MensajeEntrante[]> {
    return this.mensajesRepository.findAll(usuarioId);
  }

  private readonly UMBRAL_CONFIANZA_MINIMA = 0.5;

  async procesarMensaje(texto: string, fuente: FuenteMensaje, usuarioId: string): Promise<MensajeEntrante> {
    // 1. Guardamos el mensaje crudo primero, sin importar qué pase después
    const mensaje = await this.mensajesRepository.create({ textoOriginal: texto, fuente, usuarioId });

    // 2. Traemos las materias del usuario: se las pasamos a la IA para que reconozca
    //    coincidencias semánticas (ej: "Bases" -> "Bases de Datos"), y reutilizamos la misma
    //    lista después como respaldo con fuzzy match, sin pegarle dos veces a la base.
    const materiasExistentes = await this.materiasRepository.buscarPorUsuario(usuarioId);
    const resultadoIA = await this.iaService.extraerTarea(
      texto,
      materiasExistentes.map((m) => m.nombre),
    );




    // Si la IA no está lo suficientemente segura, no creamos tarea: guardamos el mensaje
    // con la aclaración que la propia IA redactó, para que el frontend la muestre como
    // una respuesta de chat y el usuario pueda reenviar con más detalle.
    if (resultadoIA.confianza < this.UMBRAL_CONFIANZA_MINIMA) {
      const actualizado = await this.mensajesRepository.update(mensaje.id, {
        procesado: true,
        resultadoIA: resultadoIA as any,
      });
        return actualizado!;
      }

    // 3. Buscamos la materia por nombre (tolerando typos/mayúsculas), o la creamos si no existe.
    //    Esto queda como red de seguridad por si la IA no devolvió el nombre exacto.
    let materia: Materia | undefined;
    if (resultadoIA.materia) {
      materia = await this.resolverMateria(resultadoIA.materia, usuarioId, materiasExistentes);
    }

    // 4. Creamos la tarea (si la IA logró extraer al menos un título)
    const tarea = await this.tareasService.crear(
      {
        titulo: resultadoIA.titulo,
        descripcion: resultadoIA.descripcion ?? undefined,
        tipo: resultadoIA.tipo as TipoTarea,
        fechaLimite: resultadoIA.fecha ? new Date(resultadoIA.fecha) : undefined,
        materia,
        origen: fuente === FuenteMensaje.WHATSAPP ? OrigenTarea.WHATSAPP : OrigenTarea.IA_CHAT,
      },
      usuarioId,
    );

    // 5. Actualizamos el mensaje con el resultado y la tarea generada
    const actualizado = await this.mensajesRepository.update(mensaje.id, {
      procesado: true,
      resultadoIA: resultadoIA as any,
      tareaGenerada: tarea,
    });

    return actualizado!;
  }

  /**
   * Busca una materia ya existente (del mismo usuario) cuyo nombre "se parezca" al
   * detectado por la IA (ignorando mayúsculas, tildes, espacios extra y typos menores).
  * Si no encuentra ninguna razonablemente parecida, devuelve undefined sin crear una materia.
   */
  private async resolverMateria(
    nombreDetectado: string,
    usuarioId: string,
    materiasPrecargadas?: Materia[],
  ): Promise<Materia | undefined> {
    const normalizadoDetectado = this.normalizar(nombreDetectado);
    const todas = materiasPrecargadas ?? (await this.materiasRepository.buscarPorUsuario(usuarioId));

    let mejorCoincidencia: Materia | undefined;
    let mejorDistancia = Infinity;

    for (const m of todas) {
      const normalizadoExistente = this.normalizar(m.nombre);

      if (normalizadoExistente === normalizadoDetectado) {
        return m;
      }

      if (
        normalizadoExistente.includes(normalizadoDetectado) ||
        normalizadoDetectado.includes(normalizadoExistente)
      ) {
        mejorCoincidencia = m;
        mejorDistancia = 0;
        continue;
      }

      const distancia = this.distanciaLevenshtein(normalizadoExistente, normalizadoDetectado);
      const largoMax = Math.max(normalizadoExistente.length, normalizadoDetectado.length);
      const distanciaRelativa = distancia / largoMax;

      if (distanciaRelativa <= 0.2 && distancia < mejorDistancia) {
        mejorCoincidencia = m;
        mejorDistancia = distancia;
      }
    }

    if (mejorCoincidencia) {
      return mejorCoincidencia;
    }

    return undefined;
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private capitalizar(texto: string): string {
    return texto
      .split(' ')
      .map((palabra) => (palabra ? palabra[0].toUpperCase() + palabra.slice(1) : palabra))
      .join(' ');
  }

  private distanciaLevenshtein(a: string, b: string): number {
    const filas = a.length + 1;
    const columnas = b.length + 1;
    const matriz: number[][] = Array.from({ length: filas }, () => new Array(columnas).fill(0));

    for (let i = 0; i < filas; i++) matriz[i][0] = i;
    for (let j = 0; j < columnas; j++) matriz[0][j] = j;

    for (let i = 1; i < filas; i++) {
      for (let j = 1; j < columnas; j++) {
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        matriz[i][j] = Math.min(
          matriz[i - 1][j] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j - 1] + costo,
        );
      }
    }

    return matriz[filas - 1][columnas - 1];
  }
}