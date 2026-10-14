import { Test } from '@nestjs/testing';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
describe('Moderated job detail preserves participant access', () => {
  let service: JobsService;
  const job = {
    id: 'job',
    titulo: 'Job',
    oculto: true,
    propietarioId: 'owner',
    propietario: { id: 'owner', nombre: 'Owner', correo: 'owner@example.test' },
  };
  const prisma = {
    trabajo: { findUnique: jest.fn() },
    postulacion: { findFirst: jest.fn() },
  };
  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.trabajo.findUnique.mockResolvedValue(job);
    const module = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(JobsService);
  });
  it('hides the detail from anonymous visitors', async () => {
    expect(await service.findOne('job')).toBeNull();
  });
  it('hides the detail from unrelated authenticated users', async () => {
    prisma.postulacion.findFirst.mockResolvedValue(null);
    expect(await service.findOne('job', 'stranger')).toBeNull();
  });
  it('keeps the owner detail available', async () => {
    expect(await service.findOne('job', 'owner')).toMatchObject({ id: 'job' });
  });
  it('keeps an existing applicant detail available', async () => {
    prisma.postulacion.findFirst.mockResolvedValue({ id: 'application' });
    expect(await service.findOne('job', 'worker')).toMatchObject({ id: 'job' });
  });
});
