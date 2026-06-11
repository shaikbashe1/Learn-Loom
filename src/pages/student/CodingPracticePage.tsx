import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Lang = 'python' | 'javascript' | 'java' | 'cpp' | 'c';

interface Problem {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starter_code: Record<Lang, string>;
  test_cases: { input: string; expectedOutput: string }[];
  is_daily: boolean;
  credits: number;
}

interface TestResult {
  case: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  verdict: string;
  time: string;
  memory: number;
}

interface JudgeResponse {
  verdict: string;
  testResults: TestResult[];
  compileError: string | null;
  time_ms: number;
  memory_kb: number;
  creditsAwarded: number;
  passedCount: number;
  totalCount: number;
}

const LANG_LABELS: Record<Lang, string> = {
  python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++', c: 'C'
};

const DIFF_COLORS = {
  Beginner:     'bg-primary/10 text-primary',
  Intermediate: 'bg-tertiary/10 text-tertiary',
  Advanced:     'bg-error/10 text-error',
};

const VERDICT_META: Record<string, { label: string; color: string; icon: string }> = {
  accepted:             { label: 'Accepted',         color: 'text-[#4ade80]', icon: 'check_circle' },
  wrong_answer:         { label: 'Wrong Answer',     color: 'text-error',     icon: 'cancel' },
  time_limit_exceeded:  { label: 'TLE',              color: 'text-tertiary',  icon: 'schedule' },
  compilation_error:    { label: 'Compile Error',    color: 'text-error',     icon: 'error' },
  runtime_error:        { label: 'Runtime Error',    color: 'text-error',     icon: 'cancel' },
  pending:              { label: 'Pending',          color: 'text-outline',   icon: 'schedule' },
};

