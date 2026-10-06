import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Broadcaster } from 'typeorm/subscriber/Broadcaster';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Tarea } from '../../tareas/entities/tarea.entity';
import { Materia, Cuatrimestre } from '../entities/materia.entity';
import { MateriasRepository } from './materias.repository';

describe('Importación del plan con PostgreSQL en memoria, sin base real', () => {
  let pg: PGlite; let repo: MateriasRepository;
  const usuarioId = randomUUID(); const otroUsuario = randomUUID();
  const nueva = { nombre: 'Física I', anioCursado: 1, cuatrimestre: Cuatrimestre.PRIMERO };
  beforeAll(async () => {
    pg = new PGlite();
    await pg.exec(`CREATE TABLE usuarios (id uuid PRIMARY KEY);
      CREATE TABLE materias (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "usuarioId" uuid NOT NULL REFERENCES usuarios,
      nombre varchar(150) NOT NULL CHECK (nombre <> 'Fallo'), "anioCursado" integer, cuatrimestre text, estado text DEFAULT 'regular');`);
    await pg.query('INSERT INTO usuarios VALUES ($1), ($2)', [usuarioId, otroUsuario]);
    const db = new DataSource({ type: 'postgres', entities: [Usuario, Materia, Tarea] });
    await (db as any).buildMetadatas();
    let cola = Promise.resolve();
    db.createQueryRunner = () => {
      let liberar: (() => void) | undefined; let conectado = false;
      const conectar = async () => {
        if (conectado) return;
        conectado = true;
        const anterior = cola;
        cola = new Promise<void>(resolve => { liberar = resolve; });
        await anterior;
      };
      const runner: any = {
        connection: db, dataSource: db, isReleased: false, isTransactionActive: false,
        connect: conectar,
        release: async () => { runner.isReleased = true; liberar?.(); },
        startTransaction: async () => { await conectar(); await pg.exec('BEGIN'); runner.isTransactionActive = true; },
        commitTransaction: async () => { await pg.exec('COMMIT'); runner.isTransactionActive = false; },
        rollbackTransaction: async () => { await pg.exec('ROLLBACK'); runner.isTransactionActive = false; },
        query: async (sql: string, params: unknown[], structured: boolean) => {
          await conectar();
          const result = await pg.query(sql, params);
          return structured ? { records: result.rows, raw: result.rows, affected: result.affectedRows } : result.rows;
        },
      };
      runner.broadcaster = new Broadcaster(runner);
      runner.manager = db.createEntityManager(runner);
      return runner;
    };
    repo = new MateriasRepository(db.getRepository(Materia));
  }, 30_000);
  afterAll(async () => { await pg?.close(); });
  beforeEach(async () => {
    await pg.exec('DELETE FROM materias');
    await pg.query('INSERT INTO materias ("usuarioId", nombre, "anioCursado", cuatrimestre, estado) VALUES ($1, $2, 3, $3, $4)',
      [usuarioId, 'Análisis Matemático I', 'anual', 'aprobado']);
  });
  it('omite tildes, mayúsculas, espacios y repeticiones dentro del archivo sin modificar lo existente', async () => {
    const result = await repo.importarPlan([
      { nombre: '  ANALISIS   MATEMATICO I ', anioCursado: 1, cuatrimestre: Cuatrimestre.PRIMERO },
      nueva, { ...nueva, nombre: 'FISICA I' },
    ], usuarioId);
    expect(result.creadas).toHaveLength(1);
    expect(result.omitidas).toHaveLength(2);
    expect(result.creadas[0]).toMatchObject({ ...nueva, estado: 'regular', usuarioId });
    const resultantes = await repo.buscarTodasPorUsuario(usuarioId);
    expect(resultantes.find(m => m.nombre === 'Análisis Matemático I')).toMatchObject({ estado: 'aprobado', anioCursado: 3, cuatrimestre: 'anual' });
  });
  it('reimportar el mismo plan no crea materias adicionales', async () => {
    await repo.importarPlan([nueva], usuarioId);
    const segunda = await repo.importarPlan([nueva], usuarioId);
    expect(segunda.creadas).toHaveLength(0);
    expect(segunda.omitidas).toEqual(['Física I']);
    expect(await repo.buscarTodasPorUsuario(usuarioId)).toHaveLength(2);
  });
  it('mantiene separados los niveles I/II y las materias de otras cuentas', async () => {
    await pg.query('INSERT INTO materias ("usuarioId", nombre) VALUES ($1, $2)', [otroUsuario, nueva.nombre]);
    const result = await repo.importarPlan([nueva, { ...nueva, nombre: 'Análisis Matemático II' }], usuarioId);
    expect(result.creadas).toHaveLength(2);
    expect(await repo.buscarTodasPorUsuario(otroUsuario)).toHaveLength(1);
  });
  it('revierte el lote completo si falla el guardado', async () => {
    await expect(repo.importarPlan([nueva, { ...nueva, nombre: 'Fallo' }], usuarioId)).rejects.toThrow(/check constraint/);
    expect(await repo.buscarTodasPorUsuario(usuarioId)).toHaveLength(1);
  });
});
