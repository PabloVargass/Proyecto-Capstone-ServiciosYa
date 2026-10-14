import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversacionesService } from './conversaciones.service';

@Controller('conversaciones')
export class ConversacionesController {
  constructor(
    private readonly conversacionesService: ConversacionesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  listar(@Req() request: any) {
    return this.conversacionesService.listar(
      request.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/mensajes')
  obtenerMensajes(
    @Req() request: any,
    @Param('id') id: string,
  ) {
    return this.conversacionesService.obtenerMensajes(
      request.user.sub,
      id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/mensajes')
  enviarMensaje(
    @Req() request: any,
    @Param('id') id: string,
    @Body('contenido') contenido: string,
  ) {
    return this.conversacionesService.enviarMensaje(
      request.user.sub,
      id,
      contenido,
    );
  }
}