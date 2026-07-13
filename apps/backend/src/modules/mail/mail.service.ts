import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not configured. MailService will fall back to mock console logs.');
    }
  }

  // Beautiful HTML email matching the LearnLoom premium aesthetic
  private getBrandedEmailHtml(title: string, contentHtml: string, ctaText?: string, ctaUrl?: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f6f9fc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f6f9fc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .banner {
      background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .content {
      padding: 40px;
      color: #334155;
      line-height: 1.6;
      font-size: 15px;
    }
    h1 {
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 20px;
    }
    p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    .cta-container {
      margin: 30px 0;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(109, 40, 217, 0.15);
      transition: opacity 0.2s;
    }
    .cta-button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      color: #64748b;
      font-size: 12px;
      margin: 0 0 8px 0;
      font-weight: 500;
    }
    .footer-tagline {
      color: #94a3b8;
      font-size: 11px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="banner">
        <h2 class="logo-text">LearnLoom</h2>
      </div>
      <div class="content">
        <h1>${title}</h1>
        ${contentHtml}
        ${ctaText && ctaUrl ? `
        <div class="cta-container">
          <a href="${ctaUrl}" class="cta-button" target="_blank">${ctaText}</a>
        </div>
        ` : ''}
      </div>
      <div class="footer">
        <p class="footer-text">You are receiving this because you are registered on LearnLoom.</p>
        <p class="footer-tagline">LearnLoom — Engineer your potential with AI-driven learning.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  async sendMail(
    to: string | string[],
    subject: string,
    title: string,
    htmlContent: string,
    ctaText?: string,
    ctaUrl?: string,
    from = 'LearnLoom <onboarding@resend.dev>',
  ) {
    const formattedHtml = this.getBrandedEmailHtml(title, htmlContent, ctaText, ctaUrl);
    const recipientList = Array.isArray(to) ? to : [to];

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL] To: ${recipientList.join(', ')} | Subject: ${subject}`);
      return { mock: true, success: true };
    }

    try {
      const response = await this.resend.emails.send({
        from,
        to: recipientList,
        subject,
        html: formattedHtml,
      });

      if (response.error) {
        this.logger.error(`Resend sending failed: ${JSON.stringify(response.error)}`);
        throw response.error;
      }

      this.logger.log(`Email sent successfully via Resend to ${recipientList.join(', ')}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipientList.join(', ')}:`, error);
      throw error;
    }
  }
}
