import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { IdentityService } from '../identity/identity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuthController } from './admin-auth.controller';
import { AuthService } from '../auth/auth.service';

describe('Administrative HTTP authorization (isolated, no real DB or mail)', () => {
  let app: INestApplication<Server>;
  let jwt: JwtService;
  let role = 'USUARIO';
  let active = true;
  let version = 0;
  const account = {
    findUnique: jest.fn(() =>
      Promise.resolve({
        rol: role,
        activo: active,
        versionSesion: version,
      }),
    ),
  };
  const service = {
    summary: jest.fn(() => ({ usuarios: 2 })),
    access: jest.fn(),
    invite: jest.fn(),
    category: jest.fn(),
    moderate: jest.fn(),
    accept: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
    users: jest.fn(),
    user: jest.fn(),
    profile: jest.fn(),
    jobs: jest.fn(),
    job: jest.fn(),
    categories: jest.fn(),
    reviews: jest.fn(),
    audit: jest.fn(),
    resendInvite: jest.fn(),
  };
  beforeAll(async () => {
    process.env.JWT_SECRET = 'isolated-test-secret';
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
      controllers: [AdminController, AdminAuthController],
      providers: [
        JwtAuthGuard,
        AdminGuard,
        { provide: PrismaService, useValue: { usuario: account } },
        { provide: AdminService, useValue: service },
        { provide: IdentityService, useValue: {} },
        {
          provide: AuthService,
          useValue: {
            login: () =>
              Promise.resolve({
                user: { id: 'user' },
                accessToken: 'never-return-for-user',
              }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication<INestApplication<Server>>();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
  });
  beforeEach(() => {
    role = 'USUARIO';
    active = true;
    version = 0;
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await app.close();
  });
  const routes: [string, string, object?][] = [
    ['get', '/admin/me'],
    ['get', '/admin/summary'],
    ['get', '/admin/roles'],
    ['get', '/admin/users'],
    ['get', '/admin/users/user'],
    ['post', '/admin/users', {}],
    ['patch', '/admin/users/user', {}],
    [
      'patch',
      '/admin/users/user/access',
      { rol: 'ADMIN', motivo: 'test reason' },
    ],
    ['post', '/admin/users/user/invitation', { motivo: 'test reason' }],
    ['get', '/admin/jobs'],
    ['get', '/admin/jobs/job'],
    [
      'patch',
      '/admin/jobs/job/moderation',
      { oculto: true, motivo: 'test reason' },
    ],
    ['get', '/admin/categories'],
    ['post', '/admin/categories', {}],
    ['patch', '/admin/categories/category', {}],
    ['get', '/admin/reviews'],
    [
      'patch',
      '/admin/reviews/review/moderation',
      { oculto: true, motivo: 'test reason' },
    ],
    ['get', '/admin/audit'],
    ['get', '/admin/identities'],
    ['get', '/admin/identities/identity/documents/foto'],
    [
      'patch',
      '/admin/identities/identity/review',
      { aprobada: true, motivo: 'test reason' },
    ],
    ['post', '/admin/logout', {}],
  ];
  it.each(routes.map(([method, path, body]) => [method, path, body ?? {}]))(
    'rejects ordinary users: %s %s',
    async (method, path, body) => {
      const token = await jwt.signAsync({ sub: 'user' });
      const agent = request(app.getHttpServer());
      const req =
        method === 'get'
          ? agent.get(path)
          : method === 'post'
            ? agent.post(path)
            : agent.patch(path);
      await req.set('Authorization', `Bearer ${token}`).send(body).expect(403);
    },
  );
  it('does not return a login token to an ordinary user', async () => {
    await request(app.getHttpServer())
      .post('/admin-auth/login')
      .send({ email: 'user@example.test', password: 'secret123' })
      .expect(403);
  });
  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/admin/summary').expect(401);
  });
  it('allows an active administrator', async () => {
    role = 'ADMIN';
    const token = await jwt.signAsync({ sub: 'user' });
    await request(app.getHttpServer())
      .get('/admin/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
  it('rejects removed roles even when a signed token claims ADMIN', async () => {
    const token = await jwt.signAsync({ sub: 'user', rol: 'ADMIN' });
    await request(app.getHttpServer())
      .get('/admin/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
  it('rejects disabled accounts with a previous token', async () => {
    role = 'ADMIN';
    active = false;
    const token = await jwt.signAsync({ sub: 'user' });
    await request(app.getHttpServer())
      .get('/admin/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
  it('rejects revoked sessions after reactivation', async () => {
    role = 'ADMIN';
    version = 2;
    const token = await jwt.signAsync({ sub: 'user', versionSesion: 1 });
    await request(app.getHttpServer())
      .get('/admin/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
  it('rejects password-reset tokens as sessions', async () => {
    role = 'ADMIN';
    const token = await jwt.signAsync({
      sub: 'user',
      purpose: 'password-reset',
    });
    await request(app.getHttpServer())
      .get('/admin/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
  it('does not classify a DB outage as an invalid session', async () => {
    role = 'ADMIN';
    account.findUnique.mockRejectedValueOnce(new Error('Test database outage'));
    const token = await jwt.signAsync({ sub: 'user' });
    await request(app.getHttpServer())
      .get('/admin/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });
  it('rejects invitation role escalation', async () => {
    await request(app.getHttpServer())
      .post('/admin-auth/accept-invitation')
      .send({
        correo: 'user@example.test',
        codigo: 'a'.repeat(64),
        password: 'secret123',
        rol: 'ADMIN',
      })
      .expect(400);
    expect(service.accept).not.toHaveBeenCalled();
  });
  it('rejects changes without a moderation reason', async () => {
    role = 'ADMIN';
    const token = await jwt.signAsync({ sub: 'user' });
    await request(app.getHttpServer())
      .patch('/admin/jobs/job/moderation')
      .set('Authorization', `Bearer ${token}`)
      .send({ oculto: true })
      .expect(400);
    expect(service.moderate).not.toHaveBeenCalled();
  });
});
