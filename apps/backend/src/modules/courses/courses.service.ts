import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseQueryDto } from './dto/courses.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async getCourses(query: CourseQueryDto) {
    const where: any = { isPublished: true };

    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        difficulty: true,
        rating: true,
        createdAt: true,
      },
    });
  }

  async getCourseDetails(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            chapters: {
              orderBy: { order: 'asc' },
              include: {
                lessons: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    order: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  async getLesson(userId: string, courseId: string, lessonId: string) {
    // 1. Verify enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You must enroll in this course to view its lessons.');
    }

    // 2. Fetch active lesson
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { chapter: { include: { module: true } } },
    });

    if (!lesson || lesson.chapter.module.courseId !== courseId) {
      throw new NotFoundException('Lesson not found in this course.');
    }

    // 3. Strict progression check: Verify preceding lessons in the module are completed
    const precedingLessons = await this.prisma.lesson.findMany({
      where: {
        chapter: {
          moduleId: lesson.chapter.moduleId,
        },
        order: { lt: lesson.order },
      },
    });

    if (precedingLessons.length > 0) {
      const completedCount = await this.prisma.progress.count({
        where: {
          userId,
          lessonId: { in: precedingLessons.map((l) => l.id) },
        },
      });

      if (completedCount < precedingLessons.length) {
        throw new ForbiddenException('Preceding lessons in this module are locked. Complete them first.');
      }
    }

    return lesson;
  }

  async completeLesson(userId: string, courseId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { chapter: { include: { module: true } } },
    });

    if (!lesson || lesson.chapter.module.courseId !== courseId) {
      throw new NotFoundException('Lesson not found.');
    }

    // 1. Mark lesson as complete
    await this.prisma.progress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {},
      create: {
        userId,
        lessonId,
      },
    });

    // 2. Award XP and credits
    await this.prisma.profile.update({
      where: { userId },
      data: {
        credits: { increment: 10 },
      },
    });

    // 3. Determine next sequential lesson
    const nextLesson = await this.prisma.lesson.findFirst({
      where: {
        chapter: {
          moduleId: lesson.chapter.moduleId,
        },
        order: { gt: lesson.order },
      },
      orderBy: { order: 'asc' },
    });

    return {
      success: true,
      awardedXP: 10,
      nextLessonId: nextLesson?.id || null,
    };
  }

  async enrollInCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const enrollment = await this.prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId, courseId },
      },
      update: {},
      create: {
        userId,
        courseId,
      },
    });

    return {
      success: true,
      enrollmentId: enrollment.id,
    };
  }
}
