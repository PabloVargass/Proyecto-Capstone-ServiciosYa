import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminService, safeUser } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../auth/mail.service';
import { resolveCategory } from '../jobs/category.util';
import { Prisma } from '../../generated/prisma/client';

describe('Administrative invariants (isolated transactions)', () => {
  let service: AdminService;
  const tx = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    usuario: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      update: jest.fn<Promise<unknown>, [Prisma.UsuarioUpdateArgs]>(),
    },
    auditoriaAdministrativa: {
      create: jest.fn<
        Promise<unknown>,
        [Prisma.AuditoriaAdministrativaCreateArgs]
      >(),
    },
    trabajo: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    resena: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    invitacionCuenta: { findUnique: jest.fn(), updateMany: jest.fn() },
    categoriaNombre: { findFirst: jest.fn() },
  };
  beforeEach(async () => {
    jest.resetAllMocks();
    tx.usuario.findUnique.mockResolvedValue({ rol: 'ADMIN', activo: true });
    tx.usuario.findUniqueOrThrow.mockResolvedValue({
      rol: 'ADMIN',
      activo: true,
      correoVerificadoEn: new Date(),
    });
    tx.usuario.count.mockResolvedValue(1);
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: async (
              operation: (client: typeof tx) => Promise<unknown>,
            ) => operation(tx),
          },
        },
        {
          provide: MailService,
          useValue: { enviarInvitacionCuenta: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(AdminService);
  });
  it.each([{ activo: false }, { rol: 'USUARIO' as const }])(
    'protects the last administrator: %j',
    async (change) => {
      await expect(
        service.access('actor', 'target', { ...change, motivo: 'test reason' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.usuario.update).not.toHaveBeenCalled();
      expect(tx.$executeRaw).toHaveBeenCalled();
    },
  );
  it('cannot change own role', () => {
    expect(() =>
      service.access('actor', 'actor', {
        rol: 'USUARIO',
        motivo: 'test reason',
      }),
    ).toThrow(ForbiddenException);
  });
  it('revokes sessions and audits access changes', async () => {
    tx.usuario.count.mockResolvedValue(2);
    tx.usuario.update.mockResolvedValue({
      id: 'target',
      rol: 'USUARIO',
      activo: true,
    });
    await service.access('actor', 'target', {
      rol: 'USUARIO',
      motivo: 'test reason',
    });
    expect(tx.usuario.update.mock.calls[0][0]).toMatchObject({
      data: { versionSesion: { increment: 1 } },
    });
    const auditInput: unknown =
      tx.auditoriaAdministrativa.create.mock.calls[0][0];
    expect(auditInput).toMatchObject({
      data: { actorId: 'actor', recursoId: 'target', motivo: 'test reason' },
    });
  });
  it('moderates visibility without altering contracting state', async () => {
    tx.trabajo.findUniqueOrThrow.mockResolvedValue({ oculto: false });
    tx.trabajo.update.mockResolvedValue({ id: 'job', oculto: true });
    await service.moderate('actor', 'Trabajo', 'job', {
      oculto: true,
      motivo: 'test reason',
    });
    expect(tx.trabajo.update).toHaveBeenCalledWith({
      where: { id: 'job' },
      data: { oculto: true },
    });
  });
  it('propagates an audit failure instead of returning success', async () => {
    tx.trabajo.findUniqueOrThrow.mockResolvedValue({ oculto: false });
    tx.trabajo.update.mockResolvedValue({ id: 'job', oculto: true });
    tx.auditoriaAdministrativa.create.mockRejectedValue(
      new Error('audit failure'),
    );
    await expect(
      service.moderate('actor', 'Trabajo', 'job', {
        oculto: true,
        motivo: 'test reason',
      }),
    ).rejects.toThrow('audit failure');
  });
  it.each(['expired', 'used', 'disabled', 'claimed'])(
    'rejects invalid invitation %s',
    async (mode) => {
      tx.invitacionCuenta.findUnique.mockResolvedValue({
        id: 'inv',
        usuarioId: 'target',
        expiraEn: new Date(mode === 'expired' ? 0 : Date.now() + 60000),
        usadoEn: mode === 'used' ? new Date() : null,
        usuario: {
          correo: 'user@example.test',
          activo: mode !== 'disabled',
          correoVerificadoEn: null,
        },
      });
      tx.invitacionCuenta.updateMany.mockResolvedValue({
        count: mode === 'claimed' ? 0 : 1,
      });
      await expect(
        service.accept({
          correo: 'user@example.test',
          codigo: 'a'.repeat(64),
          password: 'test123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tx.usuario.update).not.toHaveBeenCalled();
    },
  );
  it('stores only hashed passwords on invitation acceptance', async () => {
    tx.invitacionCuenta.findUnique.mockResolvedValue({
      id: 'inv',
      usuarioId: 'target',
      expiraEn: new Date(Date.now() + 60000),
      usadoEn: null,
      usuario: {
        correo: 'user@example.test',
        activo: true,
        correoVerificadoEn: null,
      },
    });
    tx.invitacionCuenta.updateMany.mockResolvedValue({ count: 1 });
    await service.accept({
      correo: 'user@example.test',
      codigo: 'a'.repeat(64),
      password: 'test123',
    });
    const passwordHash = tx.usuario.update.mock.calls[0][0].data.contrasena;
    expect(typeof passwordHash).toBe('string');
    expect(passwordHash).toMatch(/^\$2[aby]\$/);
  });
  it('blocks inactive historical category aliases', async () => {
    tx.categoriaNombre.findFirst.mockResolvedValue({
      categoriaId: 'cat',
      categoria: { activo: false },
    });
    await expect(
      resolveCategory(tx as unknown as Prisma.TransactionClient, 'Old name'),
    ).rejects.toThrow('desactivada');
  });
  it('never selects authentication secrets in user responses', () => {
    expect(safeUser).not.toHaveProperty('contrasena');
    expect(safeUser).not.toHaveProperty('tokensRecuperacion');
    expect(safeUser).not.toHaveProperty('invitaciones');
  });
});
