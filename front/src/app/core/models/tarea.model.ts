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
  fechaLimite?: string;
  recordatorioMinutos?: number | null;
  origen?: OrigenTarea;
}
