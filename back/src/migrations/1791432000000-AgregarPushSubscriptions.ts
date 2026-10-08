import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarPushSubscriptions1791432000000 implements MigrationInterface {
  name = 'AgregarPushSubscriptions1791432000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "push_subscriptions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "endpoint" varchar(2048) NOT NULL UNIQUE,
      "keys" jsonb NOT NULL,
      "usuarioId" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "userAgent" varchar(512),
      "createdAt" timestamptz NOT NULL DEFAULT NOW(),
      "updatedAt" timestamptz NOT NULL DEFAULT NOW()
    )`);
    await queryRunner.query(
      `CREATE INDEX "push_subscriptions_usuario" ON "push_subscriptions" ("usuarioId")`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "push_subscriptions"');
  }
}
