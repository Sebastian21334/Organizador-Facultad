import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarRecordatoriosTareas1778000000000 implements MigrationInterface {
  name = 'AgregarRecordatoriosTareas1778000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tareas" ADD "recordatorioMinutos" integer`);
    await queryRunner.query(`ALTER TABLE "tareas" ADD "recordatorioEnviadoEn" TIMESTAMP WITH TIME ZONE`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tareas" DROP COLUMN "recordatorioEnviadoEn"`);
    await queryRunner.query(`ALTER TABLE "tareas" DROP COLUMN "recordatorioMinutos"`);
  }
}