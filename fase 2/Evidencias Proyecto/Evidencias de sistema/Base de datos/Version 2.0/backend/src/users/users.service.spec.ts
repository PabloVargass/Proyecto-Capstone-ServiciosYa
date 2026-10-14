import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('descubre únicamente cuentas activas y mantiene sus estadísticas públicas', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'activo',
        nombre: 'Prueba',
        creadoEn: new Date(),
        resenasRecibidas: [{ puntuacion: 5 }],
        conversacionesComoTrabajador: [],
        trabajos: [],
      },
    ]);
    const users = new UsersService({
      usuario: { findMany },
    } as unknown as PrismaService);
    expect(await users.findAll()).toEqual([
      expect.objectContaining({ id: 'activo', rating: 5, reviewsCount: 1 }),
    ]);
    const calls = findMany.mock.calls as unknown as unknown[][];
    const query = calls[0][0] as { where: object };
    expect(query.where).toEqual({ activo: true });
  });
});
