import {
  INestApplication,
  ExecutionContext,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SessionRequest } from '../admin/admin.guard';

describe('Subida multipart de identidad (sin BD)', () => {
  let app: INestApplication<Server>;
  const submit = jest
    .fn<
      Promise<{ id: string; estado: string }>,
      [string, unknown, unknown, unknown]
    >()
    .mockResolvedValue({ id: 'solicitud', estado: 'PENDIENTE' });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [{ provide: IdentityService, useValue: { submit } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<SessionRequest>();
          if (req.headers.authorization !== 'Bearer prueba')
            throw new UnauthorizedException();
          req.user = { sub: 'usuario-autenticado' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => submit.mockClear());
  function upload(consent = 'true') {
    return request(app.getHttpServer())
      .post('/identity/me')
      .set('Authorization', 'Bearer prueba')
      .field('rut', '12345678-5')
      .field('consentimiento', consent)
      .attach('foto', Buffer.from('fixture'), {
        filename: 'foto.png',
        contentType: 'image/png',
      })
      .attach('certificado', Buffer.from('fixture'), {
        filename: 'certificado.png',
        contentType: 'image/png',
      });
  }
  it('acepta los cuatro campos multipart y deriva el usuario de su sesión', async () => {
    await upload().expect(201, { id: 'solicitud', estado: 'PENDIENTE' });
    expect(submit.mock.calls[0][0]).toBe('usuario-autenticado');
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it('rechaza falta de consentimiento antes de procesar documentos', async () => {
    await upload('false').expect(400);
    expect(submit).not.toHaveBeenCalled();
  });
  it('requiere autenticación', async () => {
    await request(app.getHttpServer()).post('/identity/me').expect(401);
    expect(submit).not.toHaveBeenCalled();
  });
});
