import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrearPostulacionDto } from './dto/crear-postulacion.dto';
import { PostulacionesService } from './postulaciones.service';

@Controller('postulaciones')
export class PostulacionesController {
  constructor(
    private readonly postulacionesService: PostulacionesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  crear(
    @Req() request: any,
    @Body() crearPostulacionDto: CrearPostulacionDto,
  ) {
    return this.postulacionesService.crear(
      request.user.sub,
      crearPostulacionDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('recibidas')
  recibidas(@Req() request: any) {
    return this.postulacionesService.recibidas(
      request.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/aceptar')
  aceptar(
    @Req() request: any,
    @Param('id') id: string,
  ) {
    return this.postulacionesService.aceptar(
      request.user.sub,
      id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/rechazar')
  rechazar(
    @Req() request: any,
    @Param('id') id: string,
  ) {
    return this.postulacionesService.rechazar(
      request.user.sub,
      id,
    );
  }
}