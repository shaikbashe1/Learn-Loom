import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RunCodeDto, SubmitCodeDto } from './dto/coding.dto';
import axios from 'axios';

@Injectable()
export class CodingService {
  constructor(private prisma: PrismaService) {}

  private mapLanguage(lang: string) {
    const maps: Record<string, { language: string; version: string }> = {
      python: { language: 'python', version: '3.10.0' },
      javascript: { language: 'javascript', version: '18.15.0' },
      java: { language: 'java', version: '15.0.2' },
      cpp: { language: 'c++', version: '10.2.0' },
    };
    return maps[lang.toLowerCase()] || { language: 'python', version: '3.10.0' };
  }

  async runCode(dto: RunCodeDto) {
    const { language, version } = this.mapLanguage(dto.language);

    try {
      const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
        language,
        version,
        files: [
          {
            name: 'main',
            content: dto.code,
          },
        ],
        stdin: dto.stdin || '',
      });

      const run = response.data.run;
      return {
        stdout: run.stdout || '',
        stderr: run.stderr || '',
        exitCode: run.code,
      };
    } catch (err: any) {
      throw new BadRequestException('Compiler engine error: ' + (err.message || 'Piston failed.'));
    }
  }

  async submitCode(userId: string, labId: string, dto: SubmitCodeDto) {
    const lab = await this.prisma.lab.findUnique({
      where: { id: labId },
    });

    if (!lab) {
      throw new NotFoundException('Lab challenge not found.');
    }

    const { language, version } = this.mapLanguage(dto.language);
    
    // Expected outputs/inputs setup (Mock arrays if template matches)
    const testCases = [
      { input: '5', output: '25' },
      { input: '10', output: '100' },
    ];

    let passedCount = 0;
    const testVerdicts: any[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
          language,
          version,
          files: [
            {
              name: 'main',
              content: dto.code,
            },
          ],
          stdin: tc.input,
        });

        const stdoutTrimmed = (response.data.run.stdout || '').trim();
        const expectedTrimmed = tc.output.trim();

        const success = stdoutTrimmed === expectedTrimmed;
        if (success) passedCount++;

        testVerdicts.push({
          testCaseIndex: i + 1,
          input: tc.input,
          expected: tc.output,
          actual: stdoutTrimmed,
          passed: success,
          stderr: response.data.run.stderr || '',
        });
      } catch (err: any) {
        testVerdicts.push({
          testCaseIndex: i + 1,
          input: tc.input,
          expected: tc.output,
          actual: '',
          passed: false,
          stderr: err.message || 'Execution error.',
        });
      }
    }

    const status = passedCount === testCases.length ? 'PASSED' : 'FAILED';

    // Log attempt record in DB
    await this.prisma.labAttempt.create({
      data: {
        labId,
        userId,
        code: dto.code,
        status: status as any,
        score: Math.round((passedCount / testCases.length) * 100),
      },
    });

    if (status === 'PASSED') {
      // Award profile credits/XP
      await this.prisma.profile.update({
        where: { userId },
        data: {
          credits: { increment: 30 },
        },
      });
    }

    return {
      status,
      passedCount,
      totalCount: testCases.length,
      verdicts: testVerdicts,
      awardedXP: status === 'PASSED' ? 30 : 0,
    };
  }
}
