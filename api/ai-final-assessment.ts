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
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const { courseTitle, courseDescription, modulesList = [], isTechnical = false } = await req.json();

    if (!courseTitle) {
      return new Response(JSON.stringify({ error: 'Course title is required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const prompt = `You are an expert AI curriculum designer creating a rigorous Final Assessment for the following course:
    
Course: ${courseTitle}
Description: ${courseDescription || 'Not provided'}
Modules Covered: ${modulesList.map((m: any) => m.title).join(', ')}

Create a comprehensive final assessment structured exactly like this:
- Section A: 20 Multiple Choice Questions (Basic to Intermediate)
- Section B: 10 Scenario-Based Questions (Advanced, testing application of knowledge)
- Section C: 5 Short Answer Questions (Open-ended, testing deep understanding)
${isTechnical ? `- Section D: 3 Coding Problems (Beginner, Intermediate, Advanced)` : ''}

Return a JSON object with this EXACT structure (no markdown, raw JSON only):
{
  "title": "Final Assessment: ${courseTitle}",
  "section_a": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer_index": number (0-3),
      "explanation": "string"
    }
  ],
  "section_b": [
    {
      "question": "string (scenario based)",
      "options": ["string", "string", "string", "string"],
      "answer_index": number (0-3),
      "explanation": "string"
    }
  ],
  "section_c": [
    {
      "question": "string (short answer)",
      "rubric": "string (what the grader/AI should look for to award full points)"
    }
  ]
  ${isTechnical ? `,
  "section_d": [
    {
      "title": "string",
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "problem_statement": "string",
      "constraints": ["string"],
      "starter_code": "string",
      "test_cases": [
        {
          "input": "string",
          "expected_output": "string",
          "is_hidden": boolean
        }
      ]
    }
  ]
  ` : ''}
}`;

    const upstream = await fetch(`${GATEWAY_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Gemini API Error:', errText);
      return new Response(errText, { status: upstream.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const result = await upstream.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const cleaned = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    return new Response(cleaned, { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err: any) {
    console.error('Vercel API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}
