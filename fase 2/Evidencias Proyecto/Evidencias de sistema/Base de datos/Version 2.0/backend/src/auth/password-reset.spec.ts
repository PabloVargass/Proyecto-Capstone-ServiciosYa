import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from './mail.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

function setup(consumed = 1, active = 1) {
  const claim = jest
    .fn<Promise<{ count: number }>, [Record<string, unknown>]>()
    .mockResolvedValue({ count: consumed });
  const update = jest
    .fn<Promise<{ count: number }>, [Record<string, unknown>]>()
    .mockResolvedValue({ count: active });
  const tx = {
    tokenRecuperacion: { updateMany: claim },
    usuario: { updateMany: update },
  };
  const prisma = {
    tokenRecuperacion: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'code',
        usuarioId: 'user',
        usadoEn: null,
        expiraEn: new Date(Date.now() + 60000),
      }),
    },
    usuario: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user', activo: true }),
    },
    $transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
  };
  const jwt = {
    verifyAsync: jest.fn().mockResolvedValue({
      sub: 'user',
      purpose: 'password-reset',
      recoveryTokenId: 'code',
    }),
  };
  return {
    claim,
    update,
    service: new AuthService(
      {} as UsersService,
      jwt as unknown as JwtService,
      prisma as unknown as PrismaService,
      {} as MailService,
    ),
  };
}
describe('Recuperación atómica de contraseña y sesiones', () => {
  const dto = {
    resetToken: 'test-reset-token',
    password: 'NuevaClavePrueba1!',
  };
  it('guarda hash, incrementa versión y consume solo un código vigente del propietario', async () => {
    const { service, claim, update } = setup();
    await service.resetPassword(dto);
    const change = update.mock.calls[0][0] as {
      data: { contrasena: string; versionSesion: object };
    };
    expect(await bcrypt.compare(dto.password, change.data.contrasena)).toBe(
      true,
    );
    expect(change.data.versionSesion).toEqual({ increment: 1 });
    expect(claim.mock.calls[0][0]).toMatchObject({
      where: {
        id: 'code',
        usuarioId: 'user',
        usadoEn: null,
      },
    });
    const consumed = claim.mock.calls[0][0] as {
      where: { expiraEn: { gt: Date } };
    };
    expect(consumed.where.expiraEn.gt).toBeInstanceOf(Date);
    expect(claim).toHaveBeenCalledTimes(2);
  });
  it('si otra solicitud consumió el código no cambia la contraseña ni la sesión', async () => {
    const { service, update } = setup(0);
    await expect(service.resetPassword(dto)).rejects.toMatchObject({
      status: 401,
    });
    expect(update).not.toHaveBeenCalled();
  });
  it('rechaza una cuenta bloqueada durante la transacción', async () => {
    const { service, claim } = setup(1, 0);
    await expect(service.resetPassword(dto)).rejects.toMatchObject({
      status: 401,
    });
    expect(claim).toHaveBeenCalledTimes(1);
  });
});
