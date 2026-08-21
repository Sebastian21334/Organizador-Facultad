import { Cuatrimestre, EstadoMateria } from './enums.model';

export interface Materia {
  id: string;
  nombre: string;
  anioCursado: number | null;
  cuatrimestre: Cuatrimestre | null;
  estado: EstadoMateria;
  usuarioId: string;
}

export interface CrearMateriaDto {
  nombre: string;
  anioCursado?: number;
  cuatrimestre?: Cuatrimestre;
  estado?: EstadoMateria;
}
