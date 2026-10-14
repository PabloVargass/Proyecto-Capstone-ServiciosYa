import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from '../auth/dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import { AcceptInviteDto } from './admin.dto';
@Controller('admin-auth')
export class AdminAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly admin: AdminService,
  ) {}
  @Post('login') async login(@Body() d: LoginDto) {
    const session = await this.auth.login(d);
    const user = await this.prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true, activo: true },
    });
    if (!user?.activo || user.rol !== 'ADMIN')
      throw new ForbiddenException('Acceso exclusivo para administradores.');
    return session;
  }
  @Post('accept-invitation') accept(@Body() d: AcceptInviteDto) {
    return this.admin.accept(d);
  }
}
