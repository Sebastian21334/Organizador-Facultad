import { AbstractControl, ValidationErrors } from '@angular/forms';

/** La API guarda instantes ISO; los controles y agendas usan la hora local. */
export function fechaHoraLocal(fecha: string | Date | null): string {
  if (!fecha) return '';
  const date = new Date(fecha);
  if (!Number.isFinite(date.getTime())) return '';
  const dos = (numero: number) => String(numero).padStart(2, '0');
  return `${date.getFullYear()}-${dos(date.getMonth() + 1)}-${dos(date.getDate())}T${dos(date.getHours())}:${dos(date.getMinutes())}`;
}

export function fechaLocalAIso(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  const date = new Date(valor);
  // Rechaza desbordamientos y horas inexistentes por cambios de horario.
  return fechaHoraLocal(date) === valor ? date.toISOString() : null;
}

export function fechaHoraOpcional(control: AbstractControl): ValidationErrors | null {
  return !control.value || fechaLocalAIso(control.value) ? null : { fechaHora: true };
}

export function mismoDiaLocal(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
