import { Controller, Get, Post, Query, Param, UseGuards, Request, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CourseQueryDto } from './dto/courses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  async getCourses(@Query() query: CourseQueryDto) {
    return this.coursesService.getCourses(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':courseId/enroll')
  @HttpCode(HttpStatus.OK)
  async enroll(@Param('courseId') courseId: string, @Request() req: any) {
    return this.coursesService.enrollInCourse(req.user.id, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':courseId')
  async getCourseDetails(@Param('courseId') courseId: string) {
    return this.coursesService.getCourseDetails(courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':courseId/lessons/:lessonId')
  async getLesson(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Request() req: any,
  ) {
    return this.coursesService.getLesson(req.user.id, courseId, lessonId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':courseId/lessons/:lessonId/complete')
  @HttpCode(HttpStatus.OK)
  async completeLesson(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Request() req: any,
  ) {
    return this.coursesService.completeLesson(req.user.id, courseId, lessonId);
  }
}
