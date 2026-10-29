import { validateEnvironment } from './security.config';

describe('Validación del entorno al eliminar any', () => {
  const base: NodeJS.ProcessEnv = {
    DB_HOST: 'localhost',
    DB_USER: 'test',
    DB_PASSWORD: 'test',
    DB_NAME: 'test',
    JWT_SECRET: 'secreto-de-prueba-con-mas-de-treinta-y-dos-bytes',
    FRONTEND_URL: 'http://localhost:4200',
    NODE_ENV: 'test',
    AZURE_OPENAI_API_KEY: 'test',
    AZURE_OPENAI_ENDPOINT: 'https://example.test',
    AZURE_OPENAI_DEPLOYMENT: 'test',
    ACS_CONNECTION_STRING: 'test',
    ACS_SENDER_ADDRESS: 'test@example.test',
  };

  it('acepta un entorno válido y conserva el objeto de configuración', () => {
    const env = { ...base };
    expect(validateEnvironment(env)).toBe(env);
  });

  it('rechaza cada variable requerida ausente o con tipo incorrecto', () => {
    for (const campo of Object.keys(base)) {
      const ausente = { ...base };
      delete ausente[campo];
      expect(() => validateEnvironment(ausente)).toThrow(
        `Falta configurar ${campo}`,
      );
      const malTipo = { ...base };
      Object.assign(malTipo, { [campo]: 42 });
      expect(() => validateEnvironment(malTipo)).toThrow(
        `Falta configurar ${campo}`,
      );
    }
  });

  it('sigue exigiendo HTTPS y TLS al configurar producción', () => {
    expect(() =>
      validateEnvironment({ ...base, NODE_ENV: 'production' }),
    ).toThrow('Producción requiere HTTPS');
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://example.test',
        DB_SSL: 'false',
      }),
    ).toThrow('Producción requiere HTTPS');
  });
});
