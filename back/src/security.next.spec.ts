import {
  backendUrl,
  checkOrigin,
  cookieOptions,
  readJson,
  sessionCookieName,
} from '../../Modulo chat/lib/security';

describe('Protecciones del proxy Next sin tráfico de red', () => {
  const before = {
    NODE_ENV: process.env.NODE_ENV,
    APP_ORIGIN: process.env.APP_ORIGIN,
    BACKEND_URL: process.env.BACKEND_URL,
  };
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ORIGIN = 'http://localhost:3001';
    process.env.BACKEND_URL = 'http://localhost:3000';
  });
  afterEach(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  it('bloquea orígenes ajenos y ausentes incluso en login/logout', () => {
    expect(
      checkOrigin(
        new Request('http://localhost:3001/api/auth/login', {
          headers: { Origin: 'http://localhost:3001' },
        }),
      ),
    ).toBeNull();
    expect(
      checkOrigin(
        new Request('http://localhost:3001/api/auth/login', {
          headers: { Origin: 'https://atacante.example' },
        }),
      )?.status,
    ).toBe(403);
    expect(
      checkOrigin(new Request('http://localhost:3001/api/auth/logout'))?.status,
    ).toBe(403);
  });
  it('producción exige un origen HTTPS explícito y cookies host-only seguras', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.APP_ORIGIN;
    expect(checkOrigin(new Request('https://tempo.example'))?.status).toBe(503);
    process.env.APP_ORIGIN = 'http://tempo.example';
    expect(
      checkOrigin(
        new Request('http://tempo.example', {
          headers: { Origin: 'http://tempo.example' },
        }),
      )?.status,
    ).toBe(503);
    expect(sessionCookieName()).toBe('__Host-tempo_chat');
    expect(cookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });
  it('solo usa el backend configurado y no admite credenciales ni HTTP remoto en producción', () => {
    expect(backendUrl('/mensajes')).toBe('http://localhost:3000/mensajes');
    process.env.NODE_ENV = 'production';
    process.env.BACKEND_URL = 'http://remoto.example';
    expect(() => backendUrl('/mensajes')).toThrow();
    process.env.BACKEND_URL = 'https://usuario:secreto@remoto.example';
    expect(() => backendUrl('/mensajes')).toThrow();
  });
  it('limita el cuerpo leído y rechaza contenidos de formulario', async () => {
    const body = (value: string, type = 'application/json') =>
      new Request('http://localhost:3001/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': type },
        body: value,
      });
    await expect(readJson(body('{"texto":"Parcial"}'))).resolves.toEqual({
      texto: 'Parcial',
    });
    await expect(readJson(body('x'.repeat(24001)))).rejects.toThrow(
      'demasiado grande',
    );
    await expect(
      readJson(body('texto=Parcial', 'application/x-www-form-urlencoded')),
    ).rejects.toThrow('JSON requerido');
    await expect(readJson(body('{malformado}'))).rejects.toThrow();
  });
});
