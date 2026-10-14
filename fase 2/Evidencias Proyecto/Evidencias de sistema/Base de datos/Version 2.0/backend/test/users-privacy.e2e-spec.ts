import type { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('Privacidad de perfiles (sin conexión a la base de datos)', () => {
  let app: INestApplication<Server>;
  let jwt: JwtService;
  const secret = 'isolated-users-privacy-test';
  const previousSecret = process.env.JWT_SECRET;
  const user = {
    id: 'usuario-1',
    nombre: 'Usuario de prueba',
    rut: 'rut-privado',
    correo: 'privado@example.invalid',
    telefono: 'telefono-privado',
    contrasena: 'hash-privado',
    activo: true,
    versionSesion: 0,
    creadoEn: new Date('2026-01-01T00:00:00Z'),
    actualizadoEn: new Date('2026-01-02T00:00:00Z'),
  };
  const findUnique = jest.fn();
  const prisma = {
    usuario: { findUnique },
    resena: { findMany: jest.fn().mockResolvedValue([]) },
    conversacion: { count: jest.fn().mockResolvedValue(0) },
    trabajo: { count: jest.fn().mockResolvedValue(0) },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret })],
      controllers: [UsersController],
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    findUnique
      .mockReset()
      .mockImplementation(
        ({
          where,
          select,
        }: {
          where: { id: string };
          select: Record<string, boolean>;
        }) => {
          if (where.id !== user.id) return null;
          return Object.fromEntries(
            Object.entries(user).filter(([key]) => select[key]),
          );
        },
      );
  });

  afterAll(async () => {
    await app?.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('devuelve información básica sin consultar los datos privados', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/usuario-1')
      .expect(200);
    expect(response.body).toEqual({
      id: user.id,
      name: user.nombre,
      createdAt: user.creadoEn.toISOString(),
      updatedAt: user.actualizadoEn.toISOString(),
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      select: { id: true, nombre: true, creadoEn: true, actualizadoEn: true },
    });
  });

  it('mantiene el perfil público completo sin datos de contacto', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/usuario-1/perfil')
      .expect(200);
    expect(response.body).toEqual({
      id: user.id,
      name: user.nombre,
      memberSince: user.creadoEn.toISOString(),
      rating: null,
      completedJobs: 0,
      reviewsCount: 0,
      reviews: [],
    });
  });

  it('mantiene 404 para un usuario inexistente', async () => {
    await request(app.getHttpServer()).get('/users/inexistente').expect(404);
  });

  it('no permite leer el perfil privado sin sesión', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('mantiene los datos privados propios y deriva la identidad del JWT', async () => {
    const token = await jwt.signAsync({ sub: user.id });
    const response = await request(app.getHttpServer())
      .get('/users/me?userId=otro-usuario')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toEqual({
      id: user.id,
      name: user.nombre,
      rut: user.rut,
      email: user.correo,
      phone: user.telefono,
      createdAt: user.creadoEn.toISOString(),
      updatedAt: user.actualizadoEn.toISOString(),
    });
    expect(findUnique).toHaveBeenCalledTimes(2);
    for (const call of [1, 2]) {
      expect(findUnique).toHaveBeenNthCalledWith(
        call,
        expect.objectContaining({ where: { id: user.id } }),
      );
    }
  });

  it('tener sesión no expone datos privados en una ruta pública', async () => {
    const token = await jwt.signAsync({ sub: 'otro-usuario' });
    const response = await request(app.getHttpServer())
      .get('/users/usuario-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toEqual({
      id: user.id,
      name: user.nombre,
      createdAt: user.creadoEn.toISOString(),
      updatedAt: user.actualizadoEn.toISOString(),
    });
  });
});
