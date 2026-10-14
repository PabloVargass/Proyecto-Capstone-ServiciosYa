import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(usuarioId: string) {
    const conversaciones = await this.prisma.conversacion.findMany({
      where: {
        OR: [
          {
            propietarioId: usuarioId,
          },
          {
            trabajadorId: usuarioId,
          },
        ],
      },

      orderBy: {
        actualizadoEn: 'desc',
      },

      include: {
        trabajo: {
          select: {
            id: true,
            titulo: true,
            comuna: true,
            presupuesto: true,
            estado: true,
          },
        },

        propietario: {
          select: {
            id: true,
            nombre: true,
          },
        },

        trabajador: {
          select: {
            id: true,
            nombre: true,
          },
        },

        mensajes: {
          orderBy: {
            creadoEn: 'desc',
          },
          take: 1,
        },
      },
    });

    const resultado = await Promise.all(
      conversaciones.map(async (conversacion) => {
        const otroUsuario =
          conversacion.propietarioId === usuarioId
            ? conversacion.trabajador
            : conversacion.propietario;

        const ultimoMensaje =
          conversacion.mensajes.length > 0 ? conversacion.mensajes[0] : null;

        const mensajesNoLeidos = await this.prisma.mensaje.count({
          where: {
            conversacionId: conversacion.id,
            leido: false,

            remitenteId: {
              not: usuarioId,
            },
          },
        });

        return {
          id: conversacion.id,

          trabajo: {
            id: conversacion.trabajo.id,
            title: conversacion.trabajo.titulo,
            commune: conversacion.trabajo.comuna,
            budget: conversacion.trabajo.presupuesto,
            status: conversacion.trabajo.estado,
          },

          usuario: {
            id: otroUsuario.id,
            name: otroUsuario.nombre,
          },

          ultimoMensaje: ultimoMensaje
            ? {
                id: ultimoMensaje.id,
                contenido: ultimoMensaje.contenido,
                createdAt: ultimoMensaje.creadoEn,
                remitenteId: ultimoMensaje.remitenteId,
              }
            : null,

          mensajesNoLeidos,

          updatedAt: conversacion.actualizadoEn,
        };
      }),
    );

    return resultado;
  }

  async obtenerMensajes(usuarioId: string, conversacionId: string) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: {
        id: conversacionId,
      },

      include: {
        trabajo: {
          select: {
            id: true,
            titulo: true,
            ofertaContratada: {
              select: {
                id: true,
                estado: true,
                importe: true,
                servicio: { select: { propietarioId: true } },
              },
            },
          },
        },

        propietario: {
          select: {
            id: true,
            nombre: true,
          },
        },

        trabajador: {
          select: {
            id: true,
            nombre: true,
          },
        },

        mensajes: {
          orderBy: {
            creadoEn: 'asc',
          },

          include: {
            remitente: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!conversacion) {
      throw new NotFoundException('La conversación no existe.');
    }

    const esParticipante =
      conversacion.propietarioId === usuarioId ||
      conversacion.trabajadorId === usuarioId;

    if (!esParticipante) {
      throw new ForbiddenException(
        'No tienes permiso para ver esta conversación.',
      );
    }

    await this.prisma.mensaje.updateMany({
      where: {
        conversacionId,
        leido: false,

        remitenteId: {
          not: usuarioId,
        },
      },

      data: {
        leido: true,
      },
    });

    return {
      id: conversacion.id,
      serviceOffer: conversacion.trabajo.ofertaContratada
        ? {
            id: conversacion.trabajo.ofertaContratada.id,
            status: conversacion.trabajo.ofertaContratada.estado,
            amount: conversacion.trabajo.ofertaContratada.importe,
            providerId:
              conversacion.trabajo.ofertaContratada.servicio.propietarioId,
          }
        : null,

      trabajo: {
        id: conversacion.trabajo.id,
        title: conversacion.trabajo.titulo,
      },

      propietario: {
        id: conversacion.propietario.id,
        name: conversacion.propietario.nombre,
      },

      trabajador: {
        id: conversacion.trabajador.id,
        name: conversacion.trabajador.nombre,
      },

      mensajes: conversacion.mensajes.map((mensaje) => ({
        id: mensaje.id,
        contenido: mensaje.contenido,

        leido: mensaje.remitente.id === usuarioId ? mensaje.leido : true,

        createdAt: mensaje.creadoEn,

        remitente: {
          id: mensaje.remitente.id,
          name: mensaje.remitente.nombre,
        },
      })),
    };
  }

  async enviarMensaje(
    usuarioId: string,
    conversacionId: string,
    contenido: string,
  ) {
    const conversacion = await this.prisma.conversacion.findUnique({
      where: {
        id: conversacionId,
      },
    });

    if (!conversacion) {
      throw new NotFoundException('La conversación no existe.');
    }

    const esParticipante =
      conversacion.propietarioId === usuarioId ||
      conversacion.trabajadorId === usuarioId;

    if (!esParticipante) {
      throw new ForbiddenException(
        'No tienes permiso para enviar mensajes en esta conversación.',
      );
    }

    const texto = contenido.trim();

    if (!texto) {
      throw new ForbiddenException('El mensaje no puede estar vacío.');
    }

    const mensaje = await this.prisma.mensaje.create({
      data: {
        contenido: texto,
        conversacionId,
        remitenteId: usuarioId,
      },

      include: {
        remitente: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    await this.prisma.conversacion.update({
      where: {
        id: conversacionId,
      },

      data: {
        actualizadoEn: new Date(),
      },
    });

    return {
      id: mensaje.id,
      contenido: mensaje.contenido,
      leido: mensaje.leido,
      createdAt: mensaje.creadoEn,

      remitente: {
        id: mensaje.remitente.id,
        name: mensaje.remitente.nombre,
      },
    };
  }
}
