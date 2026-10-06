import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Materia } from '../entities/materia.entity';
import { PaginacionDto } from '../../paginacion.dto';
import { MateriaPlanDto } from '../dto/plan-estudios.dto';
import { normalizarNombreMateria } from '../plan-estudios';

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

  async buscarTodasPorUsuario(usuarioId: string): Promise<Materia[]> {
    return this.repo.find({ where: { usuarioId }, order: { nombre: 'ASC', id: 'ASC' } });
  }

  async importarPlan(materias: MateriaPlanDto[], usuarioId: string) {
    return this.repo.manager.transaction(async manager => {
      // Serializa importaciones de esta cuenta, incluso entre distintas instancias.
      await manager.query('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
      const repo = manager.getRepository(Materia);
      const existentes = await repo.find({ where: { usuarioId } });
      const nombres = new Set(existentes.map(m => normalizarNombreMateria(m.nombre)));
      const nuevas: Materia[] = [];
      const omitidas: string[] = [];
      for (const materia of materias) {
        const nombre = materia.nombre.trim();
        const key = normalizarNombreMateria(nombre);
        if (nombres.has(key)) { omitidas.push(nombre); continue; }
        nombres.add(key);
        nuevas.push(repo.create({
          nombre,
          anioCursado: materia.anioCursado ?? undefined,
          cuatrimestre: materia.cuatrimestre ?? undefined,
          usuarioId,
        }));
      }
      const creadas = nuevas.length ? await repo.save(nuevas) : [];
      return { creadas, omitidas };
    });
  }
}
