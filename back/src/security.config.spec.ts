import {
  allowedOrigins,
  databaseSsl,
  sessionCookieOptions,
  validateEnvironment,
} from './security.config';
import { SecurityExceptionFilter } from './security.filter';
import { Logger } from '@nestjs/common';

describe('Configuración y errores seguros', () => {
  const config = {
    DB_HOST: 'db.example',
    DB_USER: 'test',
    DB_PASSWORD: 'fake',
    DB_NAME: 'test',
    JWT_SECRET: 'una-clave-aleatoria-de-prueba-mayor-a-32-bytes',
    FRONTEND_URL: 'https://tempo.example',
    AZURE_OPENAI_API_KEY: 'fake',
    AZURE_OPENAI_ENDPOINT: 'https://fake.example/openai/v1',
    AZURE_OPENAI_DEPLOYMENT: 'fake',
    ACS_CONNECTION_STRING: 'fake',
    ACS_SENDER_ADDRESS: 'fake@example.com',
    NODE_ENV: 'production',
  };
  it('falla al arrancar con secretos cortos, correo sin URL o HTTP en producción', () => {
    expect(() =>
      validateEnvironment({ ...config, JWT_SECRET: 'corto' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ ...config, FRONTEND_URL: '' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ ...config, FRONTEND_URL: 'http://tempo.example' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ ...config, FRONTEND_URLS: '*' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ ...config, FRONTEND_URLS: 'file:///tmp' }),
    ).toThrow();
    expect(() => validateEnvironment({ ...config, DB_SSL: 'false' })).toThrow();
    expect(() =>
      validateEnvironment({ ...config, TRUST_PROXY: 'true' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ ...config, TRUST_PROXY: '1' }),
    ).toThrow();
    expect(validateEnvironment(config)).toEqual(config);
  });
  it('verifica certificados por defecto en servidor y migraciones', () => {
    expect(databaseSsl({})).toEqual({ rejectUnauthorized: true });
    expect(databaseSsl({ DB_SSL_CA: 'certificado\\nlocal' })).toEqual({
      rejectUnauthorized: true,
      ca: 'certificado\nlocal',
    });
    expect(databaseSsl({ DB_SSL: 'false', NODE_ENV: 'production' })).toEqual({
      rejectUnauthorized: true,
    });
    expect(databaseSsl({ DB_SSL: 'false', NODE_ENV: 'development' })).toBe(
      false,
    );
  });
  it('normaliza orígenes exactos, no subcadenas', () => {
    expect(
      allowedOrigins({
        FRONTEND_URLS: ' https://tempo.example,https://tempo.example ',
      }),
    ).toEqual(['https://tempo.example']);
    expect(
      allowedOrigins({ FRONTEND_URL: 'https://tempo.example' }),
    ).not.toContain('https://tempo.example.atacante.example');
  });
  it('identifica la variable sin protocolo con un mensaje útil, sin mostrar su contenido', () => {
    expect(() => validateEnvironment({ ...config, FRONTEND_URLS: 'organizador-facultad-chat.vercel.app' }))
      .toThrow(/FRONTEND_URLS.*https:\/\//);
    expect(() => validateEnvironment({ ...config, FRONTEND_URL: 'tempo.example' }))
      .toThrow(/FRONTEND_URL.*https:\/\//);
    expect(() => allowedOrigins({ FRONTEND_URLS: 'https://usuario:secreto@tempo.example' }))
      .toThrow('FRONTEND_URLS debe incluir URLs HTTP(S) sin credenciales');
  });
  it('las cookies nunca son accesibles desde JavaScript', () => {
    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, path: '/' });
  });
  it('oculta detalles internos y no registra el cuerpo ni mensajes de proveedores', () => {
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => ({ method: 'POST', body: { password: 'secreto' } }),
      }),
    };
    new SecurityExceptionFilter().catch(
      new Error('token=secreto SQL DB_PASSWORD=secreto'),
      host as any,
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('secreto');
    expect(JSON.stringify(logger.mock.calls)).not.toContain('secreto');
    logger.mockRestore();
  });
});
