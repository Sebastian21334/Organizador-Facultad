import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';

@Injectable()
export class UsuariosRepository {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  async crear(data: Partial<Usuario>): Promise<Usuario> {
    const usuario = this.repo.create(data);
    return this.repo.save(usuario);
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { email } });
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id } });
  }

  async actualizar(id: string, data: Partial<Usuario>): Promise<Usuario | null> {
    await this.repo.update(id, data);
    return this.buscarPorId(id);
  }
}