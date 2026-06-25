import { verifyAuth, unauthorizedResponse } from './_shared/auth';
import { isUrlSafe } from './_shared/ssrf';

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

  // Verify Supabase authentication
  const authUser = await verifyAuth(req);
  if (!authUser) return unauthorizedResponse();

  try {
    const apiKey = process.env.INTEGRATIONS_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const { courseTitle, moduleTitle, moduleDescription, fileUrls = [], includeCoding = false } = await req.json();

    if (!courseTitle || !moduleTitle) {
      return new Response(JSON.stringify({ error: 'Course title and module title are required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const parts: any[] = [];
    
    const prompt = `You are an expert AI curriculum designer.
    
Course: ${courseTitle}
Module: ${moduleTitle}
Description: ${moduleDescription || 'Not provided'}

Using the provided information and any attached documents, generate the comprehensive content for this specific module.
You MUST provide high-quality educational content:
- Detailed Explanation
- Examples and Real-world Use Cases
- Key Concepts
- Summary and Key Takeaways

Also, generate TWO quizzes:
1. Quiz 1 (Basic Knowledge): 5 basic MCQs to test foundational understanding.
2. Quiz 2 (Scenario-Based): 5 scenario-based MCQs testing application of knowledge.

${includeCoding ? `Also generate ONE coding assessment (with problem statement, constraints, beginner/easy/medium difficulty, starter code, and 3 test cases).` : `Do not generate a coding assessment.`}

Return a JSON object with this EXACT structure (no markdown, raw JSON only):
{
  "content": {
    "learning_objectives": ["string"],
    "detailed_explanation": "string (formatted in HTML for rendering, e.g. <p>, <h3>, <ul>)",
    "examples": ["string (HTML formatted)"],
    "real_world_use_cases": ["string"],
    "key_concepts": ["string"],
    "summary": "string",
    "key_takeaways": ["string"]
  },
  "quiz1": {
    "title": "string",
    "questions": [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "answer_index": number (0-3),
        "explanation": "string"
      }
    ]
  },
  "quiz2": {
    "title": "string",
    "questions": [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "answer_index": number (0-3),
        "explanation": "string"
      }
    ]
  }
  ${includeCoding ? `,
  "coding_assessment": {
    "title": "string",
    "difficulty": "Beginner" | "Intermediate" | "Advanced",
    "problem_statement": "string",
    "constraints": ["string"],
    "starter_code": "string (e.g. def solution(x):\\n    pass)",
    "test_cases": [
      {
        "input": "string",
        "expected_output": "string",
        "is_hidden": boolean
      }
    ]
  }
  ` : ''}
}`;

    parts.push({ text: prompt });

    for (const url of fileUrls) {
      try {
        if (!isUrlSafe(url)) continue; // SSRF protection
        const fileRes = await fetch(url);
        if (fileRes.ok) {
          const buffer = await fileRes.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          let mimeType = fileRes.headers.get('content-type') || 'application/pdf';
          if (url.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
          else if (url.toLowerCase().endsWith('.txt') || url.toLowerCase().endsWith('.md')) mimeType = 'text/plain';
          
          parts.push({
            inlineData: {
              mimeType,
              data: base64
            }
          });
        }
      } catch (err) {
        console.error('Failed to process file URL:', url, err);
      }
    }

    const upstream = await fetch(`${GATEWAY_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.4,
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
