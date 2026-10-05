import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Materia } from '../entities/materia.entity';
import { PaginacionDto } from '../../paginacion.dto';

@Injectable()
export class MateriasRepository {
  constructor(
    @InjectRepository(Materia)
    private readonly repo: Repository<Materia>,
  ) {}

  async findAll(): Promise<Materia[]> {
    return this.repo.find();
  }

  async findById(id: string, usuarioId: string): Promise<Materia | null> {
    return this.repo.findOneBy({ id, usuarioId });
  }

  async create(data: Partial<Materia>): Promise<Materia> {
    const nueva = this.repo.create(data);
    return this.repo.save(nueva);
  }

  async update(
    id: string,
    data: Partial<Materia>,
    usuarioId: string,
  ): Promise<Materia | null> {
    await this.repo.update({ id, usuarioId }, data);
    return this.findById(id, usuarioId);
  }

  async delete(id: string, usuarioId: string): Promise<boolean> {
    const resultado = await this.repo.delete({ id, usuarioId });
    return (resultado.affected ?? 0) > 0;
  }

  async buscarPorUsuario(usuarioId: string, paginacion = new PaginacionDto()) {
    return this.repo.find({
      where: { usuarioId },
      take: paginacion.limit,
      skip: paginacion.offset,
      order: { nombre: 'ASC', id: 'ASC' },
    });
  }
}
