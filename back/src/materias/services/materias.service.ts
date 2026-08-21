import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MateriasRepository } from '../repositories/materias.repository';
import { Materia } from '../entities/materia.entity';

@Injectable()
export class MateriasService {
  constructor(private readonly materiasRepository: MateriasRepository) {}

  async obtenerTodas(usuarioId: string) {
    return this.materiasRepository.buscarPorUsuario(usuarioId);
  }

  async obtenerPorId(id: string, usuarioId: string): Promise<Materia> {
    const materia = await this.materiasRepository.findById(id);
    if (!materia) {
      throw new NotFoundException(`No se encontró la materia con id ${id}`);
    }
    if (materia.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tenés acceso a esta materia');
    }
    return materia;
  }

  async crear(data: Partial<Materia>, usuarioId: string) {
    return this.materiasRepository.create({ ...data, usuarioId });
  }

  async actualizar(id: string, datos: Partial<Materia>, usuarioId: string): Promise<Materia> {
    await this.obtenerPorId(id, usuarioId); // ya valida existencia Y pertenencia
    const actualizada = await this.materiasRepository.update(id, datos);
    if (!actualizada) {
      throw new NotFoundException(`No se encontró la materia con id ${id}`);
    }
    return actualizada;
  }

  async eliminar(id: string, usuarioId: string): Promise<void> {
    await this.obtenerPorId(id, usuarioId); // ya valida existencia Y pertenencia
    await this.materiasRepository.delete(id);
  }
}