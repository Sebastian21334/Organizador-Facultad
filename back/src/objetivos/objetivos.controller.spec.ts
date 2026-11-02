import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ObjetivosController } from './objetivos.controller';
import { Objetivo } from './objetivo.entity';
import { EstadoTarea, Tarea } from '../tareas/entities/tarea.entity';
import type { SolicitudAutenticada } from '../auth/types/solicitud-autenticada';

describe('Asociación de tareas a objetivos', () => {
  const tareas = { findOneBy: jest.fn() };
  const objetivos = { create: jest.fn(x => x), save: jest.fn(x => Promise.resolve(x)) };
  const controller = new ObjetivosController(objetivos as unknown as Repository<Objetivo>, tareas as unknown as Repository<Tarea>);
  const req = { user: { userId: 'usuario' } } as SolicitudAutenticada;
  const dto = { titulo: 'Estudiar', fecha: '2026-11-01', tareaId: 'tarea' };
  beforeEach(() => jest.clearAllMocks());

  it.each([EstadoTarea.PENDIENTE, EstadoTarea.EN_PROGRESO])('permite una tarea propia sin completar: %s', async estado => {
    tareas.findOneBy.mockResolvedValue({ estado });
    await expect(controller.crear(dto, req)).resolves.toMatchObject({ tareaId: 'tarea', usuarioId: 'usuario' });
    expect(tareas.findOneBy).toHaveBeenCalledWith({ id: 'tarea', usuarioId: 'usuario' });
  });
  it('rechaza una tarea completada', async () => {
    tareas.findOneBy.mockResolvedValue({ estado: EstadoTarea.HECHA });
    await expect(controller.crear(dto, req)).rejects.toBeInstanceOf(BadRequestException);
    expect(objetivos.save).not.toHaveBeenCalled();
  });
  it('rechaza una tarea inexistente o de otro usuario', async () => {
    tareas.findOneBy.mockResolvedValue(null);
    await expect(controller.crear(dto, req)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('permite crear un objetivo sin tarea', async () => {
    await expect(controller.crear({ titulo: 'Leer', fecha: '2026-11-01' }, req)).resolves.toMatchObject({ tareaId: null });
    expect(tareas.findOneBy).not.toHaveBeenCalled();
  });
});
