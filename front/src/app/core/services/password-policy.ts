import { ValidatorFn } from '@angular/forms';

export const passwordLength: ValidatorFn = (control) => {
  if (typeof control.value !== 'string' || !control.value) return null;
  // Coincide con Length de validator.js en la API: pares Unicode y selectores de presentación.
  const presentationSequences = control.value.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g)?.length ?? 0;
  const actualLength = Array.from(control.value).length - presentationSequences;
  return actualLength < 15 ? { minlength: { requiredLength: 15, actualLength } } : null;
};

export const passwordBytes: ValidatorFn = (control) =>
  typeof control.value === 'string' && new TextEncoder().encode(control.value).length > 72
    ? { passwordBytes: true } : null;
