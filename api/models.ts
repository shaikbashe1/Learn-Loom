import { verifyAuth, unauthorizedResponse } from './_shared/auth';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Verify Supabase authentication
  const authUser = await verifyAuth(req);
  if (!authUser) return unauthorizedResponse();

  const apiKey = process.env.INTEGRATIONS_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
