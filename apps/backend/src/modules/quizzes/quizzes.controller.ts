import { Controller, Post, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { SubmitQuizDto } from './dto/quizzes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Post(':quizId/start')
  @HttpCode(HttpStatus.OK)
  async startQuiz(@Param('quizId') quizId: string, @Request() req: any) {
    return this.quizzesService.startQuiz(req.user.id, quizId);
  }

  @Post(':quizId/submit')
  @HttpCode(HttpStatus.OK)
  async submitQuiz(
    @Param('quizId') quizId: string,
    @Body() dto: SubmitQuizDto,
    @Request() req: any,
  ) {
    return this.quizzesService.submitQuiz(req.user.id, quizId, dto);
  }
}
