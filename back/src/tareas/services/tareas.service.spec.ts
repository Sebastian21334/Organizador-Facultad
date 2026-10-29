import { TareasService } from './tareas.service';
import { TareasRepository } from '../repositories/tareas.repository';
import { MailService } from '../../mail/services/mail.service';
import { MateriasRepository } from '../../materias/repositories/materias.repository';
import { LimitesService } from '../../usuarios/services/limites.service';
import { EstadoTarea, Tarea } from '../entities/tarea.entity';

describe('TareasService: próximo aviso', () => {
  const ahora = new Date('2026-10-29T12:00:00Z');
  const proximoAviso = jest.fn<Promise<Date | null>, []>();
  const findRecordatoriosVencidos = jest.fn<Promise<Tarea[]>, [Date]>();
  const tarea: Tarea = { id: 'tarea', usuarioId: 'usuario' };
  const repo = {
    proximoAviso,
    findRecordatoriosVencidos,
    findById: jest.fn().mockResolvedValue(tarea),
    create: jest.fn().mockResolvedValue(tarea),
    update: jest.fn().mockResolvedValue(tarea),
    delete: jest.fn().mockResolvedValue(undefined),
    reclamarRecordatorio: jest.fn().mockResolvedValue(true),
    marcarRecordatorioEnviado: jest.fn().mockResolvedValue(undefined),
  };
  const enviarRecordatorio = jest.fn().mockResolvedValue(undefined);
  let service: TareasService;

  beforeEach(() => {
    jest.useFakeTimers({ now: ahora });
    jest.clearAllMocks();
    proximoAviso.mockReset().mockResolvedValue(null);
    findRecordatoriosVencidos.mockReset().mockResolvedValue([]);
    service = new TareasService(
      repo as unknown as TareasRepository,
      { enviarRecordatorio } as unknown as MailService,
      {} as MateriasRepository,
      {
        consumir: jest.fn().mockResolvedValue(undefined),
      } as unknown as LimitesService,
    );
  });
  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it.each([
    ['en el futuro', 120_000, 120_000],
    ['en el pasado', -60_000, 5_000],
    ['dentro de cinco segundos', 1_000, 5_000],
    ['a más de una hora', 7_200_000, 3_600_000],
    ['sin pendientes', null, 3_600_000],
  ])('espera lo esperado: %s', async (_caso, diferencia, espera) => {
    proximoAviso.mockResolvedValue(
      diferencia === null ? null : new Date(ahora.getTime() + diferencia),
    );
    await service.onModuleInit();
    expect(proximoAviso).toHaveBeenCalledTimes(1);
    expect(findRecordatoriosVencidos).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(espera - 1);
    expect(findRecordatoriosVencidos).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(findRecordatoriosVencidos).toHaveBeenCalledTimes(1);
    expect(proximoAviso).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);
  });

  it('reintenta a los cinco minutos si falla la consulta del próximo aviso', async () => {
    proximoAviso.mockRejectedValueOnce(new Error('sin conexión'));
    await service.reprogramar();
    await jest.advanceTimersByTimeAsync(299_999);
    expect(findRecordatoriosVencidos).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(findRecordatoriosVencidos).toHaveBeenCalledTimes(1);
    expect(proximoAviso).toHaveBeenCalledTimes(2);
  });

  it('reemplaza el temporizador anterior', async () => {
    proximoAviso.mockResolvedValueOnce(new Date(ahora.getTime() + 10_000));
    await service.reprogramar();
    await service.reprogramar();
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(findRecordatoriosVencidos).not.toHaveBeenCalled();
  });

  it('descarta una consulta vieja que termina después de la reprogramación más reciente', async () => {
    let resolver!: (fecha: Date) => void;
    proximoAviso.mockImplementationOnce(
      () =>
        new Promise<Date>((resolve) => {
          resolver = resolve;
        }),
    );
    const anterior = service.reprogramar();
    await service.reprogramar();
    resolver(new Date(ahora.getTime() + 5_000));
    await anterior;
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(5_000);
    expect(findRecordatoriosVencidos).not.toHaveBeenCalled();
  });

  it('no deja un temporizador si se cierra con una consulta en curso', async () => {
    let resolver!: (fecha: null) => void;
    proximoAviso.mockImplementationOnce(
      () =>
        new Promise<null>((resolve) => {
          resolver = resolve;
        }),
    );
    const pendiente = service.reprogramar();
    service.onModuleDestroy();
    resolver(null);
    await pendiente;
    await service.reprogramar();
    expect(jest.getTimerCount()).toBe(0);
    expect(proximoAviso).toHaveBeenCalledTimes(1);
  });

  it('envía el aviso al vencer y vuelve a consultar después de confirmarlo', async () => {
    const pendiente: Tarea = {
      ...tarea,
      titulo: 'Entrega',
      estado: EstadoTarea.PENDIENTE,
      fechaLimite: new Date(ahora.getTime() + 60_000),
      recordatorioMinutos: 1,
      usuario: {
        id: 'usuario',
        email: 'estudiante@example.test',
        nombre: 'Estudiante',
        emailVerificado: true,
        recordatorioEmailHabilitado: true,
      } as Tarea['usuario'],
    };
    proximoAviso.mockResolvedValueOnce(ahora);
    findRecordatoriosVencidos.mockResolvedValueOnce([pendiente]);
    await service.onModuleInit();
    await jest.advanceTimersByTimeAsync(5_000);
    expect(enviarRecordatorio).toHaveBeenCalledTimes(1);
    expect(repo.marcarRecordatorioEnviado).toHaveBeenCalledTimes(1);
    expect(proximoAviso).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);
  });

  it.each(['crear', 'actualizar', 'marcarComoHecha', 'eliminar'] as const)(
    'reprograma después de %s',
    async (operacion) => {
      const reprogramar = jest.spyOn(service, 'reprogramar');
      if (operacion === 'crear') await service.crear({}, 'usuario');
      if (operacion === 'actualizar')
        await service.actualizar('tarea', {}, 'usuario');
      if (operacion === 'marcarComoHecha')
        await service.marcarComoHecha('tarea', 'usuario');
      if (operacion === 'eliminar') await service.eliminar('tarea', 'usuario');
      expect(reprogramar).toHaveBeenCalledTimes(1);
    },
  );
});
