import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarPreferenciaRecordatoriosUsuario1778000001000 implements MigrationInterface {
  name = 'AgregarPreferenciaRecordatoriosUsuario1778000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "recordatorioEmailHabilitado" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "recordatorioMinutos" integer`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "recordatorioMinutos"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "recordatorioEmailHabilitado"`);
  }
}