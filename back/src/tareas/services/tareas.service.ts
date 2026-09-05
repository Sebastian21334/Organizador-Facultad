import { Injectable, Logger, NotFoundException, ForbiddenException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TareasRepository } from '../repositories/tareas.repository';
import { Tarea, EstadoTarea } from '../entities/tarea.entity';
import { MailService } from '../../mail/services/mail.service';

@Injectable()
export class TareasService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TareasService.name);
  private recordatoriosInterval?: NodeJS.Timeout;

  constructor(
    private readonly tareasRepository: TareasRepository,
    private readonly mailService: MailService,
  ) {}

  onModuleInit(): void {
    void this.enviarRecordatorios();
    this.recordatoriosInterval = setInterval(() => void this.enviarRecordatorios(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.recordatoriosInterval) {
      clearInterval(this.recordatoriosInterval);
    }
  }

  private async enviarRecordatorios(): Promise<void> {
    const ahora = new Date();
    const limiteBusqueda = new Date(ahora.getTime() + 43200 * 60_000);
    const tareas = await this.tareasRepository.findRecordatoriosVencidos(limiteBusqueda);

    for (const tarea of tareas) {
      const minutos = tarea.usuario?.recordatorioEmailHabilitado
        ? tarea.usuario.recordatorioMinutos
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

      try {
        await this.mailService.enviarMail(
          tarea.usuario.email,
          `Recordatorio: ${tarea.titulo}`,
          `Tu tarea "${tarea.titulo}" vence el ${tarea.fechaLimite.toLocaleString('es-AR')}.`,
          `<p>Recordatorio de tarea</p><p><strong>${tarea.titulo}</strong> vence el ${tarea.fechaLimite.toLocaleString('es-AR')}.</p>`,
        );
        await this.tareasRepository.marcarRecordatorioEnviado(tarea.id!);
      } catch (error) {
        this.logger.error(`No se pudo enviar el recordatorio de la tarea ${tarea.id}`, error);
      }
    }
  }

  async obtenerTodas(usuarioId: string): Promise<Tarea[]> {
    return this.tareasRepository.findAll(usuarioId);
  }

  async obtenerPorId(id: string, usuarioId: string): Promise<Tarea> {
    const tarea = await this.tareasRepository.findById(id);
    if (!tarea) {
      throw new NotFoundException(`No se encontró la tarea con id ${id}`);
    }
    if (tarea.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tenés acceso a esta tarea');
    }
    return tarea;
  }

  async obtenerParaCalendario(desde: Date, hasta: Date, usuarioId: string): Promise<Tarea[]> {
    return this.tareasRepository.findEnRango(desde, hasta, usuarioId);
  }

  async crear(datos: Partial<Tarea>, usuarioId: string): Promise<Tarea> {
    return this.tareasRepository.create({ ...datos, usuarioId });
  }

  async marcarComoHecha(id: string, usuarioId: string): Promise<Tarea> {
    await this.obtenerPorId(id, usuarioId); // valida existencia y pertenencia
    const actualizada = await this.tareasRepository.update(id, {
      estado: EstadoTarea.HECHA,
    });
    return actualizada!;
  }

  async actualizar(id: string, datos: Partial<Tarea>, usuarioId: string): Promise<Tarea> {
    await this.obtenerPorId(id, usuarioId);
    const actualizada = await this.tareasRepository.update(id, datos);
    return actualizada!;
  }

  async eliminar(id: string, usuarioId: string): Promise<void> {
    await this.obtenerPorId(id, usuarioId);
    await this.tareasRepository.delete(id);
  }
}