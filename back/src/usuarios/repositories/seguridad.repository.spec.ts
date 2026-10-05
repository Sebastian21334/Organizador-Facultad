import { PGlite } from '@electric-sql/pglite';
import { randomUUID, createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { Materia } from '../../materias/entities/materia.entity';
import { Tarea } from '../../tareas/entities/tarea.entity';
import { UsuariosRepository } from './usuario.repository';
import { LimitesService } from '../services/limites.service';
import { TareasRepository } from '../../tareas/repositories/tareas.repository';
import { SeguridadSesionesYLimites1791200000000 } from '../../migrations/1791200000000-SeguridadSesionesYLimites';

describe('Seguridad SQL con PostgreSQL efímero en memoria (sin red ni base real)', () => {
  let pg: PGlite;
  let usuarios: UsuariosRepository;
  let tareas: TareasRepository;
  let limites: LimitesService;
  const id = randomUUID();
  const taskId = randomUUID();
  const hash = createHash('sha256').update('token-de-prueba').digest('hex');

  beforeAll(async () => {
    pg = new PGlite();
    await pg.exec(`
      CREATE TABLE usuarios (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, password text NOT NULL,
        nombre text, "createdAt" timestamptz DEFAULT NOW(), "emailVerificado" boolean DEFAULT false,
        "recordatorioEmailHabilitado" boolean DEFAULT false, "recordatorioMinutos" integer);
      CREATE TABLE materias (id uuid PRIMARY KEY, "usuarioId" uuid NOT NULL, nombre varchar(150) DEFAULT 'Materia', "anioCursado" integer, cuatrimestre text, estado text DEFAULT 'regular');
      CREATE TABLE tareas (id uuid PRIMARY KEY, "materia_id" uuid, "usuarioId" uuid NOT NULL,
        "fechaLimite" timestamptz, "recordatorioEnviadoEn" timestamptz, "recordatorioMinutos" integer,
        titulo varchar(200) DEFAULT 'Parcial', descripcion text, tipo text DEFAULT 'tarea', estado text DEFAULT 'pendiente',
        origen text DEFAULT 'manual', "fechaCreacion" timestamptz DEFAULT NOW());
    `);
    const materiaId = randomUUID();
    await pg.query('INSERT INTO materias (id, "usuarioId") VALUES ($1, $2)', [
      materiaId,
      randomUUID(),
    ]);
    await pg.query(
      'INSERT INTO tareas (id, materia_id, "usuarioId") VALUES ($1, $2, $3)',
      [taskId, materiaId, id],
    );
    const query = async (sql: string, params?: unknown[]) =>
      (await pg.query(sql, params)).rows;
    await new SeguridadSesionesYLimites1791200000000().up({ query } as any);
    const db = new DataSource({
      type: 'postgres',
      entities: [Usuario, Materia, Tarea],
    });
    await (db as any).buildMetadatas();
    const runner = {
      connection: db,
      manager: db.manager,
      isReleased: false,
      isTransactionActive: false,
      broadcaster: {
        broadcast: async () => {},
        broadcastLoadEventsForAll: async () => {},
      },
      connect: async () => {},
      release: async () => {},
      query: async (sql: string, params: unknown[], structured: boolean) => {
        const result = await pg.query(sql, params);
        return structured
          ? {
              records: result.rows,
              raw: result.rows,
              affected: result.affectedRows,
            }
          : result.rows;
      },
    };
    db.createQueryRunner = () => runner as any;
    usuarios = new UsuariosRepository(db.getRepository(Usuario));
    tareas = new TareasRepository(db.getRepository(Tarea));
    limites = new LimitesService({ query } as unknown as DataSource);
  }, 30_000);
  afterAll(async () => {
    await pg?.close();
  });
  beforeEach(async () => {
    await pg.exec('DELETE FROM usuarios; DELETE FROM limites_seguridad');
    await pg.query(
      'INSERT INTO usuarios (id, email, password, "resetTokenHash", "resetTokenExpires", "verificationTokenHash", "verificationTokenExpires") VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'1 hour\', $4, NOW() + INTERVAL \'1 day\')',
      [id, 'Seba@Example.com', 'hash-anterior', hash],
    );
  });

  it('la migración elimina vínculos entre cuentas sin borrar las tareas', async () => {
    const result = await pg.query(
      'SELECT materia_id FROM tareas WHERE id = $1',
      [taskId],
    );
    expect(result.rows).toEqual([{ materia_id: null }]);
  });
  it('consume un reset una sola vez aunque lleguen dos solicitudes simultáneas', async () => {
    const resultados = await Promise.all([
      usuarios.consumirReset(hash, 'hash-nuevo-1'),
      usuarios.consumirReset(hash, 'hash-nuevo-2'),
    ]);
    expect(resultados.filter(Boolean)).toHaveLength(1);
    const result = await pg.query(
      'SELECT "sessionVersion", "resetTokenHash", "verificationTokenHash", "emailVerificado" FROM usuarios WHERE id = $1',
      [id],
    );
    expect(result.rows[0]).toEqual({
      sessionVersion: 1,
      resetTokenHash: null,
      verificationTokenHash: null,
      emailVerificado: true,
    });
  });
  it('no consume tokens vencidos', async () => {
    await pg.query(
      'UPDATE usuarios SET "resetTokenExpires" = NOW() - INTERVAL \'1 minute\'',
    );
    await expect(usuarios.consumirReset(hash, 'nuevo')).resolves.toBe(false);
  });
  it('verifica el email una sola vez y solo con el hash de contraseña esperado', async () => {
    await expect(
      usuarios.consumirVerificacion(hash, 'otro-hash'),
    ).resolves.toBe(false);
    await expect(
      usuarios.consumirVerificacion(hash, 'hash-anterior'),
    ).resolves.toBe(true);
    await expect(
      usuarios.consumirVerificacion(hash, 'hash-anterior'),
    ).resolves.toBe(false);
  });
  it('cambiar la contraseña revoca sesiones y evita cambios concurrentes con la contraseña anterior', async () => {
    await expect(
      usuarios.cambiarPasswordSeguro(id, 'hash-anterior', 'nuevo'),
    ).resolves.toBe(true);
    await expect(
      usuarios.cambiarPasswordSeguro(id, 'hash-anterior', 'otro'),
    ).resolves.toBe(false);
    await usuarios.revocarSesiones(id);
    const result = await pg.query(
      'SELECT "sessionVersion", "resetTokenHash" FROM usuarios WHERE id = $1',
      [id],
    );
    expect(result.rows[0]).toEqual({ sessionVersion: 2, resetTokenHash: null });
  });
  it('el límite es atómico, compartido y no guarda IPs ni emails en texto plano', async () => {
    const resultados = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        limites.consumir('login', 'seba@example.com', 3, 60000),
      ),
    );
    expect(
      resultados.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(3);
    const result = await pg.query(
      'SELECT clave, cantidad FROM limites_seguridad',
    );
    expect(result.rows[0]).toEqual({
      clave: expect.stringMatching(/^[a-f0-9]{64}$/),
      cantidad: 3,
    });
    const otraInstancia = new LimitesService({
      query: async (sql: string, params: unknown[]) =>
        (await pg.query(sql, params)).rows,
    } as unknown as DataSource);
    await expect(
      otraInstancia.consumir('login', 'seba@example.com', 3, 60000),
    ).rejects.toMatchObject({ status: 429 });
  });
  it('reinicia únicamente ventanas vencidas', async () => {
    await limites.consumir('prueba', id, 1, 60000);
    await expect(
      limites.consumir('prueba', id, 1, 60000),
    ).rejects.toMatchObject({ status: 429 });
    await pg.exec(
      "UPDATE limites_seguridad SET vence = NOW() - INTERVAL '1 second'",
    );
    await expect(
      limites.consumir('prueba', id, 1, 60000),
    ).resolves.toBeUndefined();
  });
  it('una sola réplica puede reservar un recordatorio pendiente', async () => {
    const ids = [randomUUID(), randomUUID()];
    const results = await Promise.all(
      ids.map((intento) => tareas.reclamarRecordatorio(taskId, intento)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    const intento = ids[results.indexOf(true)];
    await tareas.marcarRecordatorioEnviado(taskId, ids[results.indexOf(false)]);
    const before = await pg.query(
      'SELECT "recordatorioEnviadoEn" FROM tareas WHERE id = $1',
      [taskId],
    );
    expect(before.rows[0]).toEqual({ recordatorioEnviadoEn: null });
    await tareas.marcarRecordatorioEnviado(taskId, intento);
    await expect(
      tareas.reclamarRecordatorio(taskId, randomUUID()),
    ).resolves.toBe(false);
  });
  it('la comparación de email ignora mayúsculas y el índice evita duplicados', async () => {
    await expect(
      usuarios.buscarPorEmail('seba@example.com'),
    ).resolves.toMatchObject({ id, email: 'Seba@Example.com' });
    const usuario = await usuarios.buscarPorId(id);
    expect(usuario?.resetTokenHash).toBeUndefined();
    expect(usuario?.verificationTokenHash).toBeUndefined();
    expect(JSON.stringify(usuario)).not.toContain(hash);
    await expect(
      pg.query(
        'INSERT INTO usuarios (id, email, password) VALUES ($1, $2, $3)',
        [randomUUID(), 'seba@example.com', 'hash'],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
  it('las consultas y escrituras SQL filtran por propietario, no solo la comprobación previa', async () => {
    const otraCuenta = randomUUID();
    await expect(tareas.findById(taskId, otraCuenta)).resolves.toBeNull();
    await expect(
      tareas.update(taskId, { titulo: 'Ataque' }, otraCuenta),
    ).resolves.toBeNull();
    await tareas.delete(taskId, otraCuenta);
    await expect(tareas.findById(taskId, id)).resolves.toMatchObject({
      titulo: 'Parcial',
      usuarioId: id,
    });
  });
});
