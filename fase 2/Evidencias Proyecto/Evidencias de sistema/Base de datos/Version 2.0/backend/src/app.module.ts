import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { IdentityModule } from './identity/identity.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { PostulacionesModule } from './postulaciones/postulaciones.module';
import { ConversacionesModule } from './conversaciones/conversaciones.module';
import { ResenasModule } from './resenas/resenas.module';

@Module({
  imports: [
    AdminModule,
    IdentityModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    JobsModule,
    PostulacionesModule,
    ConversacionesModule,
    ResenasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
