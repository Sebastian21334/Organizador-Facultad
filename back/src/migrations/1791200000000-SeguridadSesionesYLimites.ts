import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeguridadSesionesYLimites1791200000000 implements MigrationInterface {
  name = 'SeguridadSesionesYLimites1791200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Si existen emails duplicados por mayúsculas/minúsculas, el índice falla sin fusionar ni borrar cuentas.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "usuarios_email_normalizado" ON "usuarios" (LOWER(email))`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios"
      ADD "sessionVersion" integer NOT NULL DEFAULT 0,
      ADD "verificationTokenHash" varchar(64), ADD "verificationTokenExpires" timestamptz,
      ADD "resetTokenHash" varchar(64), ADD "resetTokenExpires" timestamptz`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "usuarios_verification_token" ON "usuarios" ("verificationTokenHash") WHERE "verificationTokenHash" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "usuarios_reset_token" ON "usuarios" ("resetTokenHash") WHERE "resetTokenHash" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "limites_seguridad" ("clave" varchar(64) PRIMARY KEY, "cantidad" integer NOT NULL, "vence" timestamptz NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "limites_seguridad_vence" ON "limites_seguridad" ("vence")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tareas" ADD "recordatorioBloqueadoHasta" timestamptz, ADD "recordatorioIntentoId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "tareas_recordatorios_pendientes" ON "tareas" ("fechaLimite") WHERE "recordatorioEnviadoEn" IS NULL`,
    );
    // Repara únicamente vínculos entre cuentas, no elimina tareas ni materias.
    await queryRunner.query(
      `UPDATE "tareas" t SET "materia_id" = NULL FROM "materias" m WHERE t."materia_id" = m.id AND t."usuarioId" <> m."usuarioId"`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "usuarios_email_normalizado"`);
    await queryRunner.query(`DROP INDEX "tareas_recordatorios_pendientes"`);
    await queryRunner.query(
      `ALTER TABLE "tareas" DROP COLUMN "recordatorioBloqueadoHasta", DROP COLUMN "recordatorioIntentoId"`,
    );
    await queryRunner.query(`DROP TABLE "limites_seguridad"`);
    await queryRunner.query(`DROP INDEX "usuarios_verification_token"`);
    await queryRunner.query(`DROP INDEX "usuarios_reset_token"`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN "sessionVersion", DROP COLUMN "verificationTokenHash", DROP COLUMN "verificationTokenExpires", DROP COLUMN "resetTokenHash", DROP COLUMN "resetTokenExpires"`,
    );
  }
}
