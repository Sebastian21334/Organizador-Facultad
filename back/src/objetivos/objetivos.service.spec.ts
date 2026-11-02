import { PGlite } from '@electric-sql/pglite';
import { DataSource } from 'typeorm';
import { MailService } from '../mail/services/mail.service';
import { ObjetivosService } from './objetivos.service';

describe('Resumen diario de objetivos', () => {
  let db: PGlite;
  let ahora: string;
  let servicio: ObjetivosService;
  const enviarMail = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE usuarios (id text PRIMARY KEY, email text, "emailVerificado" boolean);
      CREATE TABLE objetivos (id text PRIMARY KEY, "usuarioId" text, titulo text, fecha date, completado boolean, "creadoEn" timestamptz DEFAULT now());
      CREATE TABLE recordatorios_objetivos ("usuarioId" text, fecha date, "bloqueadoHasta" timestamptz, enviado boolean DEFAULT false, PRIMARY KEY ("usuarioId", fecha));
    `);
    const fuente = { query: async (sql: string, params?: unknown[]) => (await db.query(sql.replace(/now\(\)/gi, `('${ahora}'::timestamptz)`), params)).rows } as unknown as DataSource;
    servicio = new ObjetivosService(fuente, { enviarMail } as unknown as MailService);
  }, 30000);
  afterAll(async () => { await db.close(); });
  beforeEach(async () => {
    enviarMail.mockClear();
    ahora = '2026-11-02T11:59:00Z';
    await db.exec(`TRUNCATE recordatorios_objetivos, objetivos, usuarios;
      INSERT INTO usuarios VALUES ('u1', 'uno@example.test', true), ('u2', 'dos@example.test', true);
      INSERT INTO objetivos (id, "usuarioId", titulo, fecha, completado) VALUES
        ('1','u1','Atrasado','2026-11-01',false), ('2','u1','Otro','2026-10-31',false),
        ('3','u1','Hoy','2026-11-02',false), ('4','u1','Terminado','2026-10-31',true),
        ('5','u2','Privado','2026-11-01',false);`);
  });

  it('espera a las nueve de Argentina y agrupa solo los pendientes anteriores por usuario', async () => {
    await servicio.procesar();
    expect(enviarMail).not.toHaveBeenCalled();
    ahora = '2026-11-02T12:00:00Z';
    await servicio.procesar();
    expect(enviarMail).toHaveBeenCalledTimes(2);
    const mensaje = enviarMail.mock.calls.find(c => c[0] === 'uno@example.test')![2] as string;
    expect(mensaje).toContain('Atrasado');
    expect(mensaje).toContain('Otro');
    expect(mensaje).not.toMatch(/Hoy|Terminado|Privado/);
    await servicio.procesar();
    expect(enviarMail).toHaveBeenCalledTimes(2);
    ahora = '2026-11-03T12:00:00Z';
    await servicio.procesar();
    expect(enviarMail).toHaveBeenCalledTimes(4);
  });
});
