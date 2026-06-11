import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GATEWAY_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Rate limit: 5 roadmap generations per user per day
const RATE_LIMIT = 5;
const WINDOW_SECS = 86400; // 24 hours

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    const endpoint = 'ai-roadmap';

    const { data: rateRow } = await supabase
      .from('auth_rate_limit')
      .select('id, count, window_start')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateRow) {
      const rowWindowStart = new Date(rateRow.window_start as string).getTime();
      const cutoff = Date.now() - WINDOW_SECS * 1000;

      if (rowWindowStart > cutoff) {
        if ((rateRow.count as number) >= RATE_LIMIT) {
          return new Response(
            JSON.stringify({ error: `Rate limit exceeded: max ${RATE_LIMIT} roadmaps per day. Please try again tomorrow.` }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        await supabase
          .from('auth_rate_limit')
          .update({ count: (rateRow.count as number) + 1 })
          .eq('id', rateRow.id);
      } else {
        await supabase
          .from('auth_rate_limit')
          .update({ count: 1, window_start: new Date().toISOString() })
          .eq('id', rateRow.id);
      }
    } else {
      await supabase.from('auth_rate_limit').insert({
        user_id: user.id,
        endpoint,
        count: 1,
        window_start: new Date().toISOString(),
      });
    }

    const body = await req.json() as { domain: string; level?: string; goals?: string };
    const { domain, level = 'Beginner', goals = '' } = body;

    if (!domain) {
      return new Response(JSON.stringify({ error: 'domain is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are an expert EdTech curriculum designer.

Generate a comprehensive, actionable learning roadmap for:
- Domain: ${domain}
- Level: ${level}
- Goals: ${goals || 'General mastery'}

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
      "resources": [{"title": "string", "type": "video|article|book|project", "url": "string or empty"}],
      "milestone": "string — what the learner can do after this phase"
    }
  ],
  "quiz_questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct_index": number,
      "explanation": "string"
    }
  ]
}

Include 3–5 phases and exactly 5 quiz_questions covering key concepts.`;

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
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(errText, {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await upstream.json();

    // Extract the generated text
    const rawText: string =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    // Clean up any accidental markdown fences
    const cleaned = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    return new Response(cleaned, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ai-roadmap] error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
