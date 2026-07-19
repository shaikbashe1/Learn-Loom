import { verifyAuth, unauthorizedResponse } from './_shared/auth';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

// Generates a beautiful HTML email matching the Quovexi premium aesthetic
export function getBrandedEmailHtml(title: string, contentHtml: string, ctaText?: string, ctaUrl?: string): string {
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
        <h2 class="logo-text">Quovexi</h2>
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
        <p class="footer-text">You are receiving this because you are registered on Quovexi.</p>
        <p class="footer-tagline">Quovexi — Engineer your potential with AI-driven learning.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // 1. Verify Authentication
  const authUser = await verifyAuth(req);
  if (!authUser) return unauthorizedResponse();

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const { to, subject, html, title, ctaText, ctaUrl } = await req.json();

    if (!to || !subject || (!html && !title)) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: to, subject, and either html or title' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase to get user profile and verify permissions
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Database service keys not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve sender profile' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = profile.role === 'admin';
    const recipientList = Array.isArray(to) ? to : [to];

    // Enforce Security Check: Non-admins can only send emails to themselves
    if (!isAdmin) {
      const selfEmail = authUser.email || profile.email;
      const isSendingToOthers = recipientList.some(email => email.trim().toLowerCase() !== selfEmail?.trim().toLowerCase());
      if (isSendingToOthers) {
        return new Response(JSON.stringify({ error: 'Permission denied. Non-admin users can only send emails to themselves.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Format the email using the premium Quovexi template
    const formattedHtml = getBrandedEmailHtml(
      title || subject,
      html || `<p>${subject}</p>`,
      ctaText,
      ctaUrl
    );

    // If Resend API key is missing, mock succeed and log the contents
    if (!resendApiKey) {
      console.log('--- MOCK EMAIL SENT ---');
      console.log('To:', recipientList.join(', '));
      console.log('Subject:', subject);
      console.log('--- END MOCK ---');

      return new Response(JSON.stringify({
        success: true,
        message: 'Mock email logged successfully (RESEND_API_KEY is not configured).',
        mock: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Quovexi <onboarding@resend.dev>',
        to: recipientList,
        subject: subject,
        html: formattedHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API Error Response:', resendData);
      return new Response(JSON.stringify({ error: 'Failed to send email via Resend', details: resendData }), {
        status: resendResponse.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully via Resend.',
      data: resendData,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err: any) {
    console.error('Email API route error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
