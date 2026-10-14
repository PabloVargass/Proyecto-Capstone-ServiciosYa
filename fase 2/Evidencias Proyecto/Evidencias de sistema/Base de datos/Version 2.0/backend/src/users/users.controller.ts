import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // =====================================
  // LISTA DE USUARIOS PARA DESCUBRIR
  // =====================================

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  // =====================================
  // OBTENER MI PERFIL
  // =====================================
  //
  // El usuario se obtiene directamente
  // desde el JWT.
  //
  // No necesitamos recibir el ID desde
  // la aplicación móvil.
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMyProfile(
    @Req() request: any,
  ) {
    const usuarioId =
      request.user.sub;

    const usuario =
      await this.usersService.findOne(
        usuarioId,
      );

    if (!usuario) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    return usuario;
  }

  // =====================================
  // EDITAR MI PERFIL
  // =====================================
  //
  // PATCH /users/me
  //
  // Solo puede modificar el usuario
  // identificado mediante el JWT.
  // =====================================

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyProfile(
    @Req() request: any,
    @Body()
    updateProfileDto: UpdateProfileDto,
  ) {
    const usuarioId =
      request.user.sub;

    return this.usersService.updateProfile(
      usuarioId,
      updateProfileDto,
    );
  }

  // =====================================
  // PERFIL PÚBLICO COMPLETO
  // =====================================

  @Get(':id/perfil')
  async findPublicProfile(
    @Req() request: any,
  ) {
    /*
     * Esta ruta mantiene la estructura
     * que ya utilizaba ServiciosYa.
     */

    const id =
      request.params.id;

    return this.usersService.findPublicProfile(
      id,
    );
  }

  // =====================================
  // INFORMACIÓN BÁSICA DE UN USUARIO
  // =====================================

  @Get(':id')
  async findOne(
    @Req() request: any,
  ) {
    const id =
      request.params.id;

    const usuario =
      await this.usersService.findPublicUser(id);

    if (!usuario) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    return usuario;
  }
}
