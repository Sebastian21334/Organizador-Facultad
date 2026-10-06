import { Cuatrimestre, Materia } from '../../core/models';

export const MAX_TEXTO_PLAN = 60_000;
export interface MateriaPlan {
  nombre: string;
  anioCursado: number | null;
  cuatrimestre: Cuatrimestre | null;
}
export interface VistaPlan {
  materias: (MateriaPlan & { existe: boolean })[];
  advertencias: string[];
}
export interface ResultadoImportacion {
  creadas: Materia[];
  omitidas: string[];
}
export function normalizarNombreMateria(nombre: string): string {
  return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}
