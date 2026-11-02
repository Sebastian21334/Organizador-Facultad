import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MailService } from '../mail/services/mail.service';

@Injectable()
export class ObjetivosService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private ejecutando = false;
  private readonly logger = new Logger(ObjetivosService.name);
  constructor(private readonly db: DataSource, private readonly mail: MailService) {}
  onModuleInit(): void { void this.procesar(); this.timer = setInterval(() => void this.procesar(), 60_000); }
  onModuleDestroy(): void { clearInterval(this.timer); }

  async procesar(): Promise<void> {
    if (this.ejecutando) return;
    this.ejecutando = true;
    try {
      // El reloj y la fecha se calculan en PostgreSQL con la zona argentina, no la del servidor.
      const usuarios: { id: string; email: string; fecha: string }[] = await this.db.query(`
        SELECT u.id, u.email, (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date::text AS fecha
        FROM usuarios u
        WHERE u."emailVerificado" = true
          AND (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time >= time '09:00'
          AND (EXISTS (SELECT 1 FROM objetivos o WHERE o."usuarioId" = u.id AND NOT o.completado
            AND o.fecha < (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)
          OR EXISTS (SELECT 1 FROM objetivos_recurrentes r WHERE r."usuarioId" = u.id
            AND r."fechaInicio" < (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
            AND NOT EXISTS (SELECT 1 FROM objetivos_recurrentes_cumplidos c WHERE c."objetivoId" = r.id
              AND c.fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - 1)))
      `);
      for (const usuario of usuarios) {
        const reclamo: { usuarioId: string }[] = await this.db.query(`
          INSERT INTO recordatorios_objetivos ("usuarioId", fecha, "bloqueadoHasta")
          VALUES ($1, $2, now() + interval '15 minutes')
          ON CONFLICT ("usuarioId", fecha) DO UPDATE SET "bloqueadoHasta" = excluded."bloqueadoHasta"
          WHERE NOT recordatorios_objetivos.enviado AND recordatorios_objetivos."bloqueadoHasta" < now()
          RETURNING "usuarioId"`, [usuario.id, usuario.fecha]);
        if (!reclamo.length) continue;
        try {
          const objetivos: { titulo: string; fecha: string }[] = await this.db.query(`SELECT titulo, fecha::text FROM objetivos WHERE "usuarioId" = $1 AND NOT completado AND fecha < $2 ORDER BY fecha, "creadoEn", id`, [usuario.id, usuario.fecha]);
          const recurrentes: { titulo: string }[] = await this.db.query(`SELECT r.titulo FROM objetivos_recurrentes r
            WHERE r."usuarioId" = $1 AND r."fechaInicio" < $2::date
              AND NOT EXISTS (SELECT 1 FROM objetivos_recurrentes_cumplidos c WHERE c."objetivoId" = r.id AND c.fecha = $2::date - 1)
            ORDER BY r."creadoEn", r.id`, [usuario.id, usuario.fecha]);
          const partes = [
            objetivos.length ? `Estos son tus objetivos pendientes:\n${objetivos.map(o => `• ${o.fecha}: ${o.titulo}`).join('\n')}` : '',
            recurrentes.length ? `Ayer te faltaron estos objetivos de todos los días:\n${recurrentes.map(o => `• ${o.titulo}`).join('\n')}\nCada día es una nueva oportunidad para seguir avanzando.` : '',
          ].filter(Boolean);
          if (partes.length) await this.mail.enviarMail(usuario.email, 'Tus objetivos · Tempo', `${partes.join('\n\n')}\n\nEntrá a Tempo para revisarlos.`);
          await this.db.query('UPDATE recordatorios_objetivos SET enviado = true WHERE "usuarioId" = $1 AND fecha = $2', [usuario.id, usuario.fecha]);
        } catch { this.logger.warn('No se pudo enviar el resumen de objetivos; se reintentará.'); }
      }
    } catch { this.logger.error('No se pudieron procesar los objetivos pendientes.'); }
    finally { this.ejecutando = false; }
  }
}
