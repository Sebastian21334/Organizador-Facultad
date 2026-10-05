import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, LessThanOrEqual, Not } from 'typeorm';
import { Tarea } from '../entities/tarea.entity';
import { EstadoTarea } from '../entities/tarea.entity';
import { PaginacionDto } from '../../paginacion.dto';

@Injectable()
export class TareasRepository {
  constructor(
    @InjectRepository(Tarea)
    private readonly repo: Repository<Tarea>,
  ) {}

  async findAll(
    usuarioId: string,
    paginacion = new PaginacionDto(),
  ): Promise<Tarea[]> {
    return this.repo.find({
      where: { usuarioId },
      relations: { materia: true },
      take: paginacion.limit,
      skip: paginacion.offset,
      order: { fechaCreacion: 'DESC', id: 'ASC' },
    });
  }

  async findById(id: string, usuarioId: string): Promise<Tarea | null> {
    return this.repo.findOne({
      where: { id, usuarioId },
      relations: { materia: true },
    });
  }

  async findEnRango(
    desde: Date,
    hasta: Date,
    usuarioId: string,
  ): Promise<Tarea[]> {
    return this.repo.find({
      where: { fechaLimite: Between(desde, hasta), usuarioId },
      relations: { materia: true },
      order: { fechaLimite: 'ASC' },
    });
  }

  async findRecordatoriosVencidos(hasta: Date): Promise<Tarea[]> {
    return this.repo
      .createQueryBuilder('tarea')
      .leftJoinAndSelect('tarea.usuario', 'usuario')
      .leftJoinAndSelect('tarea.materia', 'materia')
      .where('tarea.fechaLimite <= :hasta', { hasta })
      .andWhere('tarea.recordatorioEnviadoEn IS NULL')
      .andWhere(
        'usuario.emailVerificado = true AND usuario.recordatorioEmailHabilitado = true',
      )
      .andWhere(
        '(tarea.recordatorioBloqueadoHasta IS NULL OR tarea.recordatorioBloqueadoHasta <= NOW())',
      )
      .andWhere("tarea.fechaLimite >= NOW() - INTERVAL '1 day'")
      .andWhere('tarea.estado != :hecha', { hecha: EstadoTarea.HECHA })
      .andWhere(
        '(usuario.recordatorioMinutos IS NOT NULL OR tarea.recordatorioMinutos IS NOT NULL)',
      )
      .orderBy('tarea.fechaLimite', 'ASC')
      .take(100)
      .getMany();
  }

  async reclamarRecordatorio(id: string, intentoId: string): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Tarea)
      .set({
        recordatorioBloqueadoHasta: () => "NOW() + INTERVAL '15 minutes'",
        recordatorioIntentoId: intentoId,
      })
      .where(
        'id = :id AND "recordatorioEnviadoEn" IS NULL AND ("recordatorioBloqueadoHasta" IS NULL OR "recordatorioBloqueadoHasta" <= NOW())',
        { id },
      )
      .execute();
    return result.affected === 1;
  }

  async marcarRecordatorioEnviado(
    id: string,
    intentoId: string,
  ): Promise<void> {
    await this.repo.update(
      { id, recordatorioIntentoId: intentoId },
      {
        recordatorioEnviadoEn: new Date(),
        recordatorioIntentoId: null,
        recordatorioBloqueadoHasta: null,
      },
    );
  }

  async create(data: Partial<Tarea>): Promise<Tarea> {
    const nueva = this.repo.create(data);
    return this.repo.save(nueva);
  }

  async update(
    id: string,
    data: Partial<Tarea>,
    usuarioId: string,
  ): Promise<Tarea | null> {
    await this.repo.update({ id, usuarioId }, data);
    return this.findById(id, usuarioId);
  }

  async delete(id: string, usuarioId: string): Promise<void> {
    await this.repo.delete({ id, usuarioId });
  }
}
