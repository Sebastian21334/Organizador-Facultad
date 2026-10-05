import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';

@Injectable()
export class LimitesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LimitesService.name);
  private cleanup?: NodeJS.Timeout;
  constructor(private readonly db: DataSource) {}

  onModuleInit() {
    this.cleanup = setInterval(() => {
      void this.db
        .query(
          `DELETE FROM "limites_seguridad" WHERE "clave" IN
        (SELECT "clave" FROM "limites_seguridad" WHERE "vence" < NOW() LIMIT 1000)`,
        )
        .catch(() =>
          this.logger.warn('No se pudieron limpiar los límites vencidos'),
        );
    }, 300_000);
    this.cleanup.unref();
  }
  onModuleDestroy() {
    if (this.cleanup) clearInterval(this.cleanup);
  }

  async consumir(
    scope: string,
    identidad: string,
    maximo: number,
    ventanaMs: number,
  ): Promise<void> {
    const clave = createHash('sha256')
      .update(`${scope}:${identidad}`)
      .digest('hex');
    // UPSERT atómico: los límites se comparten entre réplicas y sobreviven reinicios.
    const rows: unknown[] = await this.db.query(
      `INSERT INTO "limites_seguridad" ("clave", "cantidad", "vence")
      VALUES ($1, 1, NOW() + $2 * INTERVAL '1 millisecond')
      ON CONFLICT ("clave") DO UPDATE SET
        "cantidad" = CASE WHEN "limites_seguridad"."vence" <= NOW() THEN 1 ELSE "limites_seguridad"."cantidad" + 1 END,
        "vence" = CASE WHEN "limites_seguridad"."vence" <= NOW() THEN EXCLUDED."vence" ELSE "limites_seguridad"."vence" END
      WHERE "limites_seguridad"."vence" <= NOW() OR "limites_seguridad"."cantidad" < $3
      RETURNING "cantidad"`,
      [clave, ventanaMs, maximo],
    );
    if (!rows.length)
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            ventanaMs >= 86_400_000
              ? 'Alcanzaste el límite diario. Intentá de nuevo mañana.'
              : 'Demasiados intentos. Esperá unos minutos antes de volver a intentar.',
          retryAfter: Math.ceil(ventanaMs / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }
}
