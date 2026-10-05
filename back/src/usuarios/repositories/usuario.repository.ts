import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
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
    return this.repo
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.email) = :email', {
        email: email.trim().toLowerCase(),
      })
      .getOne();
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id } });
  }

  async actualizar(
    id: string,
    data: Partial<Usuario>,
  ): Promise<Usuario | null> {
    await this.repo.update(id, data);
    return this.buscarPorId(id);
  }

  async revocarSesiones(id: string): Promise<void> {
    await this.repo.increment({ id }, 'sessionVersion', 1);
  }

  async buscarVerificacion(hash: string): Promise<Usuario | null> {
    return this.repo.findOneBy({
      verificationTokenHash: hash,
      verificationTokenExpires: MoreThan(new Date()),
      emailVerificado: false,
    });
  }

  async consumirVerificacion(hash: string, password: string): Promise<boolean> {
    const result = await this.repo.update(
      {
        verificationTokenHash: hash,
        verificationTokenExpires: MoreThan(new Date()),
        emailVerificado: false,
        password,
      },
      {
        emailVerificado: true,
        verificationTokenHash: null,
        verificationTokenExpires: null,
      },
    );
    return result.affected === 1;
  }

  async consumirReset(hash: string, password: string): Promise<boolean> {
    // Una sola escritura consume el token y revoca las sesiones, incluso con dos requests simultáneas.
    const result = await this.repo
      .createQueryBuilder()
      .update(Usuario)
      .set({
        password,
        emailVerificado: true,
        resetTokenHash: null,
        resetTokenExpires: null,
        verificationTokenHash: null,
        verificationTokenExpires: null,
        sessionVersion: () => '"sessionVersion" + 1',
      })
      .where('"resetTokenHash" = :hash AND "resetTokenExpires" > NOW()', {
        hash,
      })
      .execute();
    return result.affected === 1;
  }

  async cambiarPasswordSeguro(
    id: string,
    passwordAnterior: string,
    password: string,
  ): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Usuario)
      .set({
        password,
        resetTokenHash: null,
        resetTokenExpires: null,
        sessionVersion: () => '"sessionVersion" + 1',
      })
      .where('id = :id AND password = :passwordAnterior', {
        id,
        passwordAnterior,
      })
      .execute();
    return result.affected === 1;
  }
}
