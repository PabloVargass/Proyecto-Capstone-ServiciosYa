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
import { CrearResenaDto } from './dto/crear-resena.dto';
import { ResenasService } from './resenas.service';

@Controller('resenas')
export class ResenasController {
  constructor(
    private readonly resenasService: ResenasService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  crear(
    @Req() request: any,
    @Body() crearResenaDto: CrearResenaDto,
  ) {
    return this.resenasService.crear(
      request.user.sub,
      crearResenaDto,
    );
  }

  @Get('usuario/:id')
  obtenerDeUsuario(
    @Param('id') id: string,
  ) {
    return this.resenasService.obtenerDeUsuario(
      id,
    );
  }
}