import { TipoTarea } from './enums.model';
import { Tarea } from './tarea.model';

export interface ResultadoExtraccionTarea {
  titulo: string;
  descripcion: string | null;
  materia: string | null;
  fecha: string | null;
  tipo: string;
  confianza: number;
  aclaracion: string | null;
}

export interface MensajeEntrante {
  id: string;
  textoOriginal: string;
  fuente: 'whatsapp' | 'chat_app';
  procesado: boolean;
  resultadoIA: ResultadoExtraccionTarea | null;
  tareaGenerada: Tarea | null;
  fechaRecibido: string;
}