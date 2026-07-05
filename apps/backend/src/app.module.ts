import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { CodingModule } from './modules/coding/coding.module';
import { AIModule } from './modules/ai/ai.module';

@Module({
  imports: [PrismaModule, AuthModule, CoursesModule, QuizzesModule, CodingModule, AIModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
