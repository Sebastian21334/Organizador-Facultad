import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { TareasRepository } from '../repositories/tareas.repository';
import { Tarea, EstadoTarea } from '../entities/tarea.entity';
import { MailService } from '../../mail/services/mail.service';
import { MateriasRepository } from '../../materias/repositories/materias.repository';
import { EstadoMateria } from '../../materias/entities/materia.entity';
import { LimitesService } from '../../usuarios/services/limites.service';
import { randomUUID } from 'node:crypto';
import { PaginacionDto } from '../../paginacion.dto';

@Injectable()
export class TareasService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TareasService.name);
  private timer?: NodeJS.Timeout;
  private static readonly MAX_ESPERA = 3_600_000;
  private programacion = 0;
  private destruido = false;
  private enviandoRecordatorios = false;

  constructor(
    private readonly tareasRepository: TareasRepository,
    private readonly mailService: MailService,
    private readonly materiasRepository: MateriasRepository,
    private readonly limites: LimitesService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reprogramar();
  }

  onModuleDestroy(): void {
    this.destruido = true;
    this.programacion++;
    clearTimeout(this.timer);
  }

  async reprogramar(): Promise<void> {
    clearTimeout(this.timer);
    if (this.destruido) return;
    const programacion = ++this.programacion;
    let espera = TareasService.MAX_ESPERA;
    try {
      const proximo = await this.tareasRepository.proximoAviso();
      if (proximo) {
        espera = Math.min(
          Math.max(proximo.getTime() - Date.now(), 5_000),
          TareasService.MAX_ESPERA,
        );
      }
    } catch {
      espera = 300_000;
    }
    // Una consulta anterior o el cierre no deben dejar temporizadores huérfanos.
    if (programacion !== this.programacion || this.destruido) return;
    this.timer = setTimeout(() => void this.ciclo(), espera);
  }

  private async ciclo(): Promise<void> {
    await this.enviarRecordatorios();
    await this.reprogramar();
  }

  private async enviarRecordatorios(): Promise<void> {
    if (this.enviandoRecordatorios) return;
    this.enviandoRecordatorios = true;
    try {
      const ahora = new Date();
      const limiteBusqueda = new Date(ahora.getTime() + 43200 * 60_000);
      const tareas =
        await this.tareasRepository.findRecordatoriosVencidos(limiteBusqueda);

      for (const tarea of tareas) {
        const minutos = tarea.usuario?.recordatorioEmailHabilitado
          ? (tarea.recordatorioMinutos ?? tarea.usuario.recordatorioMinutos)
          : null;
        if (!tarea.fechaLimite || !tarea.usuario?.email || !minutos) {
          continue;
        }

        const momentoAviso = new Date(
          tarea.fechaLimite.getTime() - minutos * 60_000,
        );
        if (momentoAviso > ahora) {
          continue;
        }

        const intentoId = randomUUID();
        if (
          !(await this.tareasRepository.reclamarRecordatorio(
            tarea.id!,
            intentoId,
            tarea,
          ))
        )
          continue;

        try {
          await this.limites.consumir(
            'recordatorios-usuario-dia',
            tarea.usuarioId,
            20,
            86_400_000,
          );
          await this.mailService.enviarRecordatorio(
            tarea.usuario.email,
            {
              nombre: tarea.usuario.nombre || 'estudiante',
              titulo: tarea.titulo || 'Actividad pendiente',
              fechaLimite: tarea.fechaLimite,
              materia: tarea.materia?.nombre,
              tipo: tarea.tipo,
            },
            tarea.usuarioId,
          );
          await this.tareasRepository.marcarRecordatorioEnviado(
            tarea.id!,
            intentoId,
          );
        } catch {
          // Mantener la reserva evita reintentos inmediatos y tormentas de correo.
          this.logger.warn(
            'No se pudo completar un recordatorio; se reintentará después de la reserva.',
          );
        }
      }
    } catch {
      this.logger.error('No se pudieron procesar los recordatorios');
    } finally {
      this.enviandoRecordatorios = false;
    }
  }

  async obtenerTodas(
    usuarioId: string,
    paginacion = new PaginacionDto(),
  ): Promise<Tarea[]> {
    return this.tareasRepository.findAll(usuarioId, paginacion);
  }

  async obtenerPorId(id: string, usuarioId: string): Promise<Tarea> {
    const tarea = await this.tareasRepository.findById(id, usuarioId);
    if (!tarea) {
      throw new NotFoundException(`No se encontró la tarea con id ${id}`);
    }
    if (tarea.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tenés acceso a esta tarea');
    }
    return tarea;
  }

  async obtenerParaCalendario(
    desde: Date,
    hasta: Date,
    usuarioId: string,
  ): Promise<Tarea[]> {
    return this.tareasRepository.findEnRango(desde, hasta, usuarioId);
  }

  async crear(datos: Partial<Tarea>, usuarioId: string): Promise<Tarea> {
    await this.limites.consumir(
      'tareas-creadas-dia',
      usuarioId,
      200,
      86_400_000,
    );
    const seguros = await this.datosSeguros(datos, usuarioId);
    if (seguros.materia && seguros.materia.estado !== EstadoMateria.REGULAR) {
      throw new BadRequestException(
        'Solo podés crear tareas de materias en estado Regular.',
      );
    }
    const creada = await this.tareasRepository.create({
      ...seguros,
      usuarioId,
    });
    void this.reprogramar();
    return creada;
  }

  async marcarComoHecha(id: string, usuarioId: string): Promise<Tarea> {
    await this.obtenerPorId(id, usuarioId); // valida existencia y pertenencia
    const actualizada = await this.tareasRepository.update(
      id,
      {
        estado: EstadoTarea.HECHA,
      },
      usuarioId,
    );
    void this.reprogramar();
    return actualizada!;
  }

  async actualizar(
    id: string,
    datos: Partial<Tarea>,
    usuarioId: string,
  ): Promise<Tarea> {
    await this.obtenerPorId(id, usuarioId);
    const seguros = await this.datosSeguros(datos, usuarioId);
    if (
      datos.fechaLimite !== undefined ||
      datos.recordatorioMinutos !== undefined
    ) {
      seguros.recordatorioEnviadoEn = null;
      // Un envío iniciado antes de reprogramar no puede confirmar la nueva fecha.
      seguros.recordatorioIntentoId = null;
      seguros.recordatorioBloqueadoHasta = null;
    }
    const actualizada = await this.tareasRepository.update(
      id,
      seguros,
      usuarioId,
    );
    if (!actualizada) throw new NotFoundException('Tarea no encontrada');
    void this.reprogramar();
    return actualizada;
  }

  async eliminar(id: string, usuarioId: string): Promise<void> {
    await this.obtenerPorId(id, usuarioId);
    await this.tareasRepository.delete(id, usuarioId);
    void this.reprogramar();
  }

  private async datosSeguros(
    datos: Partial<Tarea>,
    usuarioId: string,
  ): Promise<Partial<Tarea>> {
    const seguros: Partial<Tarea> = {};
    for (const campo of [
      'titulo',
      'descripcion',
      'tipo',
      'estado',
      'fechaLimite',
      'recordatorioMinutos',
      'origen',
    ] as const) {
      if (datos[campo] !== undefined)
        (seguros as Record<string, unknown>)[campo] = datos[campo];
    }
    if (datos.materia === null) {
      seguros.materia = null;
    } else if (datos.materia) {
      const materia = await this.materiasRepository.findById(
        datos.materia.id,
        usuarioId,
      );
      if (!materia) throw new NotFoundException('Materia no encontrada');
      seguros.materia = materia;
    }
    return seguros;
  }
}
