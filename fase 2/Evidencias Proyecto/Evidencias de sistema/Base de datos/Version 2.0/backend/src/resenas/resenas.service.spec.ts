import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ResenasService } from './resenas.service';

describe('ResenasService', () => {
  let service: ResenasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResenasService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ResenasService>(ResenasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
