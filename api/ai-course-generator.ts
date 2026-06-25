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

    const { title, description, fileUrls = [] } = await req.json();

    if (!title) {
      return new Response(JSON.stringify({ error: 'Course title is required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Process files if provided
    const parts: any[] = [];
    
    const prompt = `You are an expert AI curriculum designer building a comprehensive educational course.
    
Course Title: ${title}
Course Description: ${description || 'Not provided'}

Using the provided course title, description, and any attached documents, generate a highly structured, comprehensive course outline.
The course MUST contain a minimum of 20 modules (unless the topic is extremely narrow, in which case generate as many as logically possible, but aim for 20+).
Organize them in a strict logical learning sequence (Beginner -> Intermediate -> Advanced).

Return a JSON object with this EXACT structure (no markdown, raw JSON only):
{
  "title": "string (the polished course title)",
  "description": "string (a professional 3-4 sentence course overview)",
  "modules": [
    {
      "order_index": number (starting from 0),
      "title": "string (Module Title)",
      "description": "string (What this module covers)",
      "learning_objectives": ["string"]
    }
  ]
}`;

    parts.push({ text: prompt });

    // Download and attach files
    for (const url of fileUrls) {
      try {
        if (!isUrlSafe(url)) continue; // SSRF protection
        const fileRes = await fetch(url);
        if (fileRes.ok) {
          const buffer = await fileRes.arrayBuffer();
          // Note: In an edge environment we don't use 'Buffer', we use btoa
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
