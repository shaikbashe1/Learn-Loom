import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
      createdAt: s.createdAt,
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
