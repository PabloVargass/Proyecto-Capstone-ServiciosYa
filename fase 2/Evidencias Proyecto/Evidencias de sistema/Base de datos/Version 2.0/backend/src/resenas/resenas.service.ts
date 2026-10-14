import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CrearResenaDto } from './dto/crear-resena.dto';

@Injectable()
export class ResenasService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async crear(
    autorId: string,
    crearResenaDto: CrearResenaDto,
  ) {
    const trabajo =
      await this.prisma.trabajo.findUnique({
        where: {
          id: crearResenaDto.trabajoId,
        },

        include: {
          conversacion: true,
        },
      });

    if (!trabajo) {
      throw new NotFoundException(
        'El trabajo no existe.',
      );
    }

    if (
      trabajo.estado !== 'COMPLETADO'
    ) {
      throw new BadRequestException(
        'Solo puedes calificar trabajos completados.',
      );
    }

    if (!trabajo.conversacion) {
      throw new BadRequestException(
        'Este trabajo no tiene participantes asignados.',
      );
    }

    const propietarioId =
      trabajo.propietarioId;

    const trabajadorId =
      trabajo.conversacion.trabajadorId;

    const esPropietario =
      autorId === propietarioId;

    const esTrabajador =
      autorId === trabajadorId;

    if (
      !esPropietario &&
      !esTrabajador
    ) {
      throw new ForbiddenException(
        'No participaste en este trabajo.',
      );
    }

    const receptorId =
      esPropietario
        ? trabajadorId
        : propietarioId;

    if (receptorId === autorId) {
      throw new BadRequestException(
        'No puedes calificarte a ti mismo.',
      );
    }

    const resenaExistente =
      await this.prisma.resena.findUnique({
        where: {
          trabajoId_autorId_receptorId: {
            trabajoId: trabajo.id,
            autorId,
            receptorId,
          },
        },
      });

    if (resenaExistente) {
      throw new ConflictException(
        'Ya calificaste a este usuario por este trabajo.',
      );
    }

    const comentario =
      crearResenaDto.comentario
        ?.trim() || null;

    const resena =
      await this.prisma.resena.create({
        data: {
          puntuacion:
            crearResenaDto.puntuacion,

          comentario,

          trabajoId:
            trabajo.id,

          autorId,

          receptorId,
        },

        include: {
          autor: {
            select: {
              id: true,
              nombre: true,
            },
          },

          receptor: {
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

    return {
      message:
        'Reseña registrada correctamente.',

      resena: {
        id:
          resena.id,

        puntuacion:
          resena.puntuacion,

        comentario:
          resena.comentario,

        createdAt:
          resena.creadoEn,

        autor: {
          id:
            resena.autor.id,

          name:
            resena.autor.nombre,
        },

        receptor: {
          id:
            resena.receptor.id,

          name:
            resena.receptor.nombre,
        },

        trabajo: {
          id:
            resena.trabajo.id,

          title:
            resena.trabajo.titulo,
        },
      },
    };
  }

  async obtenerDeUsuario(
    usuarioId: string,
  ) {
    const usuario =
      await this.prisma.usuario.findUnique({
        where: {
          id: usuarioId,
        },

        select: {
          id: true,
          nombre: true,
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
          creadoEn: 'desc',
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

    /*
     * Trabajos completados como trabajador.
     */
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

    /*
     * Trabajos completados como cliente.
     */
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
      usuario: {
        id:
          usuario.id,

        name:
          usuario.nombre,
      },

      promedio:
        promedio !== null
          ? Number(
              promedio.toFixed(1),
            )
          : null,

      totalTrabajos,

      totalResenas,

      resenas:
        resenas.map(
          (resena) => ({
            id:
              resena.id,

            puntuacion:
              resena.puntuacion,

            comentario:
              resena.comentario,

            createdAt:
              resena.creadoEn,

            autor: {
              id:
                resena.autor.id,

              name:
                resena.autor.nombre,
            },

            trabajo: {
              id:
                resena.trabajo.id,

              title:
                resena.trabajo.titulo,
            },
          }),
        ),
    };
  }
}
