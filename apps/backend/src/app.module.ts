import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';

@Module({
  imports: [PrismaModule, AuthModule, CoursesModule, QuizzesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
