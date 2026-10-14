import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostulacionesService } from './postulaciones.service';

describe('PostulacionesService', () => {
  let service: PostulacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostulacionesService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<PostulacionesService>(PostulacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('no permite rechazar una contratación con el endpoint de postulaciones', async () => {
    const update = jest.fn();
    const prisma = {
      postulacion: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'PENDIENTE',
          trabajo: { propietarioId: 'cliente', servicioOrigenId: 'servicio' },
        }),
        update,
      },
    };
    const offers = new PostulacionesService(prisma as unknown as PrismaService);
    await expect(
      offers.rechazar('cliente', 'postulacion'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });
});
