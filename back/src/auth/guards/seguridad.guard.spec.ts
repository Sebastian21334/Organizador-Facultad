import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LimitesService } from '../../usuarios/services/limites.service';
import { SeguridadGuard } from './seguridad.guard';

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
