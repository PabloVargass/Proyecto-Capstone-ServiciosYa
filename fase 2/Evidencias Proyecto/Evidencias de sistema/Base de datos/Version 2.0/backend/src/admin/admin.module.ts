import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminGuard } from './admin.guard';
import { IdentityModule } from '../identity/identity.module';
@Module({
  imports: [AuthModule, IdentityModule],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminGuard, JwtAuthGuard],
})
export class AdminModule {}
