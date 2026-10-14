import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceOffersService } from './service-offers.service';

describe('ServiceOffersService', () => {
  function setup() {
    const service = {
      id: 'service',
      propietarioId: 'provider',
      propietario: { activo: true },
      tipo: 'SERVICIO',
      servicioOrigenId: null,
      oculto: false,
      estado: 'PUBLICADO',
      venceEn: new Date(Date.now() + 3600000),
      presupuesto: 20000,
      titulo: 'Armado',
      descripcion: 'Servicio ficticio',
      categoria: 'Armado',
      categoriaId: null,
      comuna: 'Santiago',
    };
    const tx = {
      trabajo: {
        findUnique: jest.fn().mockResolvedValue(service),
        create: jest.fn().mockResolvedValue({ id: 'contract' }),
        update: jest.fn(),
      },
      postulacion: {
        create: jest.fn().mockResolvedValue({ id: 'application' }),
        update: jest.fn(),
      },
      conversacion: { create: jest.fn().mockResolvedValue({ id: 'chat' }) },
      ofertaServicio: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }: { data: { estado: string } }) =>
            Promise.resolve({ id: 'offer', estado: data.estado }),
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: (callback: (arg: typeof tx) => unknown) => callback(tx),
    };
    return {
      service,
      tx,
      offers: new ServiceOffersService(prisma as unknown as PrismaService),
    };
  }
  it('acuerda el precio publicado y crea un contrato privado sin consumir la publicación', async () => {
    const { offers, tx } = setup();
    await expect(
      offers.create('client', 'service', {
        acceptPublishedPrice: true,
        amount: 1,
      }),
    ).resolves.toMatchObject({ status: 'ACEPTADA', conversationId: 'chat' });
    expect(tx.trabajo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          presupuesto: 20000,
          propietarioId: 'client',
          servicioOrigenId: 'service',
          estado: 'ASIGNADO',
        }) as unknown,
      }),
    );
    expect(tx.trabajo.update).not.toHaveBeenCalled();
  });
  it('deja una contraoferta pendiente y sin permiso para iniciar el contrato', async () => {
    const { offers, tx } = setup();
    await expect(
      offers.create('client', 'service', {
        acceptPublishedPrice: false,
        amount: 15000,
      }),
    ).resolves.toMatchObject({ status: 'PENDIENTE' });
    expect(tx.trabajo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'PUBLICADO',
          presupuesto: 15000,
        }) as unknown,
      }),
    );
  });
  it('rechaza publicaciones vencidas sin crear un contrato', async () => {
    const { offers, tx, service } = setup();
    service.venceEn = new Date(0);
    await expect(
      offers.create('client', 'service', { acceptPublishedPrice: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.trabajo.create).not.toHaveBeenCalled();
  });
  it('rechaza la contratación propia', async () => {
    const { offers } = setup();
    await expect(
      offers.create('provider', 'service', { acceptPublishedPrice: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('impide que un tercero responda una oferta', async () => {
    const { offers, tx, service } = setup();
    tx.ofertaServicio.findUnique.mockResolvedValue({
      id: 'offer',
      servicio: service,
      trabajo: { conversacion: { id: 'chat' } },
    });
    await expect(
      offers.respond('outsider', 'offer', true),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.ofertaServicio.updateMany).not.toHaveBeenCalled();
  });
  it('no cambia el contrato si otra solicitud ya respondió la oferta', async () => {
    const { offers, tx, service } = setup();
    tx.ofertaServicio.findUnique.mockResolvedValue({
      id: 'offer',
      servicio: service,
      trabajo: { conversacion: { id: 'chat' } },
    });
    tx.ofertaServicio.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      offers.respond('provider', 'offer', false),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.trabajo.update).not.toHaveBeenCalled();
  });
});
