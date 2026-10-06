import { json } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';

export function configurarBodyParsers(app: NestExpressApplication): void {
  // Solo el plan permite texto largo; los demás endpoints conservan su límite.
  app.use('/materias/plan', json({ limit: '192kb' }));
  app.useBodyParser('json', { limit: '32kb' });
}
