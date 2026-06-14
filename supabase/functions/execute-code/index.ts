import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Piston language mapping
const LANG_MAP: Record<string, string> = {
  python:     'python',
  javascript: 'javascript',
  java:       'java',
  cpp:        'c++',
  c:          'c',
};

const PISTON_URL = Deno.env.get('PISTON_API_URL') || 'https://emkc.org/api/v2/piston/execute';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Rate Limiting Map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(userId: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userRate = rateLimitMap.get(userId);

  if (!userRate || now > userRate.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return false;
  }

  userRate.count++;
  if (userRate.count > limit) {
    return true;
  }
  return false;
}

async function executePiston(
  sourceCode: string,
  language: string,
  stdin: string
) {
  const res = await fetch(PISTON_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language: language,
      version: '*',
      files: [{ content: sourceCode }],
      stdin: stdin,
      compile_timeout: 10000,
      run_timeout: 3000,
      compile_memory_limit: -1,
      run_memory_limit: -1,
    }),
  });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Piston execute failed (${res.status}): ${txt}`);
  }
  return res.json();
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

    const { problem_id, source_code, language, run_only, stdin } = await req.json();
    if (!source_code || !language)
      return json({ error: 'Missing source_code or language' }, 400);

    if (!run_only && !problem_id)
      return json({ error: 'Missing problem_id for submission' }, 400);

    const pistonLang = LANG_MAP[language];
    if (!pistonLang) return json({ error: `Unsupported language: ${language}` }, 400);

    // Rate Limiting check
    if (isRateLimited(user.id, 10, 60000)) {
      return json({ error: 'Rate limit exceeded. Please wait a minute.' }, 429);
    }

    if (run_only) {
      try {
        const result = await executePiston(source_code, pistonLang, stdin ?? '');
        let compileError: string | null = null;
        if (result.compile && result.compile.code !== 0) {
          compileError = result.compile.output || result.compile.stderr;
        }
        return json({
          run_only: true,
          compileError,
          stdout: result.run?.stdout || '',
          stderr: result.run?.stderr || '',
          output: result.run?.output || '',
          time_ms: result.run?.cpu_time ?? 0,
          memory_kb: result.run?.memory ? Math.round(result.run.memory / 1024) : 0,
        });
      } catch (err) {
        console.error('run_only Piston error:', err);
        return json({ error: err instanceof Error ? err.message : 'Execution failed' }, 500);
      }
    }

    // Fetch problem + test cases from DB
    const { data: problem, error: pErr } = await supabase
      .from('coding_problems')
      .select('id, test_cases, credits, is_daily')
      .eq('id', problem_id)
      .maybeSingle();
    if (pErr || !problem) return json({ error: 'Problem not found' }, 404);

    const testCases: Array<{ input: string; expectedOutput: string }> = problem.test_cases ?? [];
    if (!testCases.length) return json({ error: 'No test cases configured for this problem' }, 400);

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

    // Execute test cases sequentially to avoid rate limits
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (i > 0) await sleep(250); // Small delay between requests to be gentle to the API

      let result;
      try {
        result = await executePiston(source_code, pistonLang, tc.input);
      } catch (e) {
        testResults.push({
          case: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          status: 'API Error',
          verdict: 'runtime_error',
          time: '—',
          memory: 0,
        });
        overallVerdict = 'runtime_error';
        continue;
      }

      // Check compilation error
      if (result.compile && result.compile.code !== 0) {
        compileError = result.compile.output || result.compile.stderr;
        overallVerdict = 'compilation_error';
        testResults.push({
          case: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: compileError ?? '',
          status: 'Compilation Error',
          verdict: 'compilation_error',
          time: '0ms',
          memory: 0,
        });
        break; // No point running more tests
      }

      const runOutput = result.run.output || '';
      const actualOutputTrimmed = runOutput.trim();
      const expectedOutputTrimmed = tc.expectedOutput.trim();
      
      let verdict = 'accepted';
      let status = 'Accepted';

      if (result.run.signal === 'SIGKILL') {
        verdict = 'time_limit_exceeded';
        status = 'Time Limit Exceeded';
      } else if (result.run.code !== 0) {
        verdict = 'runtime_error';
        status = 'Runtime Error';
      } else if (actualOutputTrimmed !== expectedOutputTrimmed) {
        verdict = 'wrong_answer';
        status = 'Wrong Answer';
      }

      const timeMs = 0;
      const memKb = 0;

      testResults.push({
        case: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: runOutput,
        status,
        verdict,
        time: `${timeMs}ms`,
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
    console.error('execute-code error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
