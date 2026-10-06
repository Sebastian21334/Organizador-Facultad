import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { MateriasController } from './materias.controller';
import { MateriasService } from '../services/materias.service';
import { PlanEstudiosService } from '../services/plan-estudios.service';
import { MateriasRepository } from '../repositories/materias.repository';
import { IaService } from '../../ia/services/ia.service';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { SeguridadGuard } from '../../auth/guards/seguridad.guard';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { LimitesService } from '../../usuarios/services/limites.service';
import { SecurityExceptionFilter } from '../../security.filter';
import { configurarBodyParsers } from '../../http-body-parsers';
import { JWT_AUDIENCE, JWT_ISSUER, csrfToken } from '../../security.config';

describe('HTTP del plan con autenticación y validación reales, proveedores simulados', () => {
  let app: NestExpressApplication; let jwt: JwtService;
  const id = randomUUID(); const otro = randomUUID();
  const secret = 'secreto-aislado-mayor-a-32-bytes-para-pruebas';
  const origin = 'http://localhost:4200';
  const anteriorOrigin = process.env.FRONTEND_URL;
  const materia = { nombre: 'Física I', anioCursado: 1, cuatrimestre: '1' };
  const repo = {
    buscarTodasPorUsuario: jest.fn(async () => []),
    importarPlan: jest.fn(async () => ({ creadas: [], omitidas: [] })),
  };
  const ia = { extraerPlanEstudios: jest.fn(async () => ({ materias: [materia], advertencias: [] })) };
  const limites = { consumir: jest.fn(async () => {}) };
  beforeAll(async () => {
    process.env.FRONTEND_URL = origin;
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret, signOptions: { issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: '1h' } })],
      controllers: [MateriasController],
      providers: [PlanEstudiosService, JwtStrategy,
        { provide: ConfigService, useValue: new ConfigService({ JWT_SECRET: secret }) },
        { provide: MateriasService, useValue: { crear: jest.fn() } },
        { provide: MateriasRepository, useValue: repo }, { provide: IaService, useValue: ia },
        { provide: LimitesService, useValue: limites },
        { provide: UsuariosService, useValue: { buscarPorId: async (userId: string) =>
          [id, otro].includes(userId) ? { id: userId, emailVerificado: true, sessionVersion: 0 } : null } },
      ],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configurarBodyParsers(app);
    jwt = module.get(JwtService);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new SecurityExceptionFilter());
    app.useGlobalGuards(new SeguridadGuard(limites as any, jwt, module.get(ConfigService)));
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (anteriorOrigin === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = anteriorOrigin;
  });
  beforeEach(() => jest.clearAllMocks());
  const token = (usuarioId = id, jti = randomUUID()) => jwt.sign({ sub: usuarioId, type: 'session', ver: 0, jti });
  it('rechaza analizar o guardar sin sesión', async () => {
    for (const ruta of ['analizar', 'importar']) await request(app.getHttpServer())
      .post('/materias/plan/' + ruta).send(ruta === 'analizar' ? { texto: 'Plan de carrera con materias de primer año.' } : { materias: [materia] }).expect(401);
    expect(ia.extraerPlanEstudios).not.toHaveBeenCalled(); expect(repo.importarPlan).not.toHaveBeenCalled();
  });
  it('admite planes mayores de 32 KB sin ampliar el límite de otros endpoints', async () => {
    const texto = 'Plan de carrera. '.repeat(3000);
    await request(app.getHttpServer()).post('/materias/plan/analizar').auth(token(), { type: 'bearer' }).send({ texto }).expect(201);
    expect(ia.extraerPlanEstudios).toHaveBeenCalledWith(texto.trim());
    expect(repo.importarPlan).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post('/materias').auth(token(), { type: 'bearer' }).send({ nombre: texto }).expect(413);
  });
  it('rechaza planes demasiado largos y listas vacías antes de guardar', async () => {
    await request(app.getHttpServer()).post('/materias/plan/analizar').auth(token(), { type: 'bearer' }).send({ texto: 'x'.repeat(60_001) }).expect(400);
    await request(app.getHttpServer()).post('/materias/plan/importar').auth(token(), { type: 'bearer' }).send({ materias: [] }).expect(400);
    expect(ia.extraerPlanEstudios).not.toHaveBeenCalled(); expect(repo.importarPlan).not.toHaveBeenCalled();
  });
  it.each([
    { ...materia, anioCursado: 2026 }, { ...materia, cuatrimestre: '3' },
    { ...materia, usuarioId: otro }, { ...materia, estado: 'aprobado' }, { ...materia, nombre: ' ' },
  ])('valida los campos editados y rechaza campos internos: %#', async (value) => {
    await request(app.getHttpServer()).post('/materias/plan/importar').auth(token(), { type: 'bearer' }).send({ materias: [value] }).expect(400);
    expect(repo.importarPlan).not.toHaveBeenCalled();
  });
  it('guarda en la cuenta autenticada y permite campos sin definir', async () => {
    await request(app.getHttpServer()).post('/materias/plan/importar').auth(token(otro), { type: 'bearer' })
      .send({ materias: [{ nombre: '  Optativa  ', anioCursado: null, cuatrimestre: null }] }).expect(201);
    expect(repo.importarPlan).toHaveBeenCalledWith([{ nombre: 'Optativa', anioCursado: null, cuatrimestre: null }], otro);
  });
  it('la importación con cookie exige origen autorizado y CSRF', async () => {
    const jti = randomUUID(); const cookie = 'tempo_session=' + token(id, jti);
    await request(app.getHttpServer()).post('/materias/plan/importar').set('Cookie', cookie).set('Origin', origin).send({ materias: [materia] }).expect(403);
    await request(app.getHttpServer()).post('/materias/plan/importar').set('Cookie', cookie).set('Origin', origin)
      .set('X-CSRF-Token', csrfToken(jti, secret)).send({ materias: [materia] }).expect(201);
  });
});
