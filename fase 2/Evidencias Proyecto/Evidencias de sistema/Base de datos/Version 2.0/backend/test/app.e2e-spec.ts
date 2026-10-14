import { INestApplication, ValidationPipe } from '@nestjs/common';

import { Test, TestingModule } from '@nestjs/testing';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import request from 'supertest';

import { AppModule } from './../src/app.module';
import { MailService } from './../src/auth/mail.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import type { Server } from 'node:http';

describe('ServiciosYa (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  // =====================================
  // DATOS EXCLUSIVOS PARA LOS TESTS
  // =====================================

  const testUser = {
    name: 'Usuario Test Jest',
    rut: '12.345.678-5',
    email: 'jest.serviciosya@test.cl',
    phone: '912345678',
    password: 'Test123456',
  };

  const secondTestEmail = 'otro.jest.serviciosya@test.cl';

  // =====================================
  // RUT NORMALIZADO
  // =====================================
  //
  // AuthService normaliza:
  //
  // 12.345.678-5
  //
  // a:
  //
  // 12345678-5
  // =====================================

  const normalizedTestRut = '12345678-5';

  // =====================================
  // MOCK DEL SERVICIO DE CORREO
  // =====================================
  //
  // Durante las pruebas NO queremos
  // enviar correos reales.
  //
  // AuthService seguirá creyendo que
  // MailService envió correctamente
  // el correo.
  // =====================================

  const mailServiceMock = {
    enviarVerificacionCorreo: jest.fn(() => Promise.resolve(undefined)),

    enviarRecuperacionContrasena: jest.fn(() => Promise.resolve(undefined)),
  };

  // =====================================
  // LIMPIAR USUARIOS DE TEST
  // =====================================
  //
  // IMPORTANTE:
  //
  // NO elimina todos los usuarios.
  //
  // Solamente elimina usuarios creados
  // específicamente por Jest.
  // =====================================

  const limpiarUsuariosTest = async () => {
    const usuarios = await prisma.usuario.findMany({
      where: {
        OR: [
          {
            correo: testUser.email,
          },

          {
            correo: secondTestEmail,
          },

          {
            rut: testUser.rut,
          },

          {
            rut: normalizedTestRut,
          },
        ],
      },

      select: {
        id: true,
      },
    });

    for (const usuario of usuarios) {
      // =================================
      // TOKENS DE VERIFICACIÓN
      // =================================

      await prisma.tokenVerificacionCorreo.deleteMany({
        where: {
          usuarioId: usuario.id,
        },
      });

      // =================================
      // TOKENS DE RECUPERACIÓN
      // =================================

      await prisma.tokenRecuperacion.deleteMany({
        where: {
          usuarioId: usuario.id,
        },
      });

      // =================================
      // ELIMINAR USUARIO
      // =================================

      await prisma.usuario.delete({
        where: {
          id: usuario.id,
        },
      });
    }
  };

  // =====================================
  // FUNCIÓN AUXILIAR
  // REGISTRAR USUARIO
  // =====================================

  const registrarUsuarioTest = async () => {
    return request(app.getHttpServer()).post('/auth/register').send(testUser);
  };

  // =====================================
  // INICIAR APLICACIÓN DE PRUEBAS
  // =====================================

  beforeAll(async () => {
    // Esta suite borra sus fixtures: exige una BD de pruebas explícita y aislada.
    const database = process.env.DATABASE_URL;
    const testDatabase = process.env.E2E_TEST_DATABASE_URL;
    const endpoint = (value: string) => {
      const url = new URL(value);
      return url.hostname.replace('-pooler.', '.') + url.pathname;
    };
    const root = resolve(__dirname, '..');
    const principal = parse(readFileSync(resolve(root, '.env'))).DATABASE_URL;
    const development = parse(
      readFileSync(resolve(root, '.env.development.local')),
    ).DATABASE_URL;
    if (
      !database ||
      !testDatabase ||
      endpoint(database) !== endpoint(testDatabase) ||
      endpoint(database) === endpoint(principal) ||
      endpoint(database) === endpoint(development)
    ) {
      throw new Error(
        'La suite con limpieza requiere E2E_TEST_DATABASE_URL y DATABASE_URL apuntando a una BD de pruebas aislada de principal y develop.',
      );
    }
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })

      // =================================
      // REEMPLAZAR MAILSERVICE
      // =================================

      .overrideProvider(MailService)
      .useValue(mailServiceMock)

      .compile();

    app = moduleFixture.createNestApplication();

    // =====================================
    // ACTIVAR VALIDACIONES
    // =====================================

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    // =====================================
    // OBTENER PRISMA
    // =====================================

    prisma = app.get<PrismaService>(PrismaService);

    // =====================================
    // LIMPIEZA INICIAL
    // =====================================

    await limpiarUsuariosTest();
  });

  // =====================================
  // ANTES DE CADA TEST
  // =====================================

  beforeEach(async () => {
    jest.clearAllMocks();

    if (prisma) await limpiarUsuariosTest();
  });

  // =====================================
  // TERMINAR PRUEBAS
  // =====================================

  afterAll(async () => {
    if (prisma) await limpiarUsuariosTest();
    if (app) await app.close();
  });

  // =====================================
  // TEST 1
  // BACKEND FUNCIONANDO
  // =====================================

  it('GET / debe responder correctamente', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // =====================================
  // TEST 2
  // RUT INVÁLIDO
  // =====================================

  it('POST /auth/register debe rechazar un RUT inválido', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,

        rut: '12.345.678-9',
      });

    expect(response.status).toBe(400);
  });

  // =====================================
  // TEST 3
  // CORREO INVÁLIDO
  // =====================================

  it('POST /auth/register debe rechazar un correo inválido', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,

        email: 'correo-invalido',
      });

    expect(response.status).toBe(400);
  });

  // =====================================
  // TEST 4
  // TELÉFONO INVÁLIDO
  // =====================================

  it('POST /auth/register debe rechazar un teléfono inválido', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,

        phone: '12345',
      });

    expect(response.status).toBe(400);
  });

  // =====================================
  // TEST 5
  // CONTRASEÑA CORTA
  // =====================================

  it('POST /auth/register debe rechazar una contraseña corta', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,

        password: '123',
      });

    expect(response.status).toBe(400);
  });

  // =====================================
  // TEST 6
  // REGISTRO CORRECTO
  // =====================================

  it('POST /auth/register debe registrar correctamente un usuario', async () => {
    const response = await registrarUsuarioTest();

    // =================================
    // RESPUESTA HTTP
    // =================================

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty('message');

    expect(response.body).toHaveProperty('requiresEmailVerification', true);

    expect(response.body).toHaveProperty('email', testUser.email);

    // =================================
    // BUSCAR USUARIO EN BD
    // =================================

    const usuario = await prisma.usuario.findUnique({
      where: {
        correo: testUser.email,
      },
    });

    expect(usuario).not.toBeNull();

    if (!usuario) {
      throw new Error('El usuario de prueba no fue creado.');
    }

    // =================================
    // RUT NORMALIZADO
    // =================================

    expect(usuario.rut).toBe(normalizedTestRut);

    // =================================
    // CORREO TODAVÍA NO VERIFICADO
    // =================================

    expect(usuario.correoVerificadoEn).toBeNull();

    // =================================
    // CONTRASEÑA CIFRADA
    // =================================

    expect(usuario.contrasena).not.toBeNull();

    expect(usuario.contrasena).not.toBe(testUser.password);

    // =================================
    // TOKEN DE VERIFICACIÓN
    // =================================

    const tokenVerificacion = await prisma.tokenVerificacionCorreo.findFirst({
      where: {
        usuarioId: usuario.id,
      },
    });

    expect(tokenVerificacion).not.toBeNull();

    // =================================
    // INTENTO DE ENVÍO DE CORREO
    // =================================

    expect(mailServiceMock.enviarVerificacionCorreo).toHaveBeenCalledTimes(1);
  });

  // =====================================
  // TEST 7
  // CORREO EXISTENTE NO VERIFICADO
  // =====================================
  //
  // Si alguien comenzó el registro pero
  // todavía NO verificó su correo,
  // AuthService NO crea otra cuenta.
  //
  // Reenvía un nuevo código.
  // =====================================

  it('POST /auth/register debe reenviar verificación si el correo ya existe pero no está verificado', async () => {
    // =================================
    // PRIMER REGISTRO
    // =================================

    const primerRegistro = await registrarUsuarioTest();

    expect(primerRegistro.status).toBe(201);

    // =================================
    // BUSCAR USUARIO ORIGINAL
    // =================================

    const usuarioAntes = await prisma.usuario.findUnique({
      where: {
        correo: testUser.email,
      },

      select: {
        id: true,
        correoVerificadoEn: true,
      },
    });

    expect(usuarioAntes).not.toBeNull();

    if (!usuarioAntes) {
      throw new Error('No se encontró el usuario creado para la prueba.');
    }

    expect(usuarioAntes.correoVerificadoEn).toBeNull();

    // =================================
    // CONTAR USUARIOS ANTES
    // =================================

    const cantidadAntes = await prisma.usuario.count({
      where: {
        correo: testUser.email,
      },
    });

    expect(cantidadAntes).toBe(1);

    // =================================
    // SEGUNDO INTENTO
    // =================================
    //
    // Mismo correo.
    //
    // El resto de los datos puede
    // cambiar, pero NO debe crearse
    // una segunda cuenta.
    // =================================

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,

        name: 'Otro Nombre',

        rut: '11.111.111-1',

        phone: '987654321',
      });

    // =================================
    // AUTH SERVICE RESPONDE 201
    // =================================
    //
    // Nest utiliza 201 para el POST.
    //
    // Pero NO significa que haya creado
    // otro usuario.
    //
    // AuthService simplemente respondió
    // indicando que la cuenta sigue
    // pendiente de verificación.
    // =================================

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty('requiresEmailVerification', true);

    expect(response.body).toHaveProperty('email', testUser.email);

    expect((response.body as { message: string }).message).toContain(
      'pendiente de verificación',
    );

    // =================================
    // COMPROBAR QUE SIGUE EXISTIENDO
    // SOLO UNA CUENTA
    // =================================

    const cantidadDespues = await prisma.usuario.count({
      where: {
        correo: testUser.email,
      },
    });

    expect(cantidadDespues).toBe(1);

    // =================================
    // COMPROBAR MISMO USUARIO
    // =================================

    const usuarioDespues = await prisma.usuario.findUnique({
      where: {
        correo: testUser.email,
      },

      select: {
        id: true,
        nombre: true,
        rut: true,
      },
    });

    expect(usuarioDespues).not.toBeNull();

    expect(usuarioDespues?.id).toBe(usuarioAntes.id);

    // =================================
    // NO DEBE CAMBIAR EL NOMBRE
    // =================================

    expect(usuarioDespues?.nombre).toBe(testUser.name);

    // =================================
    // NO DEBE CAMBIAR EL RUT
    // =================================

    expect(usuarioDespues?.rut).toBe(normalizedTestRut);

    // =================================
    // CORREO DEBE HABERSE INTENTADO
    // ENVIAR DOS VECES
    //
    // 1 = registro inicial
    // 2 = reenvío
    // =================================

    expect(mailServiceMock.enviarVerificacionCorreo).toHaveBeenCalledTimes(2);
  });

  // =====================================
  // TEST 8
  // CORREO DUPLICADO YA VERIFICADO
  // =====================================
  //
  // Este test reproduce el comportamiento
  // que comprobaste manualmente.
  // =====================================

  it('POST /auth/register debe rechazar un correo que ya pertenece a una cuenta verificada', async () => {
    // =================================
    // CREAR USUARIO
    // =================================

    const primerRegistro = await registrarUsuarioTest();

    expect(primerRegistro.status).toBe(201);

    // =================================
    // BUSCAR USUARIO
    // =================================

    const usuario = await prisma.usuario.findUnique({
      where: {
        correo: testUser.email,
      },
    });

    expect(usuario).not.toBeNull();

    if (!usuario) {
      throw new Error('No se encontró el usuario creado para la prueba.');
    }

    // =================================
    // SIMULAR CORREO VERIFICADO
    // =================================
    //
    // Aquí no necesitamos conocer el
    // código generado.
    //
    // El objetivo específico de esta
    // prueba es comprobar el comportamiento
    // del registro cuando la cuenta YA
    // está verificada.
    // =================================

    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },

      data: {
        correoVerificadoEn: new Date(),
      },
    });

    // =================================
    // INTENTAR REGISTRAR MISMO CORREO
    // =================================

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,

        name: 'Otro Usuario',

        rut: '11.111.111-1',

        phone: '987654321',
      });

    // =================================
    // DEBE SER RECHAZADO
    // =================================

    expect(response.status).toBe(409);

    expect((response.body as { message: string }).message).toContain(
      'correo electrónico',
    );

    // =================================
    // COMPROBAR QUE SIGUE EXISTIENDO
    // SOLO UNA CUENTA
    // =================================

    const cantidad = await prisma.usuario.count({
      where: {
        correo: testUser.email,
      },
    });

    expect(cantidad).toBe(1);
  });

  // =====================================
  // TEST 9
  // RUT DUPLICADO
  // =====================================

  it('POST /auth/register debe rechazar un RUT duplicado', async () => {
    // =================================
    // PRIMER REGISTRO
    // =================================

    const primerRegistro = await registrarUsuarioTest();

    expect(primerRegistro.status).toBe(201);

    // =================================
    // SEGUNDO REGISTRO
    // =================================
    //
    // Correo diferente.
    //
    // Mismo RUT.
    // =================================

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,

        email: secondTestEmail,
      });

    // =================================
    // DEBE RECHAZARLO
    // =================================

    expect(response.status).toBe(409);

    expect((response.body as { message: string }).message).toContain('RUT');
  });
});
