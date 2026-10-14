import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { Request } from 'express';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: { sub: string; versionSesion?: number } }
      >();
    const [type, token, extra] = (request.headers.authorization ?? '').split(
      ' ',
    );
    if (type !== 'Bearer' || !token || extra)
      throw new UnauthorizedException('Token inválido o no proporcionado.');
    let payload: { sub: string; purpose?: string; versionSesion?: number };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
    if (!payload.sub || payload.purpose)
      throw new UnauthorizedException('Token de sesión inválido.');
    // Do not catch database/network failures as 401: a temporary failure does not invalidate a session.
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { activo: true, versionSesion: true },
    });
    if (!user?.activo || user.versionSesion !== (payload.versionSesion ?? 0))
      throw new UnauthorizedException('La sesión ya no está autorizada.');
    request.user = payload;
    return true;
  }
}

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  constructor(jwtService: JwtService, prisma: PrismaService) {
    super(jwtService, prisma);
  }
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.headers.authorization) return true;
    return super.canActivate(context);
  }
}
