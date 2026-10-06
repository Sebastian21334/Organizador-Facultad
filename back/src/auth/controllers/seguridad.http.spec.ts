import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { SeguridadGuard } from '../guards/seguridad.guard';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { LimitesService } from '../../usuarios/services/limites.service';
import { MailService } from '../../mail/services/mail.service';
import { TareasController } from '../../tareas/controllers/tareas.controller';
import { TareasService } from '../../tareas/services/tareas.service';
import { TareasRepository } from '../../tareas/repositories/tareas.repository';
import { MateriasRepository } from '../../materias/repositories/materias.repository';
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
  SESSION_SECONDS,
} from '../../security.config';

describe('API de seguridad aislada con usuarios/repositorios/proveedor simulados', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const id = randomUUID();
  const otherId = randomUUID();
  const taskId = randomUUID();
  const materiaId = randomUUID();
  const secret = 'clave-aislada-de-pruebas-de-32-bytes-o-mas';
  const origin = 'http://localhost:4200';
  const user = {
    id,
    email: 'seba@example.com',
    nombre: 'Seba',
    emailVerificado: true,
    sessionVersion: 0,
    password: bcrypt.hashSync('una frase segura de prueba', 10),
  };
  const task = { id: taskId, usuarioId: id, titulo: 'Parcial' };
  const usuarios = {
    buscarPorId: jest.fn(async (key: string) => (key === id ? user : null)),
    buscarPorEmail: jest.fn(async () => user),
    revocarSesiones: jest.fn(async () => {
      user.sessionVersion++;
    }),
    actualizar: jest.fn(),
    cambiarPasswordSeguro: jest.fn(),
  };
  const limites = { consumir: jest.fn(async () => {}) };
  const tareas = {
    findById: jest.fn(async (key: string, owner: string) =>
      key === taskId && owner === id ? task : null,
    ),
    findRecordatoriosVencidos: jest.fn(async () => []),
    update: jest.fn(async (_id, data) => ({ ...task, ...data })),
    create: jest.fn(async (data) => data),
    findAll: jest.fn(async () => [task]),
  };
  const materias = {
    findById: jest.fn(async (_key: string, _owner: string) => null),
  };
  const previousOrigin = process.env.FRONTEND_URL;

  beforeAll(async () => {
    process.env.FRONTEND_URL = origin;
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret,
          signOptions: {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            algorithm: 'HS256',
            expiresIn: SESSION_SECONDS,
          },
        }),
      ],
      controllers: [AuthController, TareasController],
      providers: [
        AuthService,
        JwtStrategy,
        TareasService,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: secret }),
        },
        { provide: UsuariosService, useValue: usuarios },
        { provide: LimitesService, useValue: limites },
        { provide: MailService, useValue: {} },
        { provide: TareasRepository, useValue: tareas },
        { provide: MateriasRepository, useValue: materias },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalGuards(
      new SeguridadGuard(
        limites as unknown as LimitesService,
        jwt,
        module.get(ConfigService),
      ),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (previousOrigin === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousOrigin;
  });
  beforeEach(() => {
    user.sessionVersion = 0;
    user.emailVerificado = true;
    jest.clearAllMocks();
  });
  const token = (extra: object = {}, options: object = {}) =>
    jwt.sign(
      { sub: id, type: 'session', ver: 0, jti: randomUUID(), ...extra },
      options,
    );

  it.each(['email-verification', 'password-reset'])(
    'rechaza JWT de propósito %s como sesión',
    async (type) => {
      await request(app.getHttpServer())
        .get('/auth/perfil')
        .auth(token({ type }), { type: 'bearer' })
        .expect(401);
    },
  );
  it('rechaza firmas inválidas, tokens vencidos, otras audiencias y algoritmos', async () => {
    const foreign = new JwtService({ secret: 'otra-clave' }).sign({ sub: id });
    for (const invalid of [
      foreign,
      token({}, { expiresIn: -1 }),
      token({}, { audience: 'otra-app' }),
      token({}, { algorithm: 'HS384' }),
    ]) {
      await request(app.getHttpServer())
        .get('/auth/perfil')
        .auth(invalid, { type: 'bearer' })
        .expect(401);
    }
  });
  it('requiere usuarios existentes, verificados y sesiones no revocadas', async () => {
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .auth(token({ sub: otherId }), { type: 'bearer' })
      .expect(401);
    user.emailVerificado = false;
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .auth(token(), { type: 'bearer' })
      .expect(401);
    user.emailVerificado = true;
    user.sessionVersion = 1;
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .auth(token(), { type: 'bearer' })
      .expect(401);
  });
  it('el login del navegador usa HttpOnly y no entrega el JWT a JavaScript', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .send({ email: user.email, password: 'una frase segura de prueba' })
      .expect(201);
    expect(response.body).not.toHaveProperty('access_token');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=604800');
    const cookie = response.headers['set-cookie'][0].split(';')[0];
    const payload = jwt.verify(cookie.slice(cookie.indexOf('=') + 1));
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', cookie)
      .expect(200);
  });
  it('los clientes servidor-a-servidor mantienen compatibilidad Bearer', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'una frase segura de prueba' })
      .expect(201);
    expect(response.body.access_token).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .auth(response.body.access_token, { type: 'bearer' })
      .expect(200);
  });
  it('mayúsculas y slash final no crean límites de login independientes', async () => {
    await request(app.getHttpServer())
      .post('/AUTH/LOGIN/')
      .send({ email: user.email, password: 'una frase segura de prueba' })
      .expect(201);
    expect(limites.consumir).toHaveBeenCalledWith(
      'auth-/auth/login',
      user.email,
      10,
      600_000,
    );
  });
  it('la cookie restaura la sesión, pero una escritura exige origen y CSRF válidos', async () => {
    const cookie = 'tempo_session=' + token();
    const session = await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', cookie)
      .expect(200);
    expect(session.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    await request(app.getHttpServer())
      .patch('/tareas/' + taskId)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ titulo: 'Nuevo' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/tareas/' + taskId)
      .set('Cookie', cookie)
      .set('Origin', 'https://atacante.example')
      .set('X-CSRF-Token', session.body.csrfToken)
      .send({ titulo: 'Nuevo' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/tareas/' + taskId)
      .set('Cookie', cookie)
      .set('Origin', origin)
      .set('X-CSRF-Token', session.body.csrfToken)
      .send({ titulo: 'Nuevo' })
      .expect(200);
  });
  it('un encabezado Bearer vacío no permite saltar CSRF y usar la cookie', async () => {
    await request(app.getHttpServer())
      .patch('/tareas/' + taskId)
      .set('Cookie', 'tempo_session=' + token())
      .set('Authorization', 'Bearer ')
      .set('Origin', origin)
      .send({ titulo: 'Nuevo' })
      .expect(403);
  });
  it('logout revoca el JWT aunque alguien haya conservado una copia', async () => {
    const original = token();
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(original, { type: 'bearer' })
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .get('/auth/perfil')
      .auth(original, { type: 'bearer' })
      .expect(401);
  });
  it('rechaza formularios ajenos y cuerpos que no son JSON', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'https://atacante.example')
      .send({ email: user.email, password: 'una frase segura de prueba' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/login')
      .type('form')
      .send({ email: user.email, password: 'una frase segura de prueba' })
      .expect(415);
  });
  it('no acepta campos internos en PATCH ni relaciones con materias ajenas', async () => {
    await request(app.getHttpServer())
      .patch('/tareas/' + taskId)
      .auth(token(), { type: 'bearer' })
      .send({ usuarioId: otherId })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/tareas/' + taskId)
      .auth(token(), { type: 'bearer' })
      .send({ materiaId })
      .expect(404);
    expect(tareas.update).not.toHaveBeenCalled();
  });
  it('el servicio vuelve a filtrar campos aunque un caller interno eluda los DTO', async () => {
    await app
      .get(TareasService)
      .actualizar(
        taskId,
        {
          titulo: 'Seguro',
          usuarioId: otherId,
          recordatorioEnviadoEn: null,
        } as any,
        id,
      );
    expect(tareas.update).toHaveBeenCalledWith(
      taskId,
      { titulo: 'Seguro' },
      id,
    );
  });
  it('bloquea tareas ajenas, UUID inválidos y rangos excesivos', async () => {
    await request(app.getHttpServer())
      .get('/tareas/' + randomUUID())
      .auth(token(), { type: 'bearer' })
      .expect(404);
    await request(app.getHttpServer())
      .get('/tareas/no-es-uuid')
      .auth(token(), { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/tareas/calendario?desde=2020-01-01&hasta=2030-01-01')
      .auth(token(), { type: 'bearer' })
      .expect(400);
  });
});
