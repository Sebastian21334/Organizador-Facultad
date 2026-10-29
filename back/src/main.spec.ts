import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

// No inicializar módulos, leer .env ni conectar clientes al probar el fallo de arranque.
jest.mock('./app.module', () => ({ AppModule: class {} }));

it('registra el fallo de arranque y termina con código de error sin exponer el detalle', async () => {
  jest
    .spyOn(NestFactory, 'create')
    .mockRejectedValueOnce(new Error('detalle privado de prueba'));
  const error = jest.spyOn(Logger, 'error').mockImplementation();
  const salir = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);
  try {
    jest.requireActual<unknown>('./main');
    await Promise.resolve();
    await Promise.resolve();
    expect(error).toHaveBeenCalledWith(
      'No se pudo iniciar el backend',
      'Bootstrap',
    );
    expect(salir).toHaveBeenCalledWith(1);
  } finally {
    jest.restoreAllMocks();
  }
});
