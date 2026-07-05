import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async getCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: { course: true },
    });
  }

  async generateCertificate(userId: string, courseId: string) {
    // 1. Verify enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course.');
    }

    // 2. Verify all course lessons are completed
    const courseLessons = await this.prisma.lesson.findMany({
      where: {
        chapter: {
          module: { courseId },
        },
      },
    });

    if (courseLessons.length === 0) {
      throw new BadRequestException('This course contains no lessons.');
    }

    const completedCount = await this.prisma.progress.count({
      where: {
        userId,
        lessonId: { in: courseLessons.map((l) => l.id) },
      },
    });

    if (completedCount < courseLessons.length) {
      throw new ForbiddenException('Course syllabus incomplete. Finish all lessons first.');
    }

    // Check if certificate already exists
    const existing = await this.prisma.certificate.findFirst({
      where: { userId, courseId },
    });

    if (existing) {
      return existing;
    }

    // 3. Generate verification code & secure SHA-256 signature
    const rand = Math.floor(100000 + Math.random() * 900000);
    const verificationCode = `LL-CERT-${rand}`;

    const rawSignature = `${userId}-${courseId}-${verificationCode}-salt123`;
    const hashSignature = createHash('sha256').update(rawSignature).digest('hex');

    // Create certificate
    const cert = await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        verificationCode,
        score: 100.0, // Default completion mark
      },
    });

    // Log action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `CERTIFICATE_GENERATED: ${verificationCode}`,
      },
    });

    return cert;
  }

  async verifyCertificate(code: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { verificationCode: code },
      include: {
        user: {
          include: { profile: true },
        },
        course: true,
      },
    });

    if (!cert || !cert.isValid) {
      throw new NotFoundException('Invalid or expired certificate verification code.');
    }

    return {
      isValid: true,
      verificationCode: cert.verificationCode,
      recipientName: cert.user.profile?.fullName || 'N/A',
      courseTitle: cert.course.title,
      issuedAt: cert.issuedAt,
    };
  }
}
