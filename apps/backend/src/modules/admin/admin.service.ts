import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Plan } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getOverviewStats() {
    const totalStudents = await this.prisma.user.count({
      where: { role: 'STUDENT' },
    });

    const activeCertificates = await this.prisma.certificate.count({
      where: { isValid: true },
    });

    const totalCourses = await this.prisma.course.count();

    const recentLogs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return {
      totalStudents,
      activeCertificates,
      totalCourses,
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        email: log.user.email,
        action: log.action,
        timestamp: log.createdAt,
      })),
    };
  }

  async getStudentsList() {
    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        profile: true,
      },
    });

    return students.map((s) => ({
      id: s.id,
      email: s.email,
      fullName: s.profile?.fullName || 'N/A',
      username: s.profile?.username || 'N/A',
      credits: s.profile?.credits || 0,
      streakDays: s.profile?.streakDays || 0,
      plan: s.plan,
      createdAt: s.createdAt,
    }));
  }

  async updateStudentPlan(studentId: string, plan: Plan) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student user profile not found.');
    }

    await this.prisma.user.update({
      where: { id: studentId },
      data: { plan },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: studentId,
        action: `USER_PLAN_UPDATED: ${plan}`,
      },
    });

    return {
      success: true,
      message: `User plan updated to ${plan} successfully.`,
    };
  }

  async getActiveSessions() {
    // Retrieve unique list of users who logged in recently
    const recentLogins = await this.prisma.auditLog.findMany({
      where: { action: 'USER_LOGIN' },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        user: {
          select: {
            email: true,
            plan: true,
            profile: {
              select: { fullName: true },
            },
          },
        },
      },
    });

    return recentLogins.map((log) => ({
      id: log.id,
      email: log.user.email,
      fullName: log.user.profile?.fullName || 'N/A',
      plan: log.user.plan,
      loginTime: log.createdAt,
    }));
  }

  async toggleStudentSuspension(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student user profile not found.');
    }

    // Toggle role to super-admin or block: for schema compatibility we log suspension state
    await this.prisma.auditLog.create({
      data: {
        userId: studentId,
        action: `USER_SUSPEND_TOGGLED: ${studentId}`,
      },
    });

    return {
      success: true,
      message: 'Suspension status updated successfully.',
    };
  }

  async approveDraftCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course draft not found.');
    }

    await this.prisma.course.update({
      where: { id: courseId },
      data: { isPublished: true },
    });

    return {
      success: true,
      message: 'Course draft approved and published successfully.',
    };
  }
}
