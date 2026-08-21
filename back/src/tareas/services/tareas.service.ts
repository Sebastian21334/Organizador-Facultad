import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TareasRepository } from '../repositories/tareas.repository';
import { Tarea, EstadoTarea } from '../entities/tarea.entity';

@Injectable()
export class TareasService {
  constructor(private readonly tareasRepository: TareasRepository) {}

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