import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, CookieOptions } from 'express';

export const JWT_ISSUER = 'tempo-api';
export const JWT_AUDIENCE = 'tempo-session';
export const SESSION_SECONDS = 60 * 60 * 24;

export function allowedOrigins(env = process.env): string[] {
  return [
    ...new Set(
      [...(env.FRONTEND_URLS ?? '').split(','), env.FRONTEND_URL ?? '']
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => {
          const url = new URL(value);
          if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password
          )
            throw new Error(
              'Los orígenes deben ser URLs HTTP(S) sin credenciales',
            );
          return url.origin;
        }),
    ),
  ];
}

export function sessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Host-tempo_session'
    : 'tempo_session';
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax',
    partitioned:
      process.env.NODE_ENV === 'production' &&
      process.env.COOKIE_SAME_SITE === 'none',
    path: '/',
    maxAge: SESSION_SECONDS * 1000,
  };
}

export function sessionCookie(req: Pick<Request, 'headers'>): string | null {
  const value = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName()}=`));
  if (!value) return null;
  try {
    return decodeURIComponent(value.slice(value.indexOf('=') + 1));
  } catch {
    return null;
  }
}

export function csrfToken(jti: string, secret: string): string {
  return createHmac('sha256', secret).update(`tempo-csrf:${jti}`).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  return (
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}

export function databaseSsl(env = process.env) {
  if (env.DB_SSL === 'false' && env.NODE_ENV !== 'production') return false;
  return {
    rejectUnauthorized: true,
    ...(env.DB_SSL_CA ? { ca: env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}),
  };
}

export function validateEnvironment(env: Record<string, any>) {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'FRONTEND_URL',
    'NODE_ENV',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_DEPLOYMENT',
    'ACS_CONNECTION_STRING',
    'ACS_SENDER_ADDRESS',
  ];
  for (const key of required) {
    if (typeof env[key] !== 'string' || !env[key].trim())
      throw new Error(`Falta configurar ${key}`);
  }
  if (Buffer.byteLength(env.JWT_SECRET) < 32)
    throw new Error('JWT_SECRET debe tener al menos 32 bytes aleatorios');
  if (!['production', 'development', 'test'].includes(env.NODE_ENV))
    throw new Error('NODE_ENV debe ser production, development o test');
  const origins = allowedOrigins(env);
  const frontend = new URL(env.FRONTEND_URL);
  if (
    !['http:', 'https:'].includes(frontend.protocol) ||
    frontend.username ||
    frontend.password ||
    frontend.search ||
    frontend.hash
  ) {
    throw new Error(
      'FRONTEND_URL debe ser una URL HTTP(S) sin credenciales ni parámetros',
    );
  }
  if (
    env.NODE_ENV === 'production' &&
    (origins.some((origin) => !origin.startsWith('https://')) ||
      env.DB_SSL === 'false')
  ) {
    throw new Error(
      'Producción requiere HTTPS en los frontends y verificación TLS en PostgreSQL',
    );
  }
  if (env.COOKIE_SAME_SITE && !['lax', 'none'].includes(env.COOKIE_SAME_SITE))
    throw new Error('COOKIE_SAME_SITE debe ser lax o none');
  if (env.COOKIE_SAME_SITE === 'none' && env.NODE_ENV !== 'production')
    throw new Error('SameSite=None requiere cookies Secure en producción');
  // Solo se confían rangos de proxies explícitos; nunca toda la cadena ni un número de saltos.
  if (env.TRUST_PROXY && /^(true|\d+)$/i.test(env.TRUST_PROXY))
    throw new Error(
      'TRUST_PROXY debe contener IPs o rangos CIDR de proxies conocidos',
    );
  return env;
}
