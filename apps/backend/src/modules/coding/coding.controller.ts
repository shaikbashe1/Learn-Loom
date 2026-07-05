import { Controller, Post, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { CodingService } from './coding.service';
import { RunCodeDto, SubmitCodeDto } from './dto/coding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('coding')
@UseGuards(JwtAuthGuard)
export class CodingController {
  constructor(private codingService: CodingService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runCode(@Body() dto: RunCodeDto) {
    return this.codingService.runCode(dto);
  }

  @Post('submit/:labId')
  @HttpCode(HttpStatus.OK)
  async submitCode(
    @Param('labId') labId: string,
    @Body() dto: SubmitCodeDto,
    @Request() req: any,
  ) {
    return this.codingService.submitCode(req.user.id, labId, dto);
  }
}
