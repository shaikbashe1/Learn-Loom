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
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

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

    const prompt = `You are an expert EdTech curriculum designer.

Generate a comprehensive, actionable learning roadmap for:
- Domain: ${domain}
- Target Role/Goals: ${role}
- Current Skill Level: ${difficulty || 'beginner'}

Return a JSON object with this EXACT structure (no markdown, raw JSON only):
{
  "title": "string — roadmap title",
  "description": "string — 2-sentence overview",
  "estimated_weeks": number,
  "phases": [
    {
      "phase": number,
      "title": "string",
      "duration_weeks": number,
      "topics": ["string"],
      "assignments": ["string"]
    }
  ]
}

Include 3–6 phases covering key concepts. Do not wrap the JSON in Markdown formatting (no \`\`\`json block). Just return the raw JSON text.`;

    const upstream = await fetch(`${GATEWAY_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
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

    return new Response(cleaned, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
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
