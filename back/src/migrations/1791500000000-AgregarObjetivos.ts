import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarObjetivos1791500000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE objetivos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo varchar(200) NOT NULL,
      fecha date NOT NULL,
      completado boolean NOT NULL DEFAULT false,
      "usuarioId" uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      "tareaId" uuid REFERENCES tareas(id) ON DELETE SET NULL,
      "creadoEn" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query('CREATE INDEX objetivos_usuario_fecha ON objetivos ("usuarioId", fecha)');
    await q.query(`CREATE TABLE recordatorios_objetivos (
      "usuarioId" uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha date NOT NULL,
      "bloqueadoHasta" timestamptz NOT NULL,
      enviado boolean NOT NULL DEFAULT false,
      PRIMARY KEY ("usuarioId", fecha)
    )`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE recordatorios_objetivos');
    await q.query('DROP TABLE objetivos');
  }
}
