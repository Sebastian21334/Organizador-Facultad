import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MensajeEntrante } from '../entities/mensaje-entrante.entity';

@Injectable()
export class MensajesRepository {
  constructor(
    @InjectRepository(MensajeEntrante)
    private readonly repo: Repository<MensajeEntrante>,
  ) {}

  async findAll(usuarioId: string): Promise<MensajeEntrante[]> {
    return this.repo.find({
      where: { usuarioId },
      relations: { tareaGenerada: { materia: true } },
      order: { fechaRecibido: 'DESC' },
    });
  }

  async findById(id: string): Promise<MensajeEntrante | null> {
    return this.repo.findOne({
      where: { id },
      relations: { tareaGenerada: { materia: true } },
    });
  }

  async create(data: Partial<MensajeEntrante>): Promise<MensajeEntrante> {
    const nuevo = this.repo.create(data);
    return this.repo.save(nuevo);
  }

  async update(id: string, data: Partial<MensajeEntrante>): Promise<MensajeEntrante | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }
}