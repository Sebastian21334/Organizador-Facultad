import { PGlite } from '@electric-sql/pglite';
import { Repository } from 'typeorm';
import { TareasRepository } from './tareas.repository';
import { Tarea } from '../entities/tarea.entity';

describe('TareasRepository.proximoAviso: SQL real en PostgreSQL embebido (PGlite)', () => {
  let db: PGlite;
  let repo: TareasRepository;
  let ahora: Date;
  const usuario = 'usuario';

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE usuarios (
        id text PRIMARY KEY,
        "emailVerificado" boolean NOT NULL DEFAULT true,
        "recordatorioEmailHabilitado" boolean NOT NULL DEFAULT true,
        "recordatorioMinutos" integer
      );
      CREATE TABLE tareas (
        id text PRIMARY KEY,
        "usuarioId" text REFERENCES usuarios(id),
        "fechaLimite" timestamptz,
        "recordatorioMinutos" integer,
        "recordatorioBloqueadoHasta" timestamptz,
        "recordatorioEnviadoEn" timestamptz,
        estado text NOT NULL DEFAULT 'pendiente'
      );
    `);
    // Ejecutar el SQL del repositorio directamente, sin adaptarlo ni copiarlo.
    repo = new TareasRepository({
      query: async (sql: string) => (await db.query(sql)).rows,
    } as unknown as Repository<Tarea>);
  }, 30_000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await db.exec('TRUNCATE tareas, usuarios');
    const result = await db.query<{ ahora: Date }>('SELECT NOW() AS ahora');
    ahora = result.rows[0].ahora;
    await db.query(
      'INSERT INTO usuarios (id, "recordatorioMinutos") VALUES ($1, 60)',
      [usuario],
    );
  });

  async function crearTarea(
    id = 'tarea',
    fecha: Date | null = new Date(ahora.getTime() + 7_200_000),
    minutos: number | null = null,
    bloqueo: Date | null = null,
  ) {
    await db.query(
      `INSERT INTO tareas
      (id, "usuarioId", "fechaLimite", "recordatorioMinutos", "recordatorioBloqueadoHasta")
      VALUES ($1, $2, $3, $4, $5)`,
      [id, usuario, fecha, minutos, bloqueo],
    );
  }

  it('devuelve null cuando no hay pendientes', async () => {
    await expect(repo.proximoAviso()).resolves.toBeNull();
  });

  it('hereda los minutos del usuario y devuelve Date', async () => {
    await crearTarea();
    const proximo = await repo.proximoAviso();
    expect(proximo).toBeInstanceOf(Date);
    expect(proximo?.getTime()).toBe(ahora.getTime() + 3_600_000);
  });

  it('prioriza los minutos de la tarea y selecciona el menor aviso', async () => {
    await crearTarea('antes', new Date(ahora.getTime() + 7_200_000), 90);
    await crearTarea('despues', new Date(ahora.getTime() + 7_200_000), 10);
    expect((await repo.proximoAviso())?.getTime()).toBe(
      ahora.getTime() + 1_800_000,
    );
  });

  it('espera hasta que expire una reserva posterior al momento del aviso', async () => {
    const bloqueo = new Date(ahora.getTime() + 5_400_000);
    await crearTarea('tarea', undefined, null, bloqueo);
    expect((await repo.proximoAviso())?.getTime()).toBe(bloqueo.getTime());
  });

  it('una reserva vencida no adelanta el aviso', async () => {
    await crearTarea(
      'tarea',
      undefined,
      null,
      new Date(ahora.getTime() - 60_000),
    );
    expect((await repo.proximoAviso())?.getTime()).toBe(
      ahora.getTime() + 3_600_000,
    );
  });

  it('incluye avisos atrasados de tareas que vencieron hace menos de un día', async () => {
    await crearTarea('tarea', new Date(ahora.getTime() - 3_600_000));
    expect((await repo.proximoAviso())?.getTime()).toBe(
      ahora.getTime() - 7_200_000,
    );
  });

  it.each([
    ['usuario sin verificar', 'UPDATE usuarios SET "emailVerificado" = false'],
    [
      'recordatorios desactivados',
      'UPDATE usuarios SET "recordatorioEmailHabilitado" = false',
    ],
    ['tarea hecha', "UPDATE tareas SET estado = 'hecha'"],
    ['aviso enviado', 'UPDATE tareas SET "recordatorioEnviadoEn" = NOW()'],
    ['sin minutos', 'UPDATE usuarios SET "recordatorioMinutos" = NULL'],
    ['minutos cero', 'UPDATE tareas SET "recordatorioMinutos" = 0'],
    ['minutos negativos', 'UPDATE tareas SET "recordatorioMinutos" = -1'],
    ['sin fecha', 'UPDATE tareas SET "fechaLimite" = NULL'],
    [
      'venció hace más de un día',
      `UPDATE tareas SET "fechaLimite" = NOW() - INTERVAL '25 hours'`,
    ],
    [
      'fuera del tope autorizado de 30 días',
      `UPDATE tareas SET "fechaLimite" = NOW() + INTERVAL '31 days'`,
    ],
  ])('excluye %s', async (_caso, sql) => {
    await crearTarea();
    await db.exec(sql);
    await expect(repo.proximoAviso()).resolves.toBeNull();
  });
});
