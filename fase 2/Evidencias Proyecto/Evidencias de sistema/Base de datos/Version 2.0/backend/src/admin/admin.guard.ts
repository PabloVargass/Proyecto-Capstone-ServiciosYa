import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Request } from 'express';
export type SessionRequest = Request & {
  user: { sub: string; versionSesion?: number };
};
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<SessionRequest>();
    const user = await this.prisma.usuario.findUnique({
      where: { id: req.user.sub },
      select: { rol: true, activo: true },
    });
    if (!user?.activo || user.rol !== 'ADMIN')
      throw new ForbiddenException(
        'Se requiere una cuenta administradora activa.',
      );
    return true;
  }
}
