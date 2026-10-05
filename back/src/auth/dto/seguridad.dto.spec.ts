import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';
import { ActualizarTareaDto } from '../../tareas/dto/actualizar-tarea.dto';
import { CrearMateriaDto } from '../../materias/dto/crear-materia.dto';
import { CrearMensajeDto } from '../../mensajes/dto/crear-mensaje.dto';
import { PaginacionDto } from '../../paginacion.dto';
import { validarResultadoIA } from '../../ia/services/ia.service';
import { TareasController } from '../../tareas/controllers/tareas.controller';

describe('Validación defensiva', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
  const validate = (metatype: any, value: unknown) =>
    pipe.transform(value, { type: 'body', metatype });
  it('conserva el nombre y normaliza el email del registro', async () => {
    const result = await validate(RegisterDto, {
      email: ' Seba@Example.com ',
      password: 'una frase muy segura',
      nombre: ' Seba ',
    });
    expect(result.nombre).toBe('Seba');
    expect(result.email).toBe('seba@example.com');
  });
  it('rechaza contraseñas objeto, cortas y que bcrypt truncaría en Unicode', async () => {
    await expect(
      validate(LoginDto, { email: 'a@example.com', password: {} }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validate(RegisterDto, { email: 'a@example.com', password: '123456' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validate(RegisterDto, {
        email: 'a@example.com',
        password: '🔒'.repeat(20),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('PATCH conserva metadatos de validación reales', () => {
    expect(
      Reflect.getMetadata(
        'design:paramtypes',
        TareasController.prototype,
        'actualizar',
      )[1],
    ).toBe(ActualizarTareaDto);
  });
  it.each([
    'usuarioId',
    'id',
    'recordatorioEnviadoEn',
    'recordatorioIntentoId',
    'usuario',
  ])('rechaza asignar el campo interno %s', async (campo) => {
    await expect(
      validate(ActualizarTareaDto, { [campo]: 'malicioso' }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('permite PATCH parciales pero no estados ni títulos inválidos', async () => {
    await expect(
      validate(ActualizarTareaDto, { estado: 'hecha' }),
    ).resolves.toHaveProperty('estado', 'hecha');
    await expect(
      validate(ActualizarTareaDto, { estado: 'cualquiera' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validate(ActualizarTareaDto, { titulo: null }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validate(ActualizarTareaDto, { titulo: '   ' }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('limita mensajes y permite materias sin datos académicos aún definidos', async () => {
    await expect(
      validate(CrearMensajeDto, {
        texto: 'x'.repeat(4001),
        fuente: 'chat_app',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validate(CrearMateriaDto, { nombre: ' Bases de datos ' }),
    ).resolves.toHaveProperty('nombre', 'Bases de datos');
  });
  it('limita y valida la paginación sin conversiones booleanas ni strings extraños', async () => {
    await expect(
      validate(PaginacionDto, { limit: '50', offset: '100' }),
    ).resolves.toMatchObject({ limit: 50, offset: 100 });
    await expect(
      validate(PaginacionDto, { limit: '100000' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validate(PaginacionDto, { limit: true }),
    ).rejects.toMatchObject({ status: 400 });
  });
  const valid = {
    titulo: 'Parcial',
    descripcion: null,
    materia: null,
    fecha: '2026-10-06',
    tipo: 'examen',
    confianza: 0.8,
    aclaracion: null,
  };
  it('valida nuevamente la salida de IA en el servidor', () => {
    expect(validarResultadoIA(valid)).toEqual(valid);
    for (const incorrecto of [
      { ...valid, usuarioId: 'otra-cuenta' },
      { ...valid, confianza: 4 },
      { ...valid, fecha: '2026-02-30' },
      { ...valid, materia: 'x'.repeat(151) },
      { ...valid, titulo: '' },
      { ...valid, tipo: 'comando' },
    ]) {
      expect(() => validarResultadoIA(incorrecto)).toThrow();
    }
  });
});
