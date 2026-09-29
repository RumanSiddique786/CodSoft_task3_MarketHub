import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UploadService } from './upload.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR')
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('presign')
  getPresignedUrl(@Body() body: { fileName: string; fileType: string }) {
    return this.uploadService.getPresignedUploadUrl(body.fileName, body.fileType);
  }
}
