import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GATEWAY_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

// Rate limit: 20 messages per user per hour
const RATE_LIMIT = 20;
const WINDOW_SECS = 3600;

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

    // Rate limiting via auth_rate_limit table
    const endpoint = 'ai-mentor';
    const windowStart = new Date(Date.now() - WINDOW_SECS * 1000).toISOString();

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
        // Within current window
        if ((rateRow.count as number) >= RATE_LIMIT) {
          return new Response(
            JSON.stringify({ error: `Rate limit exceeded: max ${RATE_LIMIT} messages per hour. Please try again later.` }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Increment
        await supabase
          .from('auth_rate_limit')
          .update({ count: (rateRow.count as number) + 1 })
          .eq('id', rateRow.id);
      } else {
        // Window expired — reset
        await supabase
          .from('auth_rate_limit')
          .update({ count: 1, window_start: new Date().toISOString() })
          .eq('id', rateRow.id);
      }
    } else {
      // First call
      await supabase.from('auth_rate_limit').insert({
        user_id: user.id,
        endpoint,
        count: 1,
        window_start: new Date().toISOString(),
      });
    }

    // Parse body
    const body = await req.json() as { contents: unknown[]; conversationId?: string };
    const { contents, conversationId } = body;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return new Response(JSON.stringify({ error: 'contents array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // System prompt for AI Mentor
    const systemInstruction = {
      role: 'user',
      parts: [{ text: `You are LearnLoom AI Mentor — an expert computer science and programming tutor. 
Your role:
- Answer coding, DSA, web dev, data science, and interview-prep questions clearly
- Provide step-by-step explanations with working code examples
- Encourage learners and suggest next steps
- Keep answers concise and practical
- Respond in the same language the student uses (Chinese or English)
- NEVER provide answers to exam/test questions directly; guide the student to think

Conversation ID: ${conversationId ?? 'new'}` }],
    };

    const fullContents = [systemInstruction, ...contents];

    const upstream = await fetch(`${GATEWAY_URL}&key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: fullContents }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(errText, {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (err) {
    console.error('[ai-mentor] error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
