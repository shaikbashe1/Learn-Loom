import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { CodingModule } from './modules/coding/coding.module';
import { AIModule } from './modules/ai/ai.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { AdminModule } from './modules/admin/admin.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CoursesModule,
    QuizzesModule,
    CodingModule,
    AIModule,
    CertificatesModule,
    GamificationModule,
    AdminModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
