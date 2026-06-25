import { verifyAuth, unauthorizedResponse } from './_shared/auth';

export const config = {
  runtime: 'edge',
};

const GATEWAY_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

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

  // Verify Supabase authentication
  const authUser = await verifyAuth(req);
  if (!authUser) return unauthorizedResponse();

  try {
    const apiKey = process.env.INTEGRATIONS_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('API key not configured in Vercel environment');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { contents } = body;

    if (!contents || !Array.isArray(contents)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
    }

    const systemInstruction = {
      role: 'user',
      parts: [{ text: `You are LearnLoom AI Mentor – an expert computer science and programming tutor.
Your role:
- Answer coding, DSA, web dev, data science, and interview-prep questions clearly
- Provide step-by-step explanations with working code examples
- Encourage learners and suggest next steps
- Keep answers concise and practical
- NEVER provide answers to exam/test questions directly; guide the student to think` }],
    };

    const fullContents = [systemInstruction, ...contents];

    const upstream = await fetch(`${GATEWAY_URL}&key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: fullContents }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Gemini API Error:', errText);
      return new Response(errText, { status: upstream.status });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('Vercel API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { status: 500 });
  }
}
