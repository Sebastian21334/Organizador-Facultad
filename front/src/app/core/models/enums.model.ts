export enum TipoTarea {
  TAREA = 'tarea',
  EXAMEN = 'examen',
  ENTREGA = 'entrega',
  TP = 'tp',
  OTRO = 'otro',
}

export enum EstadoTarea {
  PENDIENTE = 'pendiente',
  EN_PROGRESO = 'en_progreso',
  HECHA = 'hecha',
}

export enum OrigenTarea {
  MANUAL = 'manual',
  WHATSAPP = 'whatsapp',
  IA_CHAT = 'ia_chat',
}

export enum FuenteMensaje {
  WHATSAPP = 'whatsapp',
  CHAT_APP = 'chat_app',
}

export enum Cuatrimestre {
  PRIMERO = '1',
  SEGUNDO = '2',
  ANUAL = 'anual',
}

export enum EstadoMateria {
  REGULAR = 'regular',
  APROBADO = 'aprobado',
  LIBRE = 'libre',
}
