import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LimitesService } from '../../usuarios/services/limites.service';
import { SeguridadGuard } from './seguridad.guard';
import * as seguridad from '../../security.config';

describe('SeguridadGuard: rutas de salud', () => {
  const consumir = jest.fn().mockResolvedValue(undefined);
  const guard = new SeguridadGuard(
    { consumir } as unknown as LimitesService,
    {} as JwtService,
    {} as ConfigService,
  );
  beforeEach(() => consumir.mockClear());

  it.each(['/health', '/', '/HEALTH/', '/health///'])(
    '%s no consume límites',
    async (path) => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', path }),
          getResponse: () => ({}),
        }),
      } as unknown as ExecutionContext;
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(consumir).not.toHaveBeenCalled();
    },
  );

  it('las demás rutas siguen consumiendo el límite de IP', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          path: '/tareas',
          headers: {},
          ip: '127.0.0.1',
        }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(consumir).toHaveBeenCalledWith('api-ip', '127.0.0.1', 240, 60_000);
  });
});

describe('SeguridadGuard: mantiene los controles al tipar las entradas', () => {
  const secret = 'secreto-de-prueba-con-mas-de-treinta-y-dos-bytes';
  const origen = 'http://localhost:4200';
  const jti = 'id-de-sesion-de-prueba';
  const jwt = new JwtService({ secret });
  const consumir = jest.fn().mockResolvedValue(undefined);
  const guard = new SeguridadGuard(
    { consumir } as unknown as LimitesService,
    jwt,
    { getOrThrow: () => secret } as unknown as ConfigService,
  );
  const contexto = (request: object) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    }) as unknown as ExecutionContext;
  beforeEach(() => {
    consumir.mockClear();
    jest.spyOn(seguridad, 'allowedOrigins').mockReturnValue([origen]);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['sesión válida', { type: 'session', jti }, true, true],
    ['tipo de token incorrecto', { type: 'reset', jti }, true, false],
    ['identificador no textual', { type: 'session', jti: 42 }, true, false],
    ['identificador ausente', { type: 'session' }, true, false],
    ['CSRF inválido', { type: 'session', jti }, false, false],
  ])(
    '%s conserva la decisión de CSRF',
    async (_caso, payload, csrfValido, permitido) => {
      const cookie = jwt.sign(payload, {
        issuer: seguridad.JWT_ISSUER,
        audience: seguridad.JWT_AUDIENCE,
      });
      const context = contexto({
        method: 'PATCH',
        path: '/tareas',
        ip: '127.0.0.1',
        headers: {
          origin: origen,
          cookie: `${seguridad.sessionCookieName()}=${cookie}`,
          'x-csrf-token': csrfValido
            ? seguridad.csrfToken(jti, secret)
            : 'invalido',
        },
        is: () => true,
      });
      if (permitido) {
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(consumir).toHaveBeenCalledWith(
          'api-ip',
          '127.0.0.1',
          240,
          60_000,
        );
      } else {
        await expect(guard.canActivate(context)).rejects.toMatchObject({
          status: 403,
        });
        expect(consumir).not.toHaveBeenCalled();
      }
    },
  );

  it.each([[null], [42], [{}], [['email@example.test']]])(
    'un email no textual (%j) no consume el límite de email',
    async (email: unknown) => {
      await guard.canActivate(
        contexto({
          method: 'POST',
          path: '/auth/login',
          headers: {},
          ip: '127.0.0.1',
          body: { email },
          is: () => true,
        }),
      );
      expect(consumir).toHaveBeenCalledTimes(2);
      expect(consumir).toHaveBeenNthCalledWith(
        2,
        'auth-ip',
        '127.0.0.1',
        20,
        600_000,
      );
    },
  );

  it('conserva la normalización de rutas de Express y del email', async () => {
    await guard.canActivate(
      contexto({
        method: 'POST',
        path: '/AUTH/LOGIN/',
        route: { path: '/AUTH/LOGIN/' },
        headers: {},
        ip: '127.0.0.1',
        body: { email: ' PERSONA@EXAMPLE.TEST ' },
        is: () => true,
      }),
    );
    expect(consumir).toHaveBeenNthCalledWith(
      3,
      'auth-/auth/login',
      'persona@example.test',
      10,
      600_000,
    );
  });
});
