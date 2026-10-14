import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
@Module({
  imports: [AuthModule],
  controllers: [IdentityController],
  providers: [IdentityService, JwtAuthGuard],
  exports: [IdentityService],
})
export class IdentityModule {}
