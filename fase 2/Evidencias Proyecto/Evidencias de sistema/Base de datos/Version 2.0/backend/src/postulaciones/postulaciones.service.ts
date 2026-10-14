import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CrearPostulacionDto } from './dto/crear-postulacion.dto';

@Injectable()
export class PostulacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(usuarioId: string, crearPostulacionDto: CrearPostulacionDto) {
    const trabajo = await this.prisma.trabajo.findUnique({
      where: {
        id: crearPostulacionDto.trabajoId,
      },
    });

    if (!trabajo) {
      throw new NotFoundException('El trabajo no existe.');
    }

    if (trabajo.propietarioId === usuarioId) {
      throw new BadRequestException('No puedes postular a tu propio trabajo.');
    }

    if (trabajo.tipo === 'SERVICIO' || trabajo.servicioOrigenId) {
      throw new BadRequestException(
        'Esta publicación no admite postulaciones.',
      );
    }
    if (
      trabajo.oculto ||
      trabajo.estado !== 'PUBLICADO' ||
      trabajo.venceEn <= new Date()
    ) {
      throw new BadRequestException('Este trabajo ya no está disponible.');
    }

    const postulacionExistente = await this.prisma.postulacion.findUnique({
      where: {
        usuarioId_trabajoId: {
          usuarioId,
          trabajoId: trabajo.id,
        },
      },
    });

    if (postulacionExistente) {
      throw new ConflictException('Ya te postulaste a este trabajo.');
    }

    const postulacion = await this.prisma.postulacion.create({
      data: {
        usuarioId,
        trabajoId: trabajo.id,
      },

      include: {
        usuario: {
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
      message: 'Postulación enviada correctamente.',
      postulacion,
    };
  }

  async recibidas(propietarioId: string) {
    const postulaciones = await this.prisma.postulacion.findMany({
      where: {
        trabajo: {
          propietarioId,
          servicioOrigenId: null,
        },
      },

      orderBy: {
        creadoEn: 'desc',
      },

      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            correo: true,
            creadoEn: true,
          },
        },

        trabajo: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            categoria: true,
            comuna: true,
            presupuesto: true,
            estado: true,
          },
        },
      },
    });

    return postulaciones.map((postulacion) => ({
      id: postulacion.id,
      estado: postulacion.estado,
      createdAt: postulacion.creadoEn,

      usuario: {
        id: postulacion.usuario.id,
        name: postulacion.usuario.nombre,
        email: postulacion.usuario.correo,
        createdAt: postulacion.usuario.creadoEn,
      },

      trabajo: {
        id: postulacion.trabajo.id,
        title: postulacion.trabajo.titulo,
        description: postulacion.trabajo.descripcion,
        category: postulacion.trabajo.categoria,
        commune: postulacion.trabajo.comuna,
        budget: postulacion.trabajo.presupuesto,
        status: postulacion.trabajo.estado,
      },
    }));
  }

  async aceptar(propietarioId: string, postulacionId: string) {
    const postulacion = await this.prisma.postulacion.findUnique({
      where: {
        id: postulacionId,
      },

      include: {
        trabajo: true,

        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },

        conversacion: true,
      },
    });

    if (!postulacion) {
      throw new NotFoundException('La postulación no existe.');
    }

    if (postulacion.trabajo.propietarioId !== propietarioId) {
      throw new ForbiddenException(
        'No tienes permiso para aceptar esta postulación.',
      );
    }

    if (postulacion.estado !== 'PENDIENTE') {
      throw new BadRequestException('Esta postulación ya fue procesada.');
    }

    if (
      postulacion.trabajo.oculto ||
      postulacion.trabajo.estado !== 'PUBLICADO' ||
      postulacion.trabajo.servicioOrigenId ||
      postulacion.trabajo.venceEn <= new Date()
    ) {
      throw new BadRequestException('Este trabajo ya no está disponible.');
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const postulacionAceptada = await tx.postulacion.update({
        where: {
          id: postulacionId,
        },

        data: {
          estado: 'ACEPTADA',
        },
      });

      await tx.postulacion.updateMany({
        where: {
          trabajoId: postulacion.trabajoId,

          id: {
            not: postulacionId,
          },

          estado: 'PENDIENTE',
        },

        data: {
          estado: 'RECHAZADA',
        },
      });

      const trabajoActualizado = await tx.trabajo.update({
        where: {
          id: postulacion.trabajoId,
        },

        data: {
          estado: 'ASIGNADO',
        },
      });

      const conversacion = await tx.conversacion.create({
        data: {
          trabajoId: postulacion.trabajoId,
          postulacionId: postulacion.id,

          propietarioId: postulacion.trabajo.propietarioId,

          trabajadorId: postulacion.usuarioId,
        },
      });

      return {
        postulacionAceptada,
        trabajoActualizado,
        conversacion,
      };
    });

    return {
      message: 'Match realizado correctamente.',

      match: {
        postulacionId: resultado.postulacionAceptada.id,

        conversacionId: resultado.conversacion.id,

        usuario: {
          id: postulacion.usuario.id,
          name: postulacion.usuario.nombre,
        },

        trabajo: {
          id: resultado.trabajoActualizado.id,
          title: resultado.trabajoActualizado.titulo,
          status: resultado.trabajoActualizado.estado,
        },
      },
    };
  }

  async rechazar(propietarioId: string, postulacionId: string) {
    const postulacion = await this.prisma.postulacion.findUnique({
      where: {
        id: postulacionId,
      },

      include: {
        trabajo: true,
      },
    });

    if (!postulacion) {
      throw new NotFoundException('La postulación no existe.');
    }

    if (postulacion.trabajo.propietarioId !== propietarioId) {
      throw new ForbiddenException(
        'No tienes permiso para rechazar esta postulación.',
      );
    }

    if (postulacion.trabajo.servicioOrigenId) {
      throw new BadRequestException(
        'Responde la oferta desde el chat del servicio.',
      );
    }

    if (postulacion.estado !== 'PENDIENTE') {
      throw new BadRequestException('Esta postulación ya fue procesada.');
    }

    const postulacionRechazada = await this.prisma.postulacion.update({
      where: {
        id: postulacionId,
      },

      data: {
        estado: 'RECHAZADA',
      },
    });

    return {
      message: 'Postulación rechazada.',
      postulacion: postulacionRechazada,
    };
  }
}
