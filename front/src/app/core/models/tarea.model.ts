import { TipoTarea, EstadoTarea, OrigenTarea } from './enums.model';
import { Materia } from './materia.model';

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  materia: Materia | null;
  tipo: TipoTarea;
  estado: EstadoTarea;
  fechaLimite: string | null;
  recordatorioMinutos: number | null;
  origen: OrigenTarea;
  fechaCreacion: string;
}

export interface CrearTareaDto {
  titulo: string;
  descripcion?: string;
  materiaId?: string;
  tipo?: TipoTarea;
  estado?: EstadoTarea;
  fechaLimite?: string;
  recordatorioMinutos?: number | null;
  origen?: OrigenTarea;
}

/** Un campo omitido se conserva; null borra una asociación o fecha opcional. */
export type ActualizarTareaDto = Partial<Omit<CrearTareaDto, 'materiaId' | 'fechaLimite'>> & {
  materiaId?: string | null;
  fechaLimite?: string | null;
};
