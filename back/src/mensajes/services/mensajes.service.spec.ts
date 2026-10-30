import { MensajesService } from './mensajes.service';
import { MensajesRepository } from '../repositories/mensajes.repository';
import {
  IaService,
  ResultadoExtraccionTarea,
} from '../../ia/services/ia.service';
import { TareasService } from '../../tareas/services/tareas.service';
import { MateriasRepository } from '../../materias/repositories/materias.repository';
import { EstadoMateria, Materia } from '../../materias/entities/materia.entity';
import { LimitesService } from '../../usuarios/services/limites.service';
import {
  FuenteMensaje,
  MensajeEntrante,
} from '../entities/mensaje-entrante.entity';

describe('MensajesService: solo materias regulares para tareas nuevas', () => {
  const materias = [
    { id: 'm1', nombre: 'Álgebra', estado: EstadoMateria.REGULAR },
    { id: 'm2', nombre: 'Sistemas', estado: EstadoMateria.APROBADO },
    { id: 'm3', nombre: 'Programación', estado: EstadoMateria.LIBRE },
    { id: 'm4', nombre: 'Álgebra avanzada', estado: EstadoMateria.LIBRE },
  ] as Materia[];
  const extraerTarea = jest.fn<
    Promise<ResultadoExtraccionTarea>,
    [string, string[]]
  >();
  const crear = jest.fn().mockResolvedValue({ id: 'tarea' });
  const update = jest
    .fn<Promise<Partial<MensajeEntrante>>, [string, Partial<MensajeEntrante>]>()
    .mockResolvedValue({ id: 'mensaje' });
  let service: MensajesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MensajesService(
      {
        create: jest.fn().mockResolvedValue({ id: 'mensaje' }),
        update,
      } as unknown as MensajesRepository,
      { extraerTarea } as unknown as IaService,
      { crear } as unknown as TareasService,
      {
        buscarTodasPorUsuario: jest.fn().mockResolvedValue(materias),
      } as unknown as MateriasRepository,
      {
        consumir: jest.fn().mockResolvedValue(undefined),
      } as unknown as LimitesService,
    );
  });

  it.each(['Álgebra', 'Programación', 'Sistemas', 'Álgebra avanzada'])(
    'resuelve %s usando únicamente las materias regulares',
    async (nombre) => {
      extraerTarea.mockResolvedValue({
        titulo: 'Preparar parcial',
        descripcion: null,
        materia: nombre,
        fecha: null,
        tipo: 'examen',
        confianza: 1,
        aclaracion: null,
      });
      await service.procesarMensaje(
        'Preparar parcial',
        FuenteMensaje.CHAT_APP,
        'usuario',
      );
      expect(extraerTarea).toHaveBeenCalledWith('Preparar parcial', [
        'Álgebra',
      ]);
      if (nombre === 'Álgebra') {
        expect(crear).toHaveBeenCalledWith(
          expect.objectContaining({ materia: materias[0] }),
          'usuario',
        );
      } else {
        expect(crear).not.toHaveBeenCalled();
        expect(update).toHaveBeenCalledWith(
          'mensaje',
          expect.objectContaining({
            procesado: true,
          }),
        );
        expect(update.mock.calls[0]?.[1]).toHaveProperty(
          'resultadoIA.aclaracion',
          expect.stringContaining('estado Regular'),
        );
      }
    },
  );
});
