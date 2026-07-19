import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async signUp(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Create unique username fallback from email prefix
    const emailPrefix = dto.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const username = `${emailPrefix}${rand}`.toLowerCase();

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          passwordHash,
          role: Role.STUDENT,
        },
      });

      await tx.profile.create({
        data: {
          userId: newUser.id,
          fullName: dto.fullName.trim(),
          username,
        },
      });

      return newUser;
    });

    // ── Send welcome email via Resend ──
    try {
      await this.mailService.sendMail(
        user.email,
        'Welcome to Quovexi!',
        'Welcome to Quovexi!',
        `
        <p>Hi ${dto.fullName.trim()},</p>
        <p>We are absolutely thrilled to welcome you to <strong>Quovexi</strong>!</p>
        <p>Your account has been created successfully, and you now have access to our AI-driven learning tools, interactive programming courses, and community forums.</p>
        <p>Ready to start? Click the button below to jump into your student dashboard:</p>
        `,
        'Go to Dashboard',
        'https://quovexi.vercel.app/dashboard'
      );
    } catch (mailErr) {
      console.error('Welcome email dispatch failed:', mailErr);
    }

    return {
      success: true,
      userId: user.id,
      message: 'Account created successfully.',
    };
  }

  async signIn(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      username: user.profile?.username || '',
    };

    const token = await this.jwtService.signAsync(payload);

    // Audit Log Login Session
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
      },
    });

    return {
      accessToken: token,
      role: user.role,
      plan: user.plan,
      username: user.profile?.username || '',
      fullName: user.profile?.fullName || '',
    };
  }
}
