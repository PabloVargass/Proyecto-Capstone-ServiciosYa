import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { MailService } from '../auth/mail.service';
import { normalizarRut, validarRut } from '../auth/utils/rut.util';
import {
  AccessDto,
  AcceptInviteDto,
  CategoryDto,
  InviteDto,
  ModerationDto,
  ProfileDto,
  IdentityReviewDto,
} from './admin.dto';

export const safeUser = {
  id: true,
  nombre: true,
  correo: true,
  rut: true,
  telefono: true,
  rol: true,
  activo: true,
  correoVerificadoEn: true,
  creadoEn: true,
  actualizadoEn: true,
} satisfies Prisma.UsuarioSelect;
const publicUser = { id: true, nombre: true } as const;
const digest = (code: string) =>
  createHash('sha256').update(code).digest('hex');

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async write<T>(
    actorId: string,
    action: string,
    resource: string,
    id: string,
    reason: string,
    operation: (
      tx: Prisma.TransactionClient,
    ) => Promise<{ result: T; changes: Prisma.InputJsonValue }>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // All administrative writes and bootstrap share this lock, including last-admin checks.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(736291)`;
          const actor = await tx.usuario.findUnique({
            where: { id: actorId },
            select: { rol: true, activo: true },
          });
          if (!actor?.activo || actor.rol !== 'ADMIN')
            throw new ForbiddenException('Permiso administrativo retirado.');
          const { result, changes } = await operation(tx);
          await tx.auditoriaAdministrativa.create({
            data: {
              actorId,
              accion: action,
              recurso: resource,
              recursoId: id,
              motivo: reason,
              cambios: changes,
            },
          });
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034')
          throw new ConflictException(
            'Otro cambio ocurrió al mismo tiempo. Reintenta.',
          );
        if (error.code === 'P2002')
          throw new ConflictException('Los datos ya están registrados.');
        if (error.code === 'P2025')
          throw new NotFoundException('El recurso no existe.');
      }
      throw error;
    }
  }

  me(id: string) {
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: safeUser,
    });
  }
  logout(id: string) {
    return this.write(
      id,
      'CERRAR_SESION',
      'Usuario',
      id,
      'Cierre de sesión desde el panel',
      async (tx) => {
        await tx.usuario.update({
          where: { id },
          data: { versionSesion: { increment: 1 } },
        });
        return { result: { ok: true }, changes: { sesionesRevocadas: true } };
      },
    );
  }
  async summary() {
    const [usuarios, activos, trabajos, postulaciones, estados, resenas] =
      await this.prisma.$transaction([
        this.prisma.usuario.count(),
        this.prisma.usuario.count({ where: { activo: true } }),
        this.prisma.trabajo.count(),
        this.prisma.postulacion.count(),
        this.prisma.trabajo.groupBy({
          by: ['estado'],
          orderBy: { estado: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.resena.count(),
      ]);
    return { usuarios, activos, trabajos, postulaciones, resenas, estados };
  }
  async users(q: string, rol: string, activo: string, page: number) {
    if (rol && !['ADMIN', 'USUARIO'].includes(rol))
      throw new BadRequestException('Rol inválido.');
    if (activo && !['true', 'false'].includes(activo))
      throw new BadRequestException('Estado inválido.');
    const where: Prisma.UsuarioWhereInput = {
      ...(rol ? { rol: rol as 'ADMIN' | 'USUARIO' } : {}),
      ...(activo ? { activo: activo === 'true' } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' } },
              { correo: { contains: q, mode: 'insensitive' } },
              { rut: { contains: q } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        select: safeUser,
        skip: (page - 1) * 20,
        take: 20,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.usuario.count({ where }),
    ]);
    return { items, total, page };
  }
  async user(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        ...safeUser,
        _count: {
          select: {
            trabajos: true,
            postulaciones: true,
            resenasRecibidas: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }
  profile(actor: string, id: string, d: ProfileDto) {
    const nombre = d.nombre.trim();
    if (nombre.length < 3) throw new BadRequestException('Nombre inválido.');
    return this.write(
      actor,
      'EDITAR_USUARIO',
      'Usuario',
      id,
      d.motivo,
      async (tx) => {
        const before = await tx.usuario.findUniqueOrThrow({
          where: { id },
          select: { nombre: true, telefono: true },
        });
        const result = await tx.usuario.update({
          where: { id },
          data: { nombre, telefono: d.telefono },
          select: safeUser,
        });
        return {
          result,
          changes: {
            antes: before,
            despues: { nombre: result.nombre, telefono: result.telefono },
          },
        };
      },
    );
  }
  access(actor: string, id: string, d: AccessDto) {
    if (d.rol === undefined && d.activo === undefined)
      throw new BadRequestException('Indica un cambio.');
    if (actor === id && d.rol !== undefined)
      throw new ForbiddenException('No puedes cambiar tu propio rol.');
    return this.write(
      actor,
      'CAMBIAR_ACCESO',
      'Usuario',
      id,
      d.motivo,
      async (tx) => {
        const before = await tx.usuario.findUniqueOrThrow({
          where: { id },
          select: {
            rol: true,
            activo: true,
            correoVerificadoEn: true,
            contrasena: true,
          },
        });
        const rol = d.rol ?? before.rol,
          activo = d.activo ?? before.activo;
        if (
          rol === 'ADMIN' &&
          before.rol !== 'ADMIN' &&
          (!before.correoVerificadoEn || !before.contrasena)
        )
          throw new BadRequestException(
            'La cuenta debe tener correo verificado y contraseña local antes de recibir acceso al panel.',
          );
        if (
          before.rol === 'ADMIN' &&
          before.activo &&
          (rol !== 'ADMIN' || !activo)
        ) {
          const admins = await tx.usuario.count({
            where: { rol: 'ADMIN', activo: true },
          });
          if (admins <= 1)
            throw new ConflictException(
              'No puedes retirar el acceso al último administrador activo.',
            );
        }
        const result = await tx.usuario.update({
          where: { id },
          data: { rol, activo, versionSesion: { increment: 1 } },
          select: safeUser,
        });
        return {
          result,
          changes: {
            antes: { rol: before.rol, activo: before.activo },
            despues: { rol, activo },
          },
        };
      },
    );
  }
  jobs(page: number) {
    return this.prisma.trabajo.findMany({
      skip: (page - 1) * 20,
      take: 21,
      orderBy: { creadoEn: 'desc' },
      include: {
        propietario: { select: publicUser },
        _count: { select: { postulaciones: true } },
      },
    });
  }
  async job(id: string) {
    const job = await this.prisma.trabajo.findUnique({
      where: { id },
      include: {
        propietario: { select: publicUser },
        postulaciones: { include: { usuario: { select: publicUser } } },
      },
    });
    if (!job) throw new NotFoundException('Trabajo no encontrado.');
    return job;
  }
  categories() {
    return this.prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { trabajos: true } } },
    });
  }
  category(actor: string, id: string | undefined, d: CategoryDto) {
    const categoryId = id ?? randomBytes(16).toString('hex');
    return this.write(
      actor,
      id ? 'EDITAR_CATEGORIA' : 'CREAR_CATEGORIA',
      'Categoria',
      categoryId,
      d.motivo,
      async (tx) => {
        const collision = await tx.categoriaNombre.findFirst({
          where: { nombre: { equals: d.nombre, mode: 'insensitive' } },
        });
        if (collision && collision.categoriaId !== categoryId)
          throw new ConflictException(
            'Ese nombre ya corresponde a otra categoría.',
          );
        const before = id
          ? await tx.categoria.findUniqueOrThrow({
              where: { id },
              select: { nombre: true, activo: true },
            })
          : null;
        const result = id
          ? await tx.categoria.update({
              where: { id },
              data: { nombre: d.nombre, activo: d.activo },
            })
          : await tx.categoria.create({
              data: {
                id: categoryId,
                nombre: d.nombre,
                activo: d.activo ?? true,
              },
            });
        if (!collision)
          await tx.categoriaNombre.create({
            data: { nombre: d.nombre, categoriaId: categoryId },
          });
        return {
          result,
          changes: {
            antes: before,
            despues: { nombre: result.nombre, activo: result.activo },
          },
        };
      },
    );
  }
  reviews(page: number) {
    return this.prisma.resena.findMany({
      skip: (page - 1) * 20,
      take: 21,
      orderBy: { creadoEn: 'desc' },
      include: {
        autor: { select: publicUser },
        receptor: { select: publicUser },
        trabajo: { select: { id: true, titulo: true } },
      },
    });
  }
  moderate(
    actor: string,
    resource: 'Trabajo' | 'Resena',
    id: string,
    d: ModerationDto,
  ) {
    return this.write(
      actor,
      d.oculto ? 'OCULTAR' : 'RESTAURAR',
      resource,
      id,
      d.motivo,
      async (tx) => {
        if (resource === 'Trabajo') {
          const before = await tx.trabajo.findUniqueOrThrow({
            where: { id },
            select: { oculto: true },
          });
          const result = await tx.trabajo.update({
            where: { id },
            data: { oculto: d.oculto },
          });
          return {
            result: { id: result.id, oculto: result.oculto },
            changes: { antes: before, despues: { oculto: d.oculto } },
          };
        }
        const before = await tx.resena.findUniqueOrThrow({
          where: { id },
          select: { oculta: true },
        });
        const result = await tx.resena.update({
          where: { id },
          data: { oculta: d.oculto },
        });
        return {
          result: { id: result.id, oculto: result.oculta },
          changes: { antes: before, despues: { oculta: d.oculto } },
        };
      },
    );
  }
  audit(page: number) {
    return this.prisma.auditoriaAdministrativa.findMany({
      skip: (page - 1) * 20,
      take: 21,
      orderBy: { creadoEn: 'desc' },
      include: { actor: { select: publicUser } },
    });
  }
  identities(page: number) {
    return this.prisma.solicitudIdentidad.findMany({
      skip: (page - 1) * 20,
      take: 21,
      orderBy: [{ estado: 'asc' }, { creadoEn: 'asc' }],
      select: {
        id: true,
        estado: true,
        creadoEn: true,
        revisadoEn: true,
        motivoRevision: true,
        certificadoTipo: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            rut: true,
            correo: true,
            activo: true,
          },
        },
      },
    });
  }
  reviewIdentity(actor: string, id: string, dto: IdentityReviewDto) {
    return this.write(
      actor,
      dto.aprobada ? 'APROBAR_IDENTIDAD' : 'RECHAZAR_IDENTIDAD',
      'SolicitudIdentidad',
      id,
      dto.motivo,
      async (tx) => {
        const before = await tx.solicitudIdentidad.findUniqueOrThrow({
          where: { id },
          select: { estado: true },
        });
        if (before.estado !== 'PENDIENTE')
          throw new ConflictException('Esta solicitud ya fue revisada.');
        const result = await tx.solicitudIdentidad.update({
          where: { id },
          data: {
            estado: dto.aprobada ? 'APROBADA' : 'RECHAZADA',
            revisadoEn: new Date(),
            revisadoPorId: actor,
            motivoRevision: dto.motivo,
          },
          select: {
            id: true,
            estado: true,
            revisadoEn: true,
            motivoRevision: true,
          },
        });
        return {
          result,
          changes: { antes: before.estado, despues: result.estado },
        };
      },
    );
  }
  async invite(actor: string, d: InviteDto) {
    const rut = normalizarRut(d.rut);
    if (!validarRut(rut)) throw new BadRequestException('RUT inválido.');
    const code = randomBytes(32).toString('hex');
    const userId = randomBytes(16).toString('hex');
    await this.write(
      actor,
      'INVITAR_USUARIO',
      'Usuario',
      userId,
      d.motivo,
      async (tx) => {
        await tx.usuario.create({
          data: {
            id: userId,
            nombre: d.nombre.trim(),
            rut,
            correo: d.correo.trim().toLowerCase(),
            telefono: d.telefono,
          },
        });
        await tx.invitacionCuenta.create({
          data: {
            usuarioId: userId,
            tokenHash: digest(code),
            expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        return { result: userId, changes: { cuentaPendiente: true } };
      },
    );
    await this.mail.enviarInvitacionCuenta(d.correo.trim().toLowerCase(), code);
    return {
      message: 'Cuenta pendiente creada. Se envió la invitación por correo.',
    };
  }
  async resendInvite(actor: string, id: string, reason: string) {
    const code = randomBytes(32).toString('hex');
    const email = await this.write(
      actor,
      'REENVIAR_INVITACION',
      'Usuario',
      id,
      reason,
      async (tx) => {
        const user = await tx.usuario.findUniqueOrThrow({
          where: { id },
          select: { correo: true, contrasena: true, activo: true },
        });
        if (user.contrasena || !user.activo)
          throw new BadRequestException('La cuenta no admite invitación.');
        await tx.invitacionCuenta.updateMany({
          where: { usuarioId: id, usadoEn: null },
          data: { usadoEn: new Date() },
        });
        await tx.invitacionCuenta.create({
          data: {
            usuarioId: id,
            tokenHash: digest(code),
            expiraEn: new Date(Date.now() + 86400000),
          },
        });
        return { result: user.correo, changes: { invitacionRenovada: true } };
      },
    );
    await this.mail.enviarInvitacionCuenta(email, code);
    return { message: 'Invitación reenviada.' };
  }
  async accept(d: AcceptInviteDto) {
    if (Buffer.byteLength(d.password, 'utf8') > 72)
      throw new BadRequestException(
        'La contraseña excede el límite seguro de 72 bytes.',
      );
    await this.prisma.$transaction(
      async (tx) => {
        const invite = await tx.invitacionCuenta.findUnique({
          where: { tokenHash: digest(d.codigo) },
          include: {
            usuario: {
              select: { correo: true, activo: true, contrasena: true },
            },
          },
        });
        if (
          !invite ||
          invite.usadoEn ||
          invite.expiraEn <= new Date() ||
          invite.usuario.correo !== d.correo.trim().toLowerCase() ||
          !invite.usuario.activo ||
          invite.usuario.contrasena
        )
          throw new UnauthorizedException(
            'La invitación no es válida o expiró.',
          );
        const hash = await bcrypt.hash(d.password, 12);
        const claimed = await tx.invitacionCuenta.updateMany({
          where: { id: invite.id, usadoEn: null, expiraEn: { gt: new Date() } },
          data: { usadoEn: new Date() },
        });
        if (claimed.count !== 1)
          throw new UnauthorizedException('Invitación utilizada.');
        await tx.usuario.update({
          where: { id: invite.usuarioId },
          data: {
            contrasena: hash,
            correoVerificadoEn: new Date(),
            versionSesion: { increment: 1 },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return {
      message: 'Cuenta activada. Ya puedes iniciar sesión en ServiciosYa.',
    };
  }
}
