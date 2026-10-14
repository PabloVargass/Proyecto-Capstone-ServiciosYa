import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceOfferDto } from './dto/service-offer.dto';

@Injectable()
export class ServiceOffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, serviceId: string, dto: ServiceOfferDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const service = await tx.trabajo.findUnique({
          where: { id: serviceId },
          include: { propietario: { select: { activo: true } } },
        });
        if (!service) throw new NotFoundException('El servicio no existe.');
        if (service.propietarioId === userId)
          throw new BadRequestException(
            'No puedes contratar tu propio servicio.',
          );
        if (
          service.tipo !== 'SERVICIO' ||
          service.servicioOrigenId ||
          service.oculto ||
          service.estado !== 'PUBLICADO' ||
          service.venceEn <= new Date() ||
          !service.propietario.activo
        ) {
          throw new BadRequestException('El servicio ya no está disponible.');
        }
        const existing = await tx.ofertaServicio.findUnique({
          where: {
            servicioId_solicitanteId: {
              servicioId: serviceId,
              solicitanteId: userId,
            },
          },
          include: { trabajo: { include: { conversacion: true } } },
        });
        if (existing)
          throw new ConflictException(
            'Ya tienes una solicitud para este servicio. Revisa tus conversaciones.',
          );
        const amount = dto.acceptPublishedPrice
          ? service.presupuesto
          : dto.amount;
        if (!Number.isInteger(amount) || !amount || amount <= 0)
          throw new BadRequestException(
            'Ingresa un importe válido para la oferta.',
          );
        const accepted = dto.acceptPublishedPrice;
        const contract = await tx.trabajo.create({
          data: {
            titulo: service.titulo,
            descripcion: service.descripcion,
            categoria: service.categoria,
            categoriaId: service.categoriaId,
            comuna: service.comuna,
            presupuesto: amount,
            propietarioId: userId,
            servicioOrigenId: service.id,
            venceEn: service.venceEn,
            estado: accepted ? 'ASIGNADO' : 'PUBLICADO',
          },
        });
        const application = await tx.postulacion.create({
          data: {
            usuarioId: service.propietarioId,
            trabajoId: contract.id,
            estado: accepted ? 'ACEPTADA' : 'PENDIENTE',
          },
        });
        const chat = await tx.conversacion.create({
          data: {
            trabajoId: contract.id,
            postulacionId: application.id,
            propietarioId: userId,
            trabajadorId: service.propietarioId,
          },
        });
        const offer = await tx.ofertaServicio.create({
          data: {
            servicioId: service.id,
            solicitanteId: userId,
            importe: amount,
            estado: accepted ? 'ACEPTADA' : 'PENDIENTE',
            trabajoId: contract.id,
          },
        });
        return {
          offerId: offer.id,
          status: offer.estado,
          conversationId: chat.id,
          jobId: contract.id,
        };
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'Ya existe una solicitud para este servicio.',
        );
      throw error;
    }
  }

  async respond(userId: string, offerId: string, accepted: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.ofertaServicio.findUnique({
        where: { id: offerId },
        include: {
          servicio: true,
          trabajo: { include: { conversacion: true } },
        },
      });
      if (!offer) throw new NotFoundException('La oferta no existe.');
      if (offer.servicio.propietarioId !== userId)
        throw new ForbiddenException(
          'Solo el prestador puede responder esta oferta.',
        );
      if (
        accepted &&
        (offer.servicio.oculto || offer.servicio.venceEn <= new Date())
      )
        throw new BadRequestException(
          'La publicación del servicio ya no está disponible.',
        );
      const status = accepted ? 'ACEPTADA' : 'RECHAZADA';
      const changed = await tx.ofertaServicio.updateMany({
        where: { id: offer.id, estado: 'PENDIENTE' },
        data: { estado: status },
      });
      if (changed.count !== 1)
        throw new ConflictException('La oferta ya fue respondida.');
      await tx.trabajo.update({
        where: { id: offer.trabajoId },
        data: { estado: accepted ? 'ASIGNADO' : 'CANCELADO' },
      });
      await tx.postulacion.update({
        where: { id: offer.trabajo.conversacion!.postulacionId },
        data: { estado: status },
      });
      return { status, conversationId: offer.trabajo.conversacion!.id };
    });
  }
}
