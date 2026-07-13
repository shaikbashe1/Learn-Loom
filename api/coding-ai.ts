import { verifyAuth, unauthorizedResponse } from './_shared/auth';
import { checkRateLimit, rateLimitResponse, rateLimitHeaders } from './_shared/rate-limit';

export const config = {
  runtime: 'edge',
};

const GATEWAY_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Verify Supabase authentication
  const authUser = await verifyAuth(req);
  if (!authUser) return unauthorizedResponse();

  // Enforce tier-based rate limiting
  const rateLimit = await checkRateLimit(authUser.id, 'coding-ai');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const apiKey = process.env.INTEGRATIONS_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('API key not configured in Vercel environment');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const body = await req.json();
    const { action, code, language, problemTitle, problemDescription, error: userError } = body;

    let prompt = '';

    switch (action) {
      case 'explain':
        prompt = `Explain the following coding problem clearly and simply without providing the code solution.\n\nProblem Title: ${problemTitle}\n\nDescription: ${problemDescription}`;
        break;
      case 'hint':
        prompt = `The user is trying to solve "${problemTitle}". Provide a small, conceptual hint to help them progress. DO NOT provide any code. Here is their current code in ${language}:\n\n${code}`;
        break;
      case 'debug':
        prompt = `The user is trying to solve "${problemTitle}" in ${language}. Their code has an error or is failing. Provide a hint on what might be wrong, but DO NOT provide the exact corrected code.\n\nCurrent Code:\n${code}\n\nError/Context:\n${userError}`;
        break;
      case 'complexity':
        prompt = `Analyze the time and space complexity of the following ${language} code for the problem "${problemTitle}". Explain briefly.\n\nCode:\n${code}`;
        break;
      case 'optimize':
        prompt = `Provide suggestions on how to optimize the following ${language} code for the problem "${problemTitle}". Do not rewrite the code for them, just explain the conceptual optimization.\n\nCode:\n${code}`;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }

    const upstream = await fetch(`${GATEWAY_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Gemini API Error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to generate AI response' }), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const result = await upstream.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return new Response(JSON.stringify({ result: text }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...rateLimitHeaders(rateLimit),
      },
    });

  } catch (err: any) {
    console.error('Coding AI API error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate AI response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
