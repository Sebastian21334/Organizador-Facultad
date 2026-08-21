import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Materia } from '../entities/materia.entity';

@Injectable()
export class MateriasRepository {
  constructor(
    @InjectRepository(Materia)
    private readonly repo: Repository<Materia>,
  ) {}

  async findAll(): Promise<Materia[]> {
    return this.repo.find();
  }

  async findById(id: string): Promise<Materia | null> {
    return this.repo.findOneBy({ id });
  }

  async create(data: Partial<Materia>): Promise<Materia> {
    const nueva = this.repo.create(data);
    return this.repo.save(nueva);
  }

  async update(id: string, data: Partial<Materia>): Promise<Materia | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const resultado = await this.repo.delete(id);
    return (resultado.affected ?? 0) > 0;
  }

  async buscarPorUsuario(usuarioId: string) {
    return this.repo.find({ where: { usuarioId } });
  }
}