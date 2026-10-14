import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { PrismaService } from '../src/prisma/prisma.service';
import { JobsController } from '../src/jobs/jobs.controller';
import { ServiceOffersService } from '../src/jobs/service-offers.service';
import { JobsService } from '../src/jobs/jobs.service';

// Aislar la base de datos: estas pruebas no crean ni eliminan datos.
jest.mock('../src/jobs/jobs.service', () => ({
  JobsService: class JobsService {},
}));

describe('JWT y GET /jobs/mis-trabajos (sin base de datos)', () => {
  let app: INestApplication<Server>;
  let jwt: JwtService;
  const secret = 'solo-para-pruebas-mis-trabajos';
  const previousSecret = process.env.JWT_SECRET;
  const result = {
    publicados: [],
    postulados: [],
    asignados: [],
    completados: [],
    resumen: { publicados: 0, postulados: 0, asignados: 0, completados: 0 },
  };
  const account = { findUnique: jest.fn() };
  const jobs = { misTrabajos: jest.fn().mockResolvedValue(result) };

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret, signOptions: { expiresIn: '7d' } }),
      ],
      controllers: [JobsController],
      providers: [
        { provide: ServiceOffersService, useValue: {} },
        { provide: JobsService, useValue: jobs },
        { provide: PrismaService, useValue: { usuario: account } },
      ],
    }).compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jobs.misTrabajos.mockClear();
    account.findUnique
      .mockReset()
      .mockResolvedValue({ activo: true, versionSesion: 0 });
  });

  afterAll(async () => {
    await app?.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('acepta el JWT de sesión y consulta los trabajos del usuario indicado por sub', async () => {
    const token = await jwt.signAsync({
      sub: 'usuario-1',
      email: 'usuario@test.cl',
    });
    const response = await request(app.getHttpServer())
      .get('/jobs/mis-trabajos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toEqual(result);
    expect(jobs.misTrabajos).toHaveBeenCalledWith('usuario-1');
  });

  it('rechaza la ausencia de token con 401', async () => {
    await request(app.getHttpServer()).get('/jobs/mis-trabajos').expect(401);
    expect(jobs.misTrabajos).not.toHaveBeenCalled();
  });

  it('rechaza un JWT inválido con 401', async () => {
    await request(app.getHttpServer())
      .get('/jobs/mis-trabajos')
      .set('Authorization', 'Bearer invalido')
      .expect(401);
    expect(jobs.misTrabajos).not.toHaveBeenCalled();
  });

  it('rechaza un JWT expirado con 401', async () => {
    const token = await jwt.signAsync({ sub: 'usuario-1' }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/jobs/mis-trabajos')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(jobs.misTrabajos).not.toHaveBeenCalled();
  });
  it('rechaza una cuenta desactivada aunque su JWT sea válido', async () => {
    account.findUnique.mockResolvedValue({ activo: false, versionSesion: 0 });
    const token = await jwt.signAsync({ sub: 'usuario-1' });
    await request(app.getHttpServer())
      .get('/jobs/mis-trabajos')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(jobs.misTrabajos).not.toHaveBeenCalled();
  });

  it('rechaza una sesión revocada', async () => {
    account.findUnique.mockResolvedValue({ activo: true, versionSesion: 1 });
    const token = await jwt.signAsync({ sub: 'usuario-1', versionSesion: 0 });
    await request(app.getHttpServer())
      .get('/jobs/mis-trabajos')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(jobs.misTrabajos).not.toHaveBeenCalled();
  });

  it('rechaza un token de recuperación como sesión', async () => {
    const token = await jwt.signAsync({
      sub: 'usuario-1',
      purpose: 'password-reset',
    });
    await request(app.getHttpServer())
      .get('/jobs/mis-trabajos')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(jobs.misTrabajos).not.toHaveBeenCalled();
  });
});
