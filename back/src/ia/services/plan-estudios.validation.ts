import { BadGatewayException } from '@nestjs/common';
import { Cuatrimestre } from '../../materias/entities/materia.entity';
import { MAX_MATERIAS_PLAN, type MateriaPlan } from '../../materias/plan-estudios';

export interface ResultadoPlanEstudios {
  materias: MateriaPlan[];
  advertencias: string[];
}

export function validarPlanEstudios(value: unknown): ResultadoPlanEstudios {
  const invalid = (): never => { throw new BadGatewayException(
    'No pudimos interpretar el plan completo. Probá con un documento más claro o con el texto del plan.',
  ); };
  const objeto = (v: unknown, keys: string[]): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
  if (!objeto(value, ['materias', 'advertencias']) ||
    !Array.isArray(value.materias) || value.materias.length > MAX_MATERIAS_PLAN ||
    !Array.isArray(value.advertencias) || value.advertencias.length > 20 ||
    value.advertencias.some(v => typeof v !== 'string' || !v.trim() || v.length > 1000)) return invalid();
  for (const m of value.materias) {
    if (!objeto(m, ['nombre', 'anioCursado', 'cuatrimestre']) ||
      typeof m.nombre !== 'string' || !m.nombre.trim() || m.nombre.length > 150 ||
      (m.anioCursado !== null && (typeof m.anioCursado !== 'number' ||
        !Number.isInteger(m.anioCursado) || m.anioCursado < 1 || m.anioCursado > 20)) ||
      (m.cuatrimestre !== null && !Object.values(Cuatrimestre).includes(m.cuatrimestre as Cuatrimestre))) return invalid();
  }
  return {
    materias: (value.materias as MateriaPlan[]).map(m => ({ ...m, nombre: m.nombre.trim() })),
    advertencias: value.advertencias.map(v => (v as string).trim()),
  };
}
