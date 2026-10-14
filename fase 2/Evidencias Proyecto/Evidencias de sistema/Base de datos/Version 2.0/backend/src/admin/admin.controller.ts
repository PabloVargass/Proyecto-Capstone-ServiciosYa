import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard, type SessionRequest } from './admin.guard';
import { AdminService } from './admin.service';
import {
  AccessDto,
  CategoryDto,
  InviteDto,
  ModerationDto,
  ProfileDto,
  ReasonDto,
  IdentityReviewDto,
} from './admin.dto';
import { IdentityService } from '../identity/identity.service';
const pageNumber = (value?: string) =>
  Math.max(1, Math.min(100000, Number.parseInt(value ?? '1', 10) || 1));
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly identities: IdentityService,
  ) {}
  @Post('logout') logout(@Req() r: SessionRequest) {
    return this.admin.logout(r.user.sub);
  }
  @Get('me') me(@Req() r: SessionRequest) {
    return this.admin.me(r.user.sub);
  }
  @Get('summary') summary() {
    return this.admin.summary();
  }
  @Get('roles') roles() {
    return [
      {
        codigo: 'USUARIO',
        nombre: 'Usuario',
        descripcion: 'Puede actuar como cliente y trabajador.',
      },
      {
        codigo: 'ADMIN',
        nombre: 'Administrador',
        descripcion: 'Permite administrar y moderar ServiciosYa.',
      },
    ];
  }
  @Get('users') users(
    @Query('q') q = '',
    @Query('rol') rol = '',
    @Query('activo') activo = '',
    @Query('page') page?: string,
  ) {
    return this.admin.users(q.slice(0, 120), rol, activo, pageNumber(page));
  }
  @Get('users/:id') user(@Param('id') id: string) {
    return this.admin.user(id);
  }
  @Post('users') invite(@Req() r: SessionRequest, @Body() d: InviteDto) {
    return this.admin.invite(r.user.sub, d);
  }
  @Patch('users/:id') profile(
    @Req() r: SessionRequest,
    @Param('id') id: string,
    @Body() d: ProfileDto,
  ) {
    return this.admin.profile(r.user.sub, id, d);
  }
  @Patch('users/:id/access') access(
    @Req() r: SessionRequest,
    @Param('id') id: string,
    @Body() d: AccessDto,
  ) {
    return this.admin.access(r.user.sub, id, d);
  }
  @Post('users/:id/invitation') resend(
    @Req() r: SessionRequest,
    @Param('id') id: string,
    @Body() d: ReasonDto,
  ) {
    return this.admin.resendInvite(r.user.sub, id, d.motivo);
  }
  @Get('jobs') jobs(@Query('page') page?: string) {
    return this.admin.jobs(pageNumber(page));
  }
  @Get('jobs/:id') job(@Param('id') id: string) {
    return this.admin.job(id);
  }
  @Patch('jobs/:id/moderation') jobModeration(
    @Req() r: SessionRequest,
    @Param('id') id: string,
    @Body() d: ModerationDto,
  ) {
    return this.admin.moderate(r.user.sub, 'Trabajo', id, d);
  }
  @Get('categories') categories() {
    return this.admin.categories();
  }
  @Post('categories') createCategory(
    @Req() r: SessionRequest,
    @Body() d: CategoryDto,
  ) {
    return this.admin.category(r.user.sub, undefined, d);
  }
  @Patch('categories/:id') category(
    @Req() r: SessionRequest,
    @Param('id') id: string,
    @Body() d: CategoryDto,
  ) {
    return this.admin.category(r.user.sub, id, d);
  }
  @Get('reviews') reviews(@Query('page') page?: string) {
    return this.admin.reviews(pageNumber(page));
  }
  @Patch('reviews/:id/moderation') reviewModeration(
    @Req() r: SessionRequest,
    @Param('id') id: string,
    @Body() d: ModerationDto,
  ) {
    return this.admin.moderate(r.user.sub, 'Resena', id, d);
  }
  @Get('audit') audit(@Query('page') page?: string) {
    return this.admin.audit(pageNumber(page));
  }
  @Get('identities') listIdentities(@Query('page') page?: string) {
    return this.admin.identities(pageNumber(page));
  }
  @Patch('identities/:id/review') reviewIdentity(
    @Req() r: SessionRequest,
    @Param('id') id: string,
    @Body() dto: IdentityReviewDto,
  ) {
    return this.admin.reviewIdentity(r.user.sub, id, dto);
  }
  @Get('identities/:id/documents/:kind')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async identityDocument(@Param('id') id: string, @Param('kind') kind: string) {
    const doc = await this.identities.document(id, kind);
    return new StreamableFile(doc.bytes, { type: doc.type });
  }
}
