import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIChatDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanGuard } from '../auth/guards/plan.guard';
import { Plans } from '../auth/decorators/plans.decorator';
import { Plan } from '@prisma/client';

@Controller('ai')
@UseGuards(JwtAuthGuard, PlanGuard)
export class AIController {
  constructor(private aiService: AIService) {}

  @Post('chat')
  @Plans(Plan.PRO, Plan.ENTERPRISE)
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: AIChatDto, @Request() req: any) {
    return this.aiService.chat(req.user.id, dto);
  }
}
