import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================
  // BUSCAR POR CORREO
  // =====================================

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: {
        correo: email,
      },
    });
  }

  // =====================================
  // BUSCAR POR RUT
  // =====================================

  async findByRut(rut: string) {
    return this.prisma.usuario.findUnique({
      where: {
        rut,
      },
    });
  }

  // =====================================
  // BUSCAR POR GOOGLE ID
  // =====================================

  async findByGoogleId(
    googleId: string,
  ) {
    return this.prisma.usuario.findUnique({
      where: {
        googleId,
      },
    });
  }

  // =====================================
  // LISTA DE USUARIOS PARA DESCUBRIR
  // =====================================

  async findAll() {
    const usuarios =
      await this.prisma.usuario.findMany({
        where: { activo: true },
        orderBy: {
          creadoEn: 'desc',
        },

        select: {
          id: true,
          nombre: true,
          creadoEn: true,

          resenasRecibidas: { where: { oculta: false },
            select: {
              puntuacion: true,
            },
          },

          conversacionesComoTrabajador: {
            where: {
              trabajo: {
                estado: 'COMPLETADO',
              },
            },

            select: {
              id: true,
            },
          },

          trabajos: {
            where: {
              estado: 'COMPLETADO',
            },

            select: {
              id: true,
            },
          },
        },
      });

    return usuarios.map(
      (usuario) => {
        const totalResenas =
          usuario.resenasRecibidas.length;

        const promedio =
          totalResenas > 0
            ? usuario.resenasRecibidas.reduce(
                (
                  suma,
                  resena,
                ) =>
                  suma +
                  resena.puntuacion,
                0,
              ) / totalResenas
            : null;

        const completedJobs =
          usuario
            .conversacionesComoTrabajador
            .length +
          usuario.trabajos.length;

        return {
          id:
            usuario.id,

          name:
            usuario.nombre,

          memberSince:
            usuario.creadoEn,

          rating:
            promedio !== null
              ? Number(
                  promedio.toFixed(
                    1,
                  ),
                )
              : null,

          completedJobs,

          reviewsCount:
            totalResenas,
        };
      },
    );
  }

  // =====================================
  // BUSCAR USUARIO
  // =====================================

  async findPublicUser(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        creadoEn: true,
        actualizadoEn: true,
      },
    });

    if (!usuario) return null;

    return {
      id: usuario.id,
      name: usuario.nombre,
      createdAt: usuario.creadoEn,
      updatedAt: usuario.actualizadoEn,
    };
  }

  async findOne(id: string) {
    const usuario =
      await this.prisma.usuario.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          rol: true,
          telefono: true,
          creadoEn: true,
          actualizadoEn: true,
        },
      });

    if (!usuario) {
      return null;
    }

    return {
      id:
        usuario.id,

      name:
        usuario.nombre,

      rut:
        usuario.rut,

      role: usuario.rol,

      email:
        usuario.correo,

      phone:
        usuario.telefono,

      createdAt:
        usuario.creadoEn,

      updatedAt:
        usuario.actualizadoEn,
    };
  }

  // =====================================
  // EDITAR PERFIL
  // =====================================

  async updateProfile(
    usuarioId: string,
    data: UpdateProfileDto,
  ) {
    // -------------------------------------
    // COMPROBAR QUE EL USUARIO EXISTE
    // -------------------------------------

    const usuarioActual =
      await this.prisma.usuario.findUnique({
        where: {
          id:
            usuarioId,
        },

        select: {
          id: true,
        },
      });

    if (!usuarioActual) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    // -------------------------------------
    // COMPROBAR QUE HAYA ALGO QUE EDITAR
    // -------------------------------------

    if (
      data.name === undefined &&
      data.phone === undefined
    ) {
      throw new BadRequestException(
        'Debes indicar al menos un dato para actualizar.',
      );
    }

    // -------------------------------------
    // LIMPIAR NOMBRE
    // -------------------------------------

    const nombre =
      data.name !== undefined
        ? data.name.trim()
        : undefined;

    if (
      nombre !== undefined &&
      nombre.length < 2
    ) {
      throw new BadRequestException(
        'El nombre debe tener al menos 2 caracteres.',
      );
    }

    // -------------------------------------
    // ACTUALIZAR EN LA BASE DE DATOS
    // -------------------------------------

    const usuarioActualizado =
      await this.prisma.usuario.update({
        where: {
          id:
            usuarioId,
        },

        data: {
          ...(nombre !== undefined && {
            nombre,
          }),

          ...(data.phone !== undefined && {
            telefono:
              data.phone,
          }),
        },

        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          creadoEn: true,
          actualizadoEn: true,
        },
      });

    // -------------------------------------
    // RESPUESTA PARA LA APP
    // -------------------------------------

    return {
      message:
        'Perfil actualizado correctamente.',

      user: {
        id:
          usuarioActualizado.id,

        name:
          usuarioActualizado.nombre,

        rut:
          usuarioActualizado.rut,

        email:
          usuarioActualizado.correo,

        phone:
          usuarioActualizado.telefono,

        createdAt:
          usuarioActualizado.creadoEn,

        updatedAt:
          usuarioActualizado.actualizadoEn,
      },
    };
  }

  // =====================================
  // PERFIL PÚBLICO
  // =====================================

  async findPublicProfile(
    usuarioId: string,
  ) {
    const usuario =
      await this.prisma.usuario.findUnique({
        where: {
          id:
            usuarioId,
        },

        select: {
          id: true,
          nombre: true,
          creadoEn: true,
        },
      });

    if (!usuario) {
      throw new NotFoundException(
        'El usuario no existe.',
      );
    }

    const resenas =
      await this.prisma.resena.findMany({
        where: {
          oculta: false, receptorId:
            usuarioId,
        },

        orderBy: {
          creadoEn:
            'desc',
        },

        include: {
          autor: {
            select: {
              id: true,
              nombre: true,
            },
          },

          trabajo: {
            select: {
              id: true,
              titulo: true,
            },
          },
        },
      });

    const trabajosComoTrabajador =
      await this.prisma.conversacion.count({
        where: {
          trabajadorId:
            usuarioId,

          trabajo: {
            estado:
              'COMPLETADO',
          },
        },
      });

    const trabajosComoPropietario =
      await this.prisma.trabajo.count({
        where: {
          propietarioId:
            usuarioId,

          estado:
            'COMPLETADO',
        },
      });

    const totalTrabajos =
      trabajosComoTrabajador +
      trabajosComoPropietario;

    const totalResenas =
      resenas.length;

    const promedio =
      totalResenas > 0
        ? resenas.reduce(
            (
              suma,
              resena,
            ) =>
              suma +
              resena.puntuacion,
            0,
          ) / totalResenas
        : null;

    return {
      id:
        usuario.id,

      name:
        usuario.nombre,

      memberSince:
        usuario.creadoEn,

      rating:
        promedio !== null
          ? Number(
              promedio.toFixed(1),
            )
          : null,

      completedJobs:
        totalTrabajos,

      reviewsCount:
        totalResenas,

      reviews:
        resenas.map(
          (resena) => ({
            id:
              resena.id,

            rating:
              resena.puntuacion,

            comment:
              resena.comentario,

            createdAt:
              resena.creadoEn,

            author: {
              id:
                resena.autor.id,

              name:
                resena.autor.nombre,
            },

            job: {
              id:
                resena.trabajo.id,

              title:
                resena.trabajo.titulo,
            },
          }),
        ),
    };
  }

  // =====================================
  // CREAR USUARIO LOCAL
  // =====================================

  async create(data: {
    name: string;
    rut: string;
    email: string;
    phone: string;
    password: string;
  }) {
    const usuario =
      await this.prisma.usuario.create({
        data: {
          nombre:
            data.name,

          rut:
            data.rut,

          correo:
            data.email,

          telefono:
            data.phone,

          contrasena:
            data.password,

          proveedor:
            'LOCAL',
        },

        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          creadoEn: true,
        },
      });

    return {
      id:
        usuario.id,

      name:
        usuario.nombre,

      rut:
        usuario.rut,

      email:
        usuario.correo,

      phone:
        usuario.telefono,

      createdAt:
        usuario.creadoEn,
    };
  }

  // =====================================
  // CREAR USUARIO GOOGLE
  // =====================================

  async createGoogleUser(_data: {
    name: string;
    email: string;
    googleId: string;
  }): Promise<never> {
    throw new BadRequestException(
      'Para crear una cuenta nueva con Google debes completar tu RUT.',
    );
  }

  // =====================================
  // VINCULAR GOOGLE
  // =====================================

  async linkGoogleAccount(
    userId: string,
    googleId: string,
  ) {
    return this.prisma.usuario.update({
      where: {
        id:
          userId,
      },

      data: {
        googleId,
      },
    });
  }

  // =====================================
  // ACTUALIZAR PERFIL GOOGLE
  // =====================================

  async updateGoogleProfile(
    userId: string,
    data: {
      name: string;
      email: string;
    },
  ) {
    return this.prisma.usuario.update({
      where: {
        id:
          userId,
      },

      data: {
        nombre:
          data.name,

        correo:
          data.email,
      },
    });
  }
}
