import 'reflect-metadata';
import { PGlite } from '@electric-sql/pglite';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { PushSubscription } from '../entities/push-subscription.entity';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Materia } from '../../materias/entities/materia.entity';
import { Tarea } from '../../tareas/entities/tarea.entity';
import { AgregarPushSubscriptions1791432000000 } from '../../migrations/1791432000000-AgregarPushSubscriptions';

describe('Suscripciones y migración en PostgreSQL efímero (sin Neon)', () => {
  let pg: PGlite;
  let repo: PushSubscriptionsRepository;
  const usuario = randomUUID();
  const otro = randomUUID();
  const datos = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/dispositivo',
    keys: { p256dh: 'clave', auth: 'auth' },
    userAgent: 'Chrome',
  };
  beforeAll(async () => {
    pg = new PGlite();
    await pg.exec('CREATE TABLE usuarios (id uuid PRIMARY KEY)');
    const query = async (sql: string, params?: unknown[]) =>
      (await pg.query(sql, params)).rows;
    await new AgregarPushSubscriptions1791432000000().up({ query } as any);
    const db = new DataSource({
      type: 'postgres',
      entities: [PushSubscription, Usuario, Materia, Tarea],
    });
    await (db as any).buildMetadatas();
    db.createQueryRunner = () =>
      ({
        connection: db,
        dataSource: db,
        manager: db.manager,
        isReleased: false,
        isTransactionActive: false,
        broadcaster: {
          broadcast: async () => {},
          broadcastLoadEventsForAll: async () => {},
          broadcastBeforeInsertEvent: () => {},
          broadcastAfterInsertEvent: () => {},
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
      }) as any;
    repo = new PushSubscriptionsRepository(db.getRepository(PushSubscription));
  }, 30_000);
  afterAll(async () => {
    await pg?.close();
  });
  beforeEach(async () => {
    await pg.exec('DELETE FROM usuarios');
    await pg.query('INSERT INTO usuarios VALUES ($1), ($2)', [usuario, otro]);
  });
  it('registrar dos veces no duplica; un usuario puede tener varios dispositivos', async () => {
    await repo.registrar(usuario, datos);
    await repo.registrar(usuario, datos);
    await repo.registrar(usuario, {
      ...datos,
      endpoint: datos.endpoint + '-2',
    });
    expect(await repo.buscarPorUsuario(usuario)).toHaveLength(2);
    expect(await repo.buscarPorUsuario(otro)).toHaveLength(0);
  });
  it('solo el dueño elimina y el borrado de usuario limpia sus dispositivos', async () => {
    await repo.registrar(usuario, datos);
    await repo.eliminar(otro, datos.endpoint);
    expect(await repo.buscarPorUsuario(usuario)).toHaveLength(1);
    await pg.query('DELETE FROM usuarios WHERE id=$1', [usuario]);
    expect(await repo.buscarPorUsuario(usuario)).toHaveLength(0);
  });
  it('reasigna un dispositivo al activar otra cuenta y protege una suscripción renovada', async () => {
    await repo.registrar(usuario, datos);
    const anterior = (await repo.buscarPorUsuario(usuario))[0];
    await repo.registrar(otro, datos);
    await repo.eliminarInvalida(anterior);
    expect(await repo.buscarPorUsuario(otro)).toHaveLength(1);
    const actual = (await repo.buscarPorUsuario(otro))[0];
    await repo.registrar(otro, {
      ...datos,
      keys: { ...datos.keys, auth: 'auth-renovado' },
    });
    await repo.eliminarInvalida(actual);
    expect(await repo.buscarPorUsuario(otro)).toHaveLength(1);
    await repo.eliminarInvalida((await repo.buscarPorUsuario(otro))[0]);
    expect(await repo.buscarPorUsuario(otro)).toHaveLength(0);
  });
});
