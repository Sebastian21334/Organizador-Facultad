import { HttpException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LimitesService } from './limites.service';

describe('LimitesService: limpieza perezosa', () => {
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]?]>();
  let service: LimitesService;
  const limpiezas = () =>
    query.mock.calls.filter(([sql]) => sql.startsWith('DELETE'));

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-29T12:00:00Z') });
    query.mockReset().mockResolvedValue([{ cantidad: 1 }]);
    service = new LimitesService({ query } as unknown as DataSource);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('no consulta sin consumo y limpia como máximo una vez cada cinco minutos', async () => {
    await jest.advanceTimersByTimeAsync(600_000);
    expect(query).not.toHaveBeenCalled();
    await service.consumir('api-ip', 'local', 240, 60_000);
    await service.consumir('api-ip', 'local', 240, 60_000);
    expect(limpiezas()).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(299_999);
    await service.consumir('api-ip', 'local', 240, 60_000);
    expect(limpiezas()).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1);
    await service.consumir('api-ip', 'local', 240, 60_000);
    expect(limpiezas()).toHaveLength(2);
    expect(
      query.mock.calls.filter(([sql]) => sql.startsWith('INSERT')),
    ).toHaveLength(4);
    expect(limpiezas()[0][0]).toContain('LIMIT 1000');
  });

  it('una limpieza fallida avisa y no impide aplicar el límite', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    query.mockRejectedValueOnce(new Error('sin conexión'));
    await service.consumir('api-ip', 'local', 240, 60_000);
    expect(warn).toHaveBeenCalledWith(
      'No se pudieron limpiar los límites vencidos',
    );
    await service.consumir('api-ip', 'local', 240, 60_000);
    expect(limpiezas()).toHaveLength(1);
  });

  it('sigue rechazando un consumo agotado con 429', async () => {
    query.mockResolvedValue([]);
    await expect(
      service.consumir('api-ip', 'local', 240, 60_000),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      service.consumir('api-ip', 'local', 240, 60_000),
    ).rejects.toMatchObject({ status: 429 });
  });
});
