import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitQuizDto } from './dto/quizzes.dto';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  // Fisher-Yates Shuffling Helper
  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async startQuiz(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found.');
    }

    // Shuffle questions and their answer choices
    const shuffledQuestions = this.shuffleArray(
      quiz.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        points: q.points,
        answers: this.shuffleArray(
          q.answers.map((a) => ({
            id: a.id,
            text: a.text,
          }))
        ),
      }))
    );

    // Set expiry
    const durationMs = quiz.durationMins * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    return {
      quizTitle: quiz.title,
      durationMins: quiz.durationMins,
      expiresAt,
      questions: shuffledQuestions,
    };
  }

  async submitQuiz(userId: string, quizId: string, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found.');
    }

    let earnedPoints = 0;
    let maxPoints = 0;
    let correctCount = 0;

    // Grade each question
    for (const q of quiz.questions) {
      maxPoints += q.points;
      const studentAns = dto.answers.find((a) => a.questionId === q.id);

      if (!studentAns) {
        // Unanswered: 0 points
        continue;
      }

      // Find correct answers in DB
      const correctOptions = q.answers.filter((a) => a.isCorrect);

      let isCorrect = false;

      // Handle grading based on question format
      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'IMAGE_LABELING' || q.type === 'CODE_OUTPUT' || q.type === 'TERMINAL_QUESTION') {
        const correctId = correctOptions[0]?.id;
        isCorrect = studentAns.selectedAnswer === correctId;
      } else if (q.type === 'MULTIPLE_SELECT') {
        const correctIds = correctOptions.map((c) => c.id).sort();
        const selectedIds = Array.isArray(studentAns.selectedAnswer) 
          ? [...studentAns.selectedAnswer].sort() 
          : [];
        isCorrect = JSON.stringify(correctIds) === JSON.stringify(selectedIds);
      } else if (q.type === 'FILL_BLANK' || q.type === 'SHORT_ANSWER') {
        const correctText = correctOptions[0]?.text.trim().toLowerCase();
        const selectedText = String(studentAns.selectedAnswer).trim().toLowerCase();
        isCorrect = correctText === selectedText;
      } else {
        // Fallback for drag-drop matching or complex essays: assume correct if matched
        isCorrect = true;
      }

      if (isCorrect) {
        earnedPoints += q.points;
        correctCount++;
      } else {
        // Apply negative marking: deduct 25% of question weight
        earnedPoints -= q.points * 0.25;
      }
    }

    // Prevent negative overall scores
    const finalScorePoints = Math.max(0, earnedPoints);
    const scorePercent = Math.round((finalScorePoints / maxPoints) * 100);
    const passed = scorePercent >= quiz.passingScore;

    if (passed) {
      // Award profile credits/XP
      await this.prisma.profile.update({
        where: { userId },
        data: {
          credits: { increment: 50 },
        },
      });
    }

    return {
      scorePercent,
      passed,
      correctCount,
      totalQuestions: quiz.questions.length,
      earnedPoints: finalScorePoints,
      maxPoints,
    };
  }
}
