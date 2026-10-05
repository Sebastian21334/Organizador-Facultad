import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { LimitesService } from '../../usuarios/services/limites.service';
import {
  allowedOrigins,
  csrfToken,
  JWT_AUDIENCE,
  JWT_ISSUER,
  safeEqual,
  sessionCookie,
} from '../../security.config';

@Injectable()
export class SeguridadGuard implements CanActivate {
  constructor(
    private readonly limites: LimitesService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const mutacion = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    // Express ignora mayúsculas y admite slash final: ambos deben consumir el mismo límite.
    const routePath =
      typeof req.route?.path === 'string' ? req.route.path : req.path;
    const ruta = routePath.toLowerCase().replace(/\/+$/, '') || '/';
    const cookie = sessionCookie(req);
    const bearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (mutacion) {
      const origin = req.headers.origin;
      if (origin && !allowedOrigins().includes(origin))
        throw new ForbiddenException('Origen no permitido');
      if (!bearer && cookie) {
        if (!origin)
          throw new ForbiddenException('Falta el origen de la solicitud');
        const publica = [
          '/auth/login',
          '/auth/register',
          '/auth/forgot-password',
          '/auth/reset-password',
          '/auth/verify-email',
          '/auth/resend-verification',
          '/contacto',
        ].includes(ruta);
        if (!publica) {
          try {
            const payload = this.jwt.verify(cookie, {
              algorithms: ['HS256'],
              issuer: JWT_ISSUER,
              audience: JWT_AUDIENCE,
            });
            const recibido = req.headers['x-csrf-token'];
            if (
              payload.type !== 'session' ||
              typeof payload.jti !== 'string' ||
              typeof recibido !== 'string' ||
              !safeEqual(
                recibido,
                csrfToken(
                  payload.jti,
                  this.config.getOrThrow<string>('JWT_SECRET'),
                ),
              )
            )
              throw new Error();
          } catch {
            throw new ForbiddenException(
              'La solicitud no tiene una protección CSRF válida',
            );
          }
        }
      }
      if (
        ['POST', 'PUT', 'PATCH'].includes(req.method) &&
        !req.is('application/json')
      ) {
        throw new UnsupportedMediaTypeException(
          'Enviá el contenido como application/json',
        );
      }
    }
    const ip = req.ip ?? req.socket.remoteAddress ?? 'desconocido';
    try {
      await this.limites.consumir('api-ip', ip, 240, 60_000);
      if (ruta.startsWith('/auth/') && mutacion) {
        await this.limites.consumir('auth-ip', ip, 20, 600_000);
        const email = req.body?.email;
        if (typeof email === 'string' && email.length <= 254) {
          await this.limites.consumir(
            `auth-${ruta}`,
            email.trim().toLowerCase(),
            ruta === '/auth/login' ? 10 : 3,
            600_000,
          );
        }
      }
    } catch (error) {
      res.setHeader('Retry-After', '60');
      throw error;
    }
    return true;
  }
}
