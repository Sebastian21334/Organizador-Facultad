import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Tarea } from '../entities/tarea.entity';

@Injectable()
export class TareasRepository {
  constructor(
    @InjectRepository(Tarea)
    private readonly repo: Repository<Tarea>,
  ) {}

  async findAll(usuarioId: string): Promise<Tarea[]> {
    return this.repo.find({ where: { usuarioId }, relations: { materia: true } });
  }

  async findById(id: string): Promise<Tarea | null> {
    return this.repo.findOne({ where: { id }, relations: { materia: true } });
  }

  async findEnRango(desde: Date, hasta: Date, usuarioId: string): Promise<Tarea[]> {
    return this.repo.find({
      where: { fechaLimite: Between(desde, hasta), usuarioId },
      relations: { materia: true },
      order: { fechaLimite: 'ASC' },
    });
  }

  async create(data: Partial<Tarea>): Promise<Tarea> {
    const nueva = this.repo.create(data);
    return this.repo.save(nueva);
  }

  async update(id: string, data: Partial<Tarea>): Promise<Tarea | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}