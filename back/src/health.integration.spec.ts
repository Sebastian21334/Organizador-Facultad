import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import request from 'supertest';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MailService } from './mail/services/mail.service';
import { IaService } from './ia/services/ia.service';
import { LimitesService } from './usuarios/services/limites.service';
import { configurarBodyParsers } from './http-body-parsers';
import { SecurityExceptionFilter } from './security.filter';
import { allowedOrigins } from './security.config';
import type { NextFunction, Request, Response } from 'express';

// El grafo real de módulos arranca sin leer .env ni abrir conexiones externas.
jest.mock('@nestjs/config', () => {
  const actual =
    jest.requireActual<typeof import('@nestjs/config')>('@nestjs/config');
  const forRoot = actual.ConfigModule.forRoot.bind(
    actual.ConfigModule,
  ) as typeof actual.ConfigModule.forRoot;
  actual.ConfigModule.forRoot = (options) =>
    forRoot({ ...options, ignoreEnvFile: true });
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_USER: 'test',
    DB_PASSWORD: 'test',
    DB_NAME: 'test',
    DB_SSL: 'false',
    JWT_SECRET: 'clave-solo-de-prueba-con-mas-de-32-bytes',
    FRONTEND_URL: 'http://localhost:4200',
    FRONTEND_URLS: '',
    COOKIE_SAME_SITE: 'lax',
    TRUST_PROXY: '',
    AZURE_OPENAI_API_KEY: 'test',
    AZURE_OPENAI_ENDPOINT: 'https://example.test',
    AZURE_OPENAI_DEPLOYMENT: 'test',
    ACS_CONNECTION_STRING: 'test',
    ACS_SENDER_ADDRESS: 'test@example.test',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: '',
  });
  return actual;
});

describe('HTTP real /health y / con DataSource mockeado', () => {
  let app: NestExpressApplication;
  let db: DataSource;
  let query: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers({
      now: new Date('2026-10-29T12:00:00Z'),
      doNotFake: ['nextTick', 'setImmediate'],
    });
    db = new DataSource({ type: 'postgres' });
    query = jest.spyOn(db, 'query').mockResolvedValue([{ proximo: null }]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(db)
      .overrideProvider(MailService)
      .useValue({})
      .overrideProvider(IaService)
      .useValue({})
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.useLogger(false);
    app.disable('x-powered-by');
    app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));
    configurarBodyParsers(app);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        validationError: { target: false, value: false },
      }),
    );
    app.useGlobalFilters(new SecurityExceptionFilter());
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    });
    app.enableCors({
      origin: allowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    });
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('20 requests GET no ejecutan SQL ni consumen límites durante diez minutos', async () => {
    // La única consulta de arranque busca el próximo aviso; no pertenece al request.
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT MIN(GREATEST('),
      undefined,
      undefined,
    );
    query.mockClear();
    const consumir = jest.spyOn(app.get(LimitesService), 'consumir');
    for (let minuto = 0; minuto < 10; minuto++) {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200, { status: 'ok' });
      await request(app.getHttpServer()).get('/').expect(200, 'Hello World!');
      await jest.advanceTimersByTimeAsync(60_000);
    }
    expect(query).not.toHaveBeenCalled();
    expect(consumir).not.toHaveBeenCalled();
  });

  it('el recorrido de salud admite variantes de Express y credenciales inválidas sin SQL', async () => {
    query.mockClear();
    for (const path of ['/HEALTH', '/health/', '/']) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer invalido')
        .set('Cookie', 'tempo_session=invalida')
        .expect(200);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it('no accede a la base durante diez minutos de inactividad tras el arranque', async () => {
    query.mockClear();
    await jest.advanceTimersByTimeAsync(600_000);
    expect(query).not.toHaveBeenCalled();
  });
});
