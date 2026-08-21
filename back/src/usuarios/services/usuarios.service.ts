import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuariosRepository } from '../repositories/usuario.repository';
import { Usuario } from '../entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(private readonly usuariosRepository: UsuariosRepository) {}

  async crear(data: Partial<Usuario>): Promise<Usuario> {
    return this.usuariosRepository.crear(data);
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.buscarPorEmail(email);
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.usuariosRepository.buscarPorId(id);
  }

  async actualizar(id: string, data: Partial<Usuario>): Promise<Usuario> {
    const usuario = await this.usuariosRepository.actualizar(id, data);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }
}