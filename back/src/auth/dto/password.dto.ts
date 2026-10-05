import { registerDecorator } from 'class-validator';

// bcrypt procesa como máximo 72 bytes, no 72 caracteres Unicode.
export function PasswordBytes(): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'passwordBytes',
      target: target.constructor,
      propertyName: String(propertyKey),
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
        defaultMessage: () =>
          'La contraseña no puede superar 72 bytes; evitá frases demasiado largas o muchos emojis.',
      },
    });
}
