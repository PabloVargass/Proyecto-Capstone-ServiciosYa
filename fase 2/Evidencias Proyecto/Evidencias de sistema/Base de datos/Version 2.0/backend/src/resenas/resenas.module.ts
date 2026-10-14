import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ResenasController } from './resenas.controller';
import { ResenasService } from './resenas.service';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    ResenasController,
  ],

  providers: [
    ResenasService,
  ],
})
export class ResenasModule {}