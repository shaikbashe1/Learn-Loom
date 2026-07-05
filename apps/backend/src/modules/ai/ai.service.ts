import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIChatDto } from './dto/ai.dto';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AIService {
  private ai: GoogleGenAI | null = null;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async chat(userId: string, dto: AIChatDto) {
    // 1. Prepare system instruction prompt context
    let systemInstruction = 'You are Loomie, an expert NetAcad AI mentor and tutor. ' +
      'Help students master networking, subnetting, systems architecture, coding challenges, and cloud systems. ' +
      'Always respond concisely. Use Markdown formatting. Structure examples clearly, and break down mathematical operations (like IP subnet binary operations) step-by-step.';

    if (dto.lessonContext) {
      systemInstruction += `\nActive Lesson Context: ${dto.lessonContext}`;
    }

    try {
      let replyText = '';

      if (this.ai) {
        // Direct call to Gemini v2.5 Flash SDK API
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: dto.message,
          config: {
            systemInstruction,
          },
        });
        replyText = response.text || '';
      } else {
        // Fallback simulation if no API Key provided during build checks
        replyText = `### Loomie Simulation Mode\nTo interact with live Gemini models, set the \`GEMINI_API_KEY\` environment variable.\n\n**Mock Answer:** To divide a subnet prefix length, check host parameters. Standard IP subnetting uses binary octets.`;
      }

      // 2. Save conversation transaction to audit log
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: `AI_CHAT_MESSAGE: ${dto.message.substring(0, 50)}`,
        },
      });

      return {
        reply: replyText,
      };
    } catch (err: any) {
      throw new BadRequestException('AI model generation error: ' + (err.message || 'Gemini call failed.'));
    }
  }
}
