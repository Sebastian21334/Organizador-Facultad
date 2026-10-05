import { ValidatorFn } from '@angular/forms';

export const passwordBytes: ValidatorFn = (control) =>
  typeof control.value === 'string' && new TextEncoder().encode(control.value).length > 72
    ? { passwordBytes: true } : null;
