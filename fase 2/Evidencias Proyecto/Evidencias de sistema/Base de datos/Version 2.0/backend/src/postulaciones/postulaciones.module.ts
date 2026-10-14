import { Module } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostulacionesController } from './postulaciones.controller';
import { PostulacionesService } from './postulaciones.service';

@Module({
  controllers: [PostulacionesController],
  providers: [
    PostulacionesService,
    JwtAuthGuard,
  ],
})
export class PostulacionesModule {}