import { Controller, Get, Post, Param, UseGuards, Request, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, Plan } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getOverviewStats();
  }

  @Get('students')
  async getStudents() {
    return this.adminService.getStudentsList();
  }

  @Get('sessions')
  async getSessions() {
    return this.adminService.getActiveSessions();
  }

  @Post('students/:id/plan')
  @HttpCode(HttpStatus.OK)
  async updatePlan(@Param('id') studentId: string, @Body('plan') plan: Plan) {
    return this.adminService.updateStudentPlan(studentId, plan);
  }

  @Post('students/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async toggleSuspend(@Param('id') studentId: string) {
    return this.adminService.toggleStudentSuspension(studentId);
  }

  @Post('courses/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveCourse(@Param('id') courseId: string) {
    return this.adminService.approveDraftCourse(courseId);
  }
}
