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
          AND EXISTS (SELECT 1 FROM objetivos o WHERE o."usuarioId" = u.id AND NOT o.completado
            AND o.fecha < (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)
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
          if (objetivos.length) await this.mail.enviarMail(usuario.email, 'Tus objetivos pendientes', `Estos son tus objetivos pendientes:\n\n${objetivos.map(o => `• ${o.fecha}: ${o.titulo}`).join('\n')}\n\nEntrá a Tempo para revisarlos.`);
          await this.db.query('UPDATE recordatorios_objetivos SET enviado = true WHERE "usuarioId" = $1 AND fecha = $2', [usuario.id, usuario.fecha]);
        } catch { this.logger.warn('No se pudo enviar el resumen de objetivos; se reintentará.'); }
      }
    } catch { this.logger.error('No se pudieron procesar los objetivos pendientes.'); }
    finally { this.ejecutando = false; }
  }
}
