import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarObjetivosRecurrentes1791600000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE objetivos_recurrentes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo varchar(200) NOT NULL,
      "usuarioId" uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      "fechaInicio" date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
      "creadoEn" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query('CREATE INDEX objetivos_recurrentes_usuario ON objetivos_recurrentes ("usuarioId")');
    await q.query(`CREATE TABLE objetivos_recurrentes_cumplidos (
      "objetivoId" uuid NOT NULL REFERENCES objetivos_recurrentes(id) ON DELETE CASCADE,
      fecha date NOT NULL,
      PRIMARY KEY ("objetivoId", fecha)
    )`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE objetivos_recurrentes_cumplidos');
    await q.query('DROP TABLE objetivos_recurrentes');
  }
}
