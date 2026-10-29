import type { Request } from 'express';
import type { JwtStrategy } from '../strategies/jwt.strategy';

export interface SolicitudAutenticada extends Request {
  user: Awaited<ReturnType<JwtStrategy['validate']>>;
}
