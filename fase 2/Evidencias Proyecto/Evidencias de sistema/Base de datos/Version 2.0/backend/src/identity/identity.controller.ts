import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SessionRequest } from '../admin/admin.guard';
import { IdentityService, type IdentityFile } from './identity.service';
import { SubmitIdentityDto } from './identity.dto';

@Controller('identity')
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private readonly identities: IdentityService) {}
  @Get('me') mine(@Req() req: SessionRequest) {
    return this.identities.mine(req.user.sub);
  }
  @Post('me')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'foto', maxCount: 1 },
        { name: 'certificado', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 2097152,
          files: 2,
          fields: 2,
          fieldSize: 200,
          parts: 5,
        },
      },
    ),
  )
  submit(
    @Req() req: SessionRequest,
    @Body() dto: SubmitIdentityDto,
    @UploadedFiles()
    files: { foto?: IdentityFile[]; certificado?: IdentityFile[] },
  ) {
    return this.identities.submit(
      req.user.sub,
      dto,
      files?.foto?.[0],
      files?.certificado?.[0],
    );
  }
  @Get('me/:id/documents/:kind')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async document(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Param('kind') kind: string,
  ) {
    const doc = await this.identities.document(id, kind, req.user.sub);
    return new StreamableFile(doc.bytes, { type: doc.type });
  }
}
