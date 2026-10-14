import { Module } from '@nestjs/common';

import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { ServiceOffersService } from './service-offers.service';

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    ServiceOffersService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class JobsModule {}
