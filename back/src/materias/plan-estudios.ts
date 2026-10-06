import { Cuatrimestre } from './entities/materia.entity';

export const MAX_MATERIAS_PLAN = 200;
export const MAX_TEXTO_PLAN = 60_000;

export interface MateriaPlan {
  nombre: string;
  anioCursado: number | null;
  cuatrimestre: Cuatrimestre | null;
}

export function normalizarNombreMateria(nombre: string): string {
  return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}
