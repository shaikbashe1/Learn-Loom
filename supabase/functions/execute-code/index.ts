import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Judge0 CE via RapidAPI language IDs
const LANG_ID: Record<string, number> = {
  python:     71,  // Python 3.8
  javascript: 63,  // Node.js 12
  java:       62,  // Java (OpenJDK 13)
  cpp:        54,  // C++ (GCC 9.2)
  c:          50,  // C (GCC 9.2)
};

// Judge0 verdict status IDs
const VERDICT_MAP: Record<number, string> = {
  3:  'accepted',
  4:  'wrong_answer',
  5:  'time_limit_exceeded',
  6:  'compilation_error',
  7:  'runtime_error',
  8:  'runtime_error',
  9:  'runtime_error',
  10: 'runtime_error',
  11: 'runtime_error',
  12: 'runtime_error',
};

const J0_HOST    = 'judge0-ce.p.rapidapi.com';
const J0_BASE    = `https://${J0_HOST}`;
const MAX_POLL   = 10;
const POLL_DELAY = 1200; // ms

function toB64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}
function fromB64(s: string): string {
  try { return decodeURIComponent(escape(atob(s))); }
  catch { return atob(s); }
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function submitToJudge0(
  sourceCode: string,
  languageId: number,
  stdin: string,
  expectedOutput: string,
  apiKey: string
): Promise<{ token: string }> {
  const res = await fetch(`${J0_BASE}/submissions?base64_encoded=true&wait=false`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': J0_HOST,
    },
    body: JSON.stringify({
      source_code:      toB64(sourceCode),
      language_id:      languageId,
      stdin:            toB64(stdin),
      expected_output:  toB64(expectedOutput),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Judge0 submit failed (${res.status}): ${txt}`);
  }
  return res.json();
}

async function pollResult(token: string, apiKey: string) {
  for (let i = 0; i < MAX_POLL; i++) {
    await sleep(POLL_DELAY);
    const res = await fetch(
      `${J0_BASE}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': J0_HOST,
        },
      }
    );
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status?.id > 2) return data; // done (not In Queue / Processing)
  }
  return null; // timed out waiting
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('JUDGE0_API_KEY');
    if (!apiKey) return json({ error: 'JUDGE0_API_KEY not configured' }, 500);

    const { problem_id, source_code, language } = await req.json();
    if (!problem_id || !source_code || !language)
      return json({ error: 'Missing problem_id, source_code, or language' }, 400);

    const langId = LANG_ID[language];
    if (!langId) return json({ error: `Unsupported language: ${language}` }, 400);

    // Fetch problem + test cases from DB
    const { data: problem, error: pErr } = await supabase
      .from('coding_problems')
      .select('id, test_cases, credits, is_daily')
      .eq('id', problem_id)
      .maybeSingle();
    if (pErr || !problem) return json({ error: 'Problem not found' }, 404);

    const testCases: Array<{ input: string; expectedOutput: string }> = problem.test_cases ?? [];
    if (!testCases.length) return json({ error: 'No test cases configured for this problem' }, 400);

    // Submit all test cases to Judge0 in parallel (get tokens first)
    const tokens: string[] = [];
    for (const tc of testCases) {
      const sub = await submitToJudge0(source_code, langId, tc.input, tc.expectedOutput, apiKey);
      tokens.push(sub.token);
    }

    // Poll all results (sequentially to respect rate limits)
    const testResults: Array<{
      case: number;
      input: string;
      expectedOutput: string;
      actualOutput: string;
      status: string;
      verdict: string;
      time: string;
      memory: number;
    }> = [];

    let overallVerdict = 'accepted';
    let totalTimeMs = 0;
    let maxMemory = 0;
    let compileError: string | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const result = await pollResult(tokens[i], apiKey);
      const tc = testCases[i];

      if (!result) {
        testResults.push({
          case: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          status: 'Timed Out',
          verdict: 'time_limit_exceeded',
          time: '—',
          memory: 0,
        });
        overallVerdict = 'time_limit_exceeded';
        continue;
      }

      const statusId  = result.status?.id ?? 0;
      const verdict   = VERDICT_MAP[statusId] ?? 'runtime_error';
      const stdout    = result.stdout ? fromB64(result.stdout).trim() : '';
      const stderr    = result.stderr ? fromB64(result.stderr).trim() : '';
      const compOut   = result.compile_output ? fromB64(result.compile_output).trim() : '';
      const timeMs    = parseFloat(result.time ?? '0') * 1000;
      const memKb     = result.memory ?? 0;

      totalTimeMs += timeMs;
      maxMemory    = Math.max(maxMemory, memKb);

      if (verdict === 'compilation_error') {
        compileError = compOut || stderr;
        overallVerdict = 'compilation_error';
        // No point running more tests
        testResults.push({
          case: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: compileError ?? '',
          status: result.status?.description ?? 'Compilation Error',
          verdict,
          time: `${timeMs.toFixed(0)}ms`,
          memory: memKb,
        });
        break;
      }

      testResults.push({
        case: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: stdout || stderr,
        status: result.status?.description ?? 'Unknown',
        verdict,
        time: `${timeMs.toFixed(0)}ms`,
        memory: memKb,
      });

      if (verdict !== 'accepted' && overallVerdict === 'accepted') {
        overallVerdict = verdict;
      }
    }

    // Award credits for accepted daily submissions (once per day per problem)
    let creditsAwarded = 0;
    if (overallVerdict === 'accepted' && problem.is_daily) {
      try {
        const { count } = await supabase
          .from('coding_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('problem_id', problem_id)
          .eq('verdict', 'accepted')
          .gt('credits_awarded', 0)
          .gte('created_at', new Date().toISOString().slice(0, 10));

        if ((count ?? 0) === 0) {
          creditsAwarded = problem.credits ?? 5;
          await supabase.rpc('increment_credits', {
            p_user_id: user.id,
            p_amount:  creditsAwarded,
          });
          // Also log activity for streak
          await supabase.rpc('log_activity', {
            p_user_id: user.id,
            p_type:    'coding',
            p_value:   1,
          });
        }
      } catch (e) {
        console.error('Credit award failed (non-fatal):', e);
      }
    }

    // Persist submission
    await supabase.from('coding_submissions').insert({
      user_id:         user.id,
      problem_id,
      language,
      source_code,
      verdict:         overallVerdict,
      test_results:    testResults,
      time_ms:         totalTimeMs,
      memory_kb:       maxMemory,
      credits_awarded: creditsAwarded,
    });

    return json({
      verdict:        overallVerdict,
      testResults,
      compileError,
      time_ms:        totalTimeMs,
      memory_kb:      maxMemory,
      creditsAwarded,
      passedCount:    testResults.filter(r => r.verdict === 'accepted').length,
      totalCount:     testResults.length,
    });

  } catch (err) {
    console.error('judge-code error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
