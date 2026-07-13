import { verifyAuth, unauthorizedResponse } from './_shared/auth';
import { checkRateLimit, rateLimitResponse, rateLimitHeaders } from './_shared/rate-limit';
import { validateRoadmapOutput } from './_shared/validate-course';

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
  const rateLimit = await checkRateLimit(authUser.id, 'ai-roadmap');
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
    const { domain, role, difficulty } = body;

    if (!domain || !role) {
      return new Response(JSON.stringify({ error: 'Domain and role are required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const prompt = `You are an expert EdTech curriculum designer with 15+ years of experience creating structured learning paths.

Generate a comprehensive, actionable learning roadmap for:
- Domain: ${domain}
- Target Role/Goals: ${role}
- Current Skill Level: ${difficulty || 'beginner'}

Return a JSON object with this EXACT structure (no markdown, raw JSON only):
{
  "title": "string — concise roadmap title (max 80 chars)",
  "description": "string — exactly 2 sentences: what the learner will achieve and why this path is effective",
  "estimated_weeks": number (between 4 and 24),
  "phases": [
    {
      "phase": number (1-indexed),
      "title": "string — clear phase title",
      "duration_weeks": number (1-6),
      "topics": ["string — 3 to 8 specific, actionable topics"],
      "assignments": ["string — 2 to 4 hands-on project assignments"],
      "key_skills": ["string — 2 to 5 skills the learner will gain"],
      "estimated_hours": number (total study hours for this phase),
      "prerequisite_knowledge": ["string — what the learner should know before this phase"]
    }
  ]
}

Rules:
- Include exactly 4-6 phases, progressing from foundational to advanced
- Each phase MUST have at least 3 topics and 2 assignments
- Topics should be specific and actionable (e.g., "Implement binary search" not "Algorithms")
- Assignments should be project-based and portfolio-worthy
- Phase 1 prerequisite_knowledge should be minimal for the given skill level
- Total estimated_weeks should equal the sum of all phase duration_weeks
- Do NOT wrap the JSON in markdown fences`;

    const upstream = await fetch(`${GATEWAY_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Gemini API Error:', errText);
      return new Response(errText, { 
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const result = await upstream.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    
    // Clean up any accidental markdown fences
    const cleaned = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    // Validate and sanitize the AI output for consistency
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI roadmap output:', cleaned.slice(0, 200));
      parsedOutput = null;
    }

    const validated = validateRoadmapOutput(parsedOutput);
    if (validated.errors.length > 0) {
      console.warn('Roadmap validation warnings:', validated.errors);
    }

    return new Response(JSON.stringify(validated.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...rateLimitHeaders(rateLimit),
      },
    });

  } catch (err: any) {
    console.error('Vercel API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
