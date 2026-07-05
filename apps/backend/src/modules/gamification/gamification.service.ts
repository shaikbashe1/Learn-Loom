import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard() {
    const topProfiles = await this.prisma.profile.findMany({
      orderBy: { credits: 'desc' },
      take: 20,
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return topProfiles.map((p, idx) => ({
      rank: idx + 1,
      fullName: p.fullName,
      username: p.username,
      avatarUrl: p.avatarUrl,
      credits: p.credits,
      streakDays: p.streakDays,
    }));
  }

  async getProfileStats(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile stats not found.');
    }

    // Process/verify streak integrity
    const updatedProfile = await this.updateStreakAndActivity(userId);

    return {
      fullName: updatedProfile.fullName,
      username: updatedProfile.username,
      credits: updatedProfile.credits,
      streakDays: updatedProfile.streakDays,
      lastActivityDate: updatedProfile.lastActivityDate,
    };
  }

  private async updateStreakAndActivity(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found.');
    }

    const now = new Date();
    const lastDate = profile.lastActivityDate;

    let newStreak = profile.streakDays;

    if (!lastDate) {
      newStreak = 1;
    } else {
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Increment streak
        newStreak += 1;
      } else if (diffDays > 1) {
        // Reset streak
        newStreak = 1;
      }
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        streakDays: newStreak,
        lastActivityDate: now,
      },
    });
  }
}
