import {
  Injectable,
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
import { LimitesService } from '../../usuarios/services/limites.service';
import { randomUUID } from 'node:crypto';
import { PaginacionDto } from '../../paginacion.dto';

@Injectable()
export class TareasService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TareasService.name);
  private recordatoriosInterval?: NodeJS.Timeout;
  private enviandoRecordatorios = false;

  constructor(
    private readonly tareasRepository: TareasRepository,
    private readonly mailService: MailService,
    private readonly materiasRepository: MateriasRepository,
    private readonly limites: LimitesService,
  ) {}

  onModuleInit(): void {
    void this.enviarRecordatorios();
    this.recordatoriosInterval = setInterval(
      () => void this.enviarRecordatorios(),
      60_000,
    );
  }

  onModuleDestroy(): void {
    if (this.recordatoriosInterval) {
      clearInterval(this.recordatoriosInterval);
    }
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
          await this.mailService.enviarRecordatorio(tarea.usuario.email, {
            nombre: tarea.usuario.nombre || 'estudiante',
            titulo: tarea.titulo || 'Actividad pendiente',
            fechaLimite: tarea.fechaLimite,
            materia: tarea.materia?.nombre,
            tipo: tarea.tipo,
          });
          await this.tareasRepository.marcarRecordatorioEnviado(
            tarea.id!,
            intentoId,
          );
        } catch (error) {
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
    return this.tareasRepository.create({ ...seguros, usuarioId });
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
    )
      seguros.recordatorioEnviadoEn = null;
    const actualizada = await this.tareasRepository.update(
      id,
      seguros,
      usuarioId,
    );
    if (!actualizada) throw new NotFoundException('Tarea no encontrada');
    return actualizada!;
  }

  async eliminar(id: string, usuarioId: string): Promise<void> {
    await this.obtenerPorId(id, usuarioId);
    await this.tareasRepository.delete(id, usuarioId);
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
    if (datos.materia) {
      const materia = await this.materiasRepository.findById(
        datos.materia.id!,
        usuarioId,
      );
      if (!materia) throw new NotFoundException('Materia no encontrada');
      seguros.materia = materia;
    }
    return seguros;
  }
}