export default function CodingPracticePage() {
  const { user } = useAuth();
  const [problems, setProblems]     = useState<Problem[]>([]);
  const [loadingP, setLoadingP]     = useState(true);
  const [idx, setIdx]               = useState(0);
  const [language, setLanguage]     = useState<Lang>('javascript');
  const [code, setCode]             = useState('');
  const [judging, setJudging]       = useState(false);
  const [result, setResult]         = useState<JudgeResponse | null>(null);

  // Load problems from DB
  useEffect(() => {
    supabase
      .from('coding_problems')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setProblems((data as Problem[]) ?? []);
        setLoadingP(false);
      });
  }, []);

  const problem = problems[idx];

  // Reset code when problem or language changes
  const resetCode = useCallback((lang?: Lang) => {
    const l = lang ?? language;
    setCode(problem?.starter_code?.[l] ?? '');
    setResult(null);
  }, [problem, language]);

  useEffect(() => {
    if (problem) resetCode();
  }, [idx, problem, resetCode]);

  const changeLang = (lang: Lang) => {
    setLanguage(lang);
    setCode(problem?.starter_code?.[lang] ?? '');
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Please log in to submit code'); return; }
    if (!problem) return;
    if (!code.trim()) { toast.error('Please write some code first'); return; }

    setJudging(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke<JudgeResponse>('execute-code', {
      body: { problem_id: problem.id, source_code: code, language },
    });

    setJudging(false);

    if (error) {
      const msg = await error?.context?.text?.();
      const parsed = msg ? (() => { try { return JSON.parse(msg); } catch { return null; } })() : null;
      const errText = parsed?.error ?? msg ?? error.message;
      if (errText?.includes('JUDGE0_API_KEY')) {
        toast.error('Judge0 not configured', {
          description: 'Add your JUDGE0_API_KEY in project secrets (get it from RapidAPI).',
        });
      } else {
        toast.error('Submission failed', { description: errText });
      }
      return;
    }

    setResult(data);

    if (data?.verdict === 'accepted') {
      if (data.creditsAwarded > 0) {
        toast.success(`✅ Accepted! +${data.creditsAwarded} credits earned`, {
          description: `All ${data.totalCount} test cases passed. Daily challenge complete!`,
        });
      } else {
        toast.success(`✅ All ${data.totalCount} test cases passed!`);
      }
    } else if (data?.verdict === 'compilation_error') {
      toast.error('Compilation Error', { description: 'Fix the syntax errors and try again.' });
    } else {
      toast.error(`${VERDICT_META[data?.verdict ?? '']?.label ?? 'Failed'} — ${data?.passedCount}/${data?.totalCount} tests passed`);
    }
  };

  if (loadingP) {
    return (
      <AppLayout title="Coding Practice">
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden gap-md w-full">
          <Skeleton className="flex-1 bg-surface-container-lowest rounded-lg border border-outline-variant/30 min-w-[300px]" />
          <Skeleton className="flex-[1.5] bg-[#1e1e1e] rounded-lg border border-outline-variant/30 min-w-[400px]" />
          <Skeleton className="flex-1 bg-surface-container-lowest rounded-lg border border-outline-variant/30 min-w-[300px]" />
        </div>
      </AppLayout>
    );
  }

  if (!problem) {
    return (
      <AppLayout title="Coding Practice">
        <div className="text-center py-20 text-on-surface-variant h-[calc(100vh-80px)] flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[48px] opacity-30 mb-4">terminal</span>
          <p className="font-label-md text-label-md text-on-surface">No problems available</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Coding Practice">
      <div className="flex flex-col h-[calc(100vh-80px)] w-full gap-4 relative">
        
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between bg-surface-container-low border border-outline-variant/30 rounded-lg p-2 shrink-0">
          <div className="flex items-center gap-4 pl-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIdx(Math.max(0, idx - 1))} 
                disabled={idx === 0}
                className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{idx + 1} / {problems.length}</span>
              <button 
                onClick={() => setIdx(Math.min(problems.length - 1, idx + 1))} 
                disabled={idx === problems.length - 1}
                className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
            {problem.is_daily && (
              <span className="bg-tertiary-container/20 text-tertiary px-2 py-0.5 rounded font-label-sm text-[10px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">local_fire_department</span> Daily +{problem.credits} pts
              </span>
            )}
            <div className="h-4 w-px bg-outline-variant/30 hidden sm:block"></div>
            <select 
              value={language} 
              onChange={e => changeLang(e.target.value as Lang)}
              className="bg-surface-container border border-outline-variant/30 text-on-surface font-label-sm text-label-sm rounded px-2 py-1 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <option key={l} value={l}>{LANG_LABELS[l]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => resetCode()} className="flex items-center gap-1 px-3 py-1.5 rounded border border-outline-variant/60 text-on-surface font-label-sm text-label-sm hover:border-outline transition-colors">
              <span className="material-symbols-outlined text-[16px]">refresh</span> Reset
            </button>
            <button onClick={handleSubmit} disabled={judging || !user} className="flex items-center gap-1 bg-primary text-on-primary-fixed px-4 py-1.5 rounded font-label-sm text-label-sm font-bold hover:brightness-110 transition-colors disabled:opacity-50">
              {judging ? <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span> : <span className="material-symbols-outlined text-[16px]">publish</span>}
              {judging ? 'Judging' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4 pb-4">
          
          {/* Left Pane: Problem Description */}
          <section className="flex-1 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex flex-col overflow-hidden min-w-[300px]">
            <div className="px-md py-sm border-b border-outline-variant/30 bg-surface flex justify-between items-center">
              <h2 className="font-label-md text-label-md text-on-surface">Description</h2>
              <div className="flex gap-xs">
                <span className={`px-sm py-xs rounded-full font-label-sm text-label-sm ${DIFF_COLORS[problem.difficulty]}`}>{problem.difficulty}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-md font-body-sm text-body-sm text-on-surface-variant" style={{ scrollbarWidth: 'thin' }}>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">{problem.title}</h3>
              <p className="mb-md leading-relaxed whitespace-pre-line text-pretty">{problem.description}</p>
              
              {problem.examples.map((ex, i) => (
                <div key={i} className="mb-md">
                  <h4 className="font-label-sm text-label-sm text-on-surface mb-2">Example {i + 1}:</h4>
                  <div className="bg-surface-container p-sm rounded border border-outline-variant/30 font-label-sm text-label-sm text-on-surface">
                    <p><strong className="text-on-surface-variant">Input:</strong> {ex.input}</p>
                    <p><strong className="text-on-surface-variant">Output:</strong> {ex.output}</p>
                    {ex.explanation && <p className="text-on-surface-variant mt-1 text-[11px]">Explanation: {ex.explanation}</p>}
                  </div>
                </div>
              ))}
              
              {problem.constraints.length > 0 && (
                <div className="mb-lg">
                  <h4 className="font-label-sm text-label-sm text-on-surface mb-2">Constraints:</h4>
                  <ul className="list-disc list-inside font-label-sm text-[11px] text-on-surface-variant space-y-1 ml-1">
                    {problem.constraints.map((c, i) => <li key={i}><code>{c}</code></li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Middle Pane: Code Editor */}
          <section className="flex-[1.5] bg-[#1e1e1e] rounded-lg border border-outline-variant/30 flex flex-col overflow-hidden min-w-[300px]">
            <div className="px-md py-sm border-b border-[#333] bg-[#2d2d2d] flex items-center">
              <span className="material-symbols-outlined text-[16px] text-tertiary mr-sm">code</span>
              <h2 className="font-label-sm text-label-sm text-on-surface">solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'c'}</h2>
            </div>
            <div className="flex-1 overflow-auto flex relative">
              <textarea
                className="w-full h-full p-4 bg-transparent text-[#d4d4d4] font-label-sm text-label-sm resize-none outline-none leading-relaxed"
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace', tabSize: 4 }}
              />
            </div>
          </section>

          {/* Right Pane: Console/Output */}
          <section className="flex-1 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex flex-col overflow-hidden min-w-[300px]">
            <div className="px-md py-sm border-b border-outline-variant/30 bg-surface flex gap-md">
              <button className="font-label-md text-label-md text-primary border-b-2 border-primary pb-1 -mb-2">Output</button>
            </div>
            <div className="flex-1 overflow-y-auto p-md font-label-sm text-label-sm" style={{ scrollbarWidth: 'thin' }}>
              
              {!result && !judging && (
                <div className="text-center py-10 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] opacity-30 mb-2">science</span>
                  <p className="text-xs">Submit code to see results</p>
                </div>
              )}

              {judging && (
                <div className="space-y-3 animate-pulse">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 rounded bg-surface-variant border border-outline-variant/30"></div>
                  ))}
                  <p className="text-center text-xs text-on-surface-variant">Running tests on Judge0...</p>
                </div>
              )}

              {result && !judging && (
                <div className="space-y-3">
                  
                  {/* Credits banner */}
                  {result.creditsAwarded > 0 && (
                    <div className="p-3 rounded border border-[#6f00be]/40 bg-[#6f00be]/10 text-center mb-4">
                      <span className="material-symbols-outlined text-[#d6a9ff] mb-1 text-[24px]">workspace_premium</span>
                      <p className="font-bold text-[#d6a9ff]">+{result.creditsAwarded} Credits Earned!</p>
                      <p className="text-[10px] text-[#ddb7ff]">Daily challenge complete</p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className={`p-2 rounded border font-bold flex items-center gap-2 ${result.verdict === 'accepted' ? 'border-[#2f3b2f] bg-[#1a2e1e] text-[#4ade80]' : 'border-[#3b2f2f] bg-[#2e1a1a] text-error'}`}>
                    <span className="material-symbols-outlined text-[18px]">{VERDICT_META[result.verdict]?.icon ?? 'info'}</span>
                    <span>{VERDICT_META[result.verdict]?.label ?? result.verdict}</span>
                    <span className="ml-auto text-xs font-normal opacity-80">{result.passedCount}/{result.totalCount} passed</span>
                  </div>

                  {/* Stats */}
                  {result.verdict === 'accepted' && (
                    <div className="flex gap-4 text-[10px] text-on-surface-variant px-1">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">timer</span> {result.time_ms.toFixed(0)}ms</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">memory</span> {(result.memory_kb / 1024).toFixed(1)}MB</span>
                    </div>
                  )}

                  {/* Compile error */}
                  {result.compileError && (
                    <div className="p-sm rounded border border-[#3b2f2f] bg-[#2e1a1a]">
                      <div className="flex items-center gap-sm mb-sm text-error">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span className="font-bold">Compilation Error</span>
                      </div>
                      <pre className="text-error/80 text-[10px] whitespace-pre-wrap font-mono">{result.compileError}</pre>
                    </div>
                  )}

                  {/* Test Cases */}
                  {result.testResults.map((t, i) => {
                    const pass = t.verdict === 'accepted';
                    return (
                      <div key={i} className={`p-sm rounded border ${pass ? 'border-[#2f3b2f] bg-[#1a2e1e]' : 'border-[#3b2f2f] bg-[#2e1a1a]'}`}>
                        <div className={`flex justify-between items-center mb-2 ${pass ? 'text-[#4ade80]' : 'text-error'}`}>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">{pass ? 'check_circle' : 'cancel'}</span>
                            <span className="font-bold text-xs">Test Case {t.case}</span>
                          </div>
                          {!pass && <span className="text-[10px] bg-error/20 px-1 rounded">{VERDICT_META[t.verdict]?.label ?? t.verdict}</span>}
                        </div>
                        <div className="text-on-surface-variant grid grid-cols-[60px_1fr] gap-x-2 gap-y-1 text-[11px] font-mono">
                          <span>Input:</span><span className="text-on-surface truncate break-all">{t.input}</span>
                          <span>Expected:</span><span className="text-on-surface truncate break-all">{t.expectedOutput}</span>
                          {!pass && (
                            <>
                              <span className="text-error mt-1">Output:</span>
                              <span className="text-error mt-1 break-words bg-error/10 px-1 rounded">{t.actualOutput || '(empty)'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
