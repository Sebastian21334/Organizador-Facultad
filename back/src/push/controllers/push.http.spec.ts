import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import webPush from 'web-push';
import { PushController } from './push.controller';
import { PushService } from '../services/push.service';
import { PushSubscriptionsRepository } from '../repositories/push-subscriptions.repository';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { SeguridadGuard } from '../../auth/guards/seguridad.guard';
import { JWT_AUDIENCE, JWT_ISSUER } from '../../security.config';

describe('HTTP push: JWT, validación y CSRF reales; almacenamiento simulado', () => {
  let app: any;
  let jwt: JwtService;
  const id = randomUUID();
  const secret = 'secreto-para-pruebas-aisladas-mayor-a-32';
  const vapid = webPush.generateVAPIDKeys();
  const repo = {
    registrar: jest.fn(),
    eliminar: jest.fn(),
    buscarPorUsuario: jest.fn(async () => []),
  };
  const datos = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/prueba',
    keys: {
      p256dh: vapid.publicKey,
      auth: Buffer.alloc(16).toString('base64url'),
    },
  };
  beforeAll(async () => {
    const config = new ConfigService({
      JWT_SECRET: secret,
      VAPID_PUBLIC_KEY: vapid.publicKey,
      VAPID_PRIVATE_KEY: vapid.privateKey,
      VAPID_SUBJECT: 'mailto:tempo@example.com',
    });
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret,
          signOptions: {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            expiresIn: '1h',
          },
        }),
      ],
      controllers: [PushController],
      providers: [
        PushService,
        JwtStrategy,
        { provide: ConfigService, useValue: config },
        { provide: PushSubscriptionsRepository, useValue: repo },
        {
          provide: UsuariosService,
          useValue: {
            buscarPorId: async () => ({
              id,
              emailVerificado: true,
              sessionVersion: 0,
            }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalGuards(
      new SeguridadGuard({ consumir: async () => {} } as any, jwt, config),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => jest.clearAllMocks());
  const token = () =>
    jwt.sign({ sub: id, type: 'session', ver: 0, jti: randomUUID() });
  it('solo la clave pública es accesible sin sesión', async () => {
    const response = await request(app.getHttpServer())
      .get('/push/public-key')
      .expect(200);
    expect(response.body).toEqual({ publicKey: vapid.publicKey });
    await request(app.getHttpServer())
      .post('/push/subscriptions')
      .send(datos)
      .expect(401);
    await request(app.getHttpServer())
      .delete('/push/subscriptions')
      .send({ endpoint: datos.endpoint })
      .expect(401);
    await request(app.getHttpServer()).get('/push/subscriptions').expect(401);
    expect(repo.registrar).not.toHaveBeenCalled();
  });
  it('usa la identidad del JWT y valida campos antes de persistir', async () => {
    await request(app.getHttpServer())
      .post('/push/subscriptions')
      .auth(token(), { type: 'bearer' })
      .send(datos)
      .expect(201);
    expect(repo.registrar).toHaveBeenCalledWith(
      id,
      expect.objectContaining(datos),
    );
    await request(app.getHttpServer())
      .delete('/push/subscriptions')
      .auth(token(), { type: 'bearer' })
      .send({ endpoint: datos.endpoint })
      .expect(200);
    expect(repo.eliminar).toHaveBeenCalledWith(id, datos.endpoint);
    for (const extra of [
      { usuarioId: randomUUID() },
      { keys: { p256dh: 'inválida', auth: 'inválida' } },
      { endpoint: 'https://127.0.0.1/privado' },
    ])
      await request(app.getHttpServer())
        .post('/push/subscriptions')
        .auth(token(), { type: 'bearer' })
        .send({ ...datos, ...extra })
        .expect(400);
  });
  it('una cookie sin CSRF no registra dispositivos', async () => {
    await request(app.getHttpServer())
      .post('/push/subscriptions')
      .set('Cookie', 'tempo_session=' + token())
      .send(datos)
      .expect(403);
    expect(repo.registrar).not.toHaveBeenCalled();
  });
});
