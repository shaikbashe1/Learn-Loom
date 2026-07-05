import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { GenerateCertificateDto } from './dto/certificates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCertificates(@Request() req: any) {
    return this.certificatesService.getCertificates(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateCertificate(@Body() dto: GenerateCertificateDto, @Request() req: any) {
    return this.certificatesService.generateCertificate(req.user.id, dto.courseId);
  }

  @Get('verify/:code')
  async verifyCertificate(@Param('code') code: string) {
    return this.certificatesService.verifyCertificate(code);
  }
}
