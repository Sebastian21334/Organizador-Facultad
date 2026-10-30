import { EntityManager, Repository } from 'typeorm';
import { MateriasRepository } from './materias.repository';
import { EstadoMateria, Materia } from '../entities/materia.entity';

describe('MateriasRepository: estado al importar un plan', () => {
  it('crea las nuevas como Libres y conserva los estados de las coincidencias', async () => {
    const existentes = [
      { id: 'm1', nombre: 'Álgebra', estado: EstadoMateria.REGULAR },
      { id: 'm2', nombre: 'Sistemas', estado: EstadoMateria.APROBADO },
    ] as Materia[];
    const originales = existentes.map((materia) => ({ ...materia }));
    const save = jest
      .fn<Promise<Materia[]>, [Materia[]]>()
      .mockImplementation((nuevas) => Promise.resolve(nuevas));
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: () => ({
        find: jest.fn().mockResolvedValue(existentes),
        create: (datos: Partial<Materia>) =>
          ({ id: 'nueva', ...datos }) as Materia,
        save,
      }),
    };
    const repo = new MateriasRepository({
      manager: {
        transaction: async (guardar: (em: EntityManager) => Promise<unknown>) =>
          guardar(manager as unknown as EntityManager),
      },
    } as unknown as Repository<Materia>);

    const resultado = await repo.importarPlan(
      [
        { nombre: ' algebra ' },
        { nombre: 'Sistemas' },
        { nombre: 'Programación', anioCursado: 2 },
        { nombre: 'PROGRAMACION' },
      ],
      'usuario',
    );

    expect(resultado.creadas).toEqual([
      expect.objectContaining({
        nombre: 'Programación',
        anioCursado: 2,
        usuarioId: 'usuario',
        estado: EstadoMateria.LIBRE,
      }),
    ]);
    expect(resultado.omitidas).toEqual(['algebra', 'Sistemas', 'PROGRAMACION']);
    expect(save).toHaveBeenCalledTimes(1);
    expect(existentes).toEqual(originales);
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
      ['usuario'],
    );
  });
});
