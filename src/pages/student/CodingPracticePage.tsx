import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play, RotateCcw, CheckCircle, XCircle, Zap,
  Clock, ChevronLeft, ChevronRight, Terminal, AlertCircle, Trophy
} from 'lucide-react';
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
  Beginner:     'bg-chart-3/15 text-chart-3 border-chart-3/30',
  Intermediate: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  Advanced:     'bg-destructive/15 text-destructive border-destructive/30',
};
const VERDICT_META: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  accepted:             { label: 'Accepted',         color: 'text-chart-3',    icon: CheckCircle },
  wrong_answer:         { label: 'Wrong Answer',     color: 'text-destructive', icon: XCircle },
  time_limit_exceeded:  { label: 'TLE',              color: 'text-chart-4',    icon: Clock },
  compilation_error:    { label: 'Compile Error',    color: 'text-destructive', icon: AlertCircle },
  runtime_error:        { label: 'Runtime Error',    color: 'text-destructive', icon: XCircle },
  pending:              { label: 'Pending',          color: 'text-muted-foreground', icon: Clock },
};

export default function CodingPracticePage() {
  const { user } = useAuth();
  const [problems, setProblems]     = useState<Problem[]>([]);
  const [loadingP, setLoadingP]     = useState(true);
  const [idx, setIdx]               = useState(0);
  const [language, setLanguage]     = useState<Lang>('python');
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
  }, [idx, problem]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const verdictMeta = result ? (VERDICT_META[result.verdict] ?? VERDICT_META.pending) : null;

  if (loadingP) {
    return (
      <AppLayout title="Coding Practice">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48 bg-muted" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-96 bg-muted rounded-xl" />
            <Skeleton className="h-96 bg-muted rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!problem) {
    return (
      <AppLayout title="Coding Practice">
        <div className="text-center py-20 text-muted-foreground">
          <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No problems available</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Coding Practice">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-foreground text-balance">Coding Practice</h2>
            {problem.is_daily && (
              <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/30 text-xs border">
                <Zap className="w-3 h-3 mr-1" /> Daily +{problem.credits} Credits
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"
              className="border border-border text-foreground hover:bg-accent h-8 w-8"
              onClick={() => { setIdx(Math.max(0, idx - 1)); }}
              disabled={idx === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{idx + 1} / {problems.length}</span>
            <Button variant="ghost" size="icon"
              className="border border-border text-foreground hover:bg-accent h-8 w-8"
              onClick={() => { setIdx(Math.min(problems.length - 1, idx + 1)); }}
              disabled={idx === problems.length - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* Problem panel */}
          <Card className="bg-card border-border h-full flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base text-foreground text-balance">{problem.title}</CardTitle>
                <Badge className={`text-xs shrink-0 border ${DIFF_COLORS[problem.difficulty]}`}>
                  {problem.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 min-h-0 max-h-[60vh]">
              <Tabs defaultValue="problem">
                <TabsList className="bg-muted border border-border mb-4">
                  {['problem','examples','constraints'].map(t => (
                    <TabsTrigger key={t} value={t}
                      className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground capitalize">
                      {t}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="problem">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line text-pretty">
                    {problem.description}
                  </p>
                </TabsContent>
                <TabsContent value="examples" className="space-y-3">
                  {problem.examples.map((ex, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                      <p className="text-xs font-semibold text-foreground">Example {i + 1}</p>
                      <div className="space-y-1 text-xs">
                        <div><span className="text-muted-foreground">Input: </span><code className="text-primary">{ex.input}</code></div>
                        <div><span className="text-muted-foreground">Output: </span><code className="text-chart-3">{ex.output}</code></div>
                        {ex.explanation && <p className="text-muted-foreground italic text-[11px]">{ex.explanation}</p>}
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="constraints">
                  <ul className="space-y-1.5">
                    {problem.constraints.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        <code className="text-xs break-words">{c}</code>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Editor + results */}
          <div className="space-y-3">
            <Card className="bg-card border-border">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <Select value={language} onValueChange={v => changeLang(v as Lang)}>
                  <SelectTrigger className="w-36 h-7 text-xs bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                      <SelectItem key={l} value={l} className="text-xs">{LANG_LABELS[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost"
                  className="h-7 text-xs border border-border text-foreground hover:bg-accent"
                  onClick={() => resetCode()}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
              </div>

              {/* Monaco-style textarea */}
              <CardContent className="p-0">
                <textarea
                  className="w-full h-72 p-4 bg-transparent text-foreground font-mono resize-none outline-none text-[13px] leading-relaxed"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
                />
              </CardContent>

              {/* Actions */}
              <div className="flex gap-3 px-4 py-3 border-t border-border">
                <Button
                  onClick={handleSubmit}
                  disabled={judging || !user}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-sm flex-1"
                >
                  {judging ? (
                    <><Play className="w-4 h-4 mr-2 animate-pulse" /> Judging…</>
                  ) : (
                    <><Terminal className="w-4 h-4 mr-2" /> Submit &amp; Judge</>
                  )}
                </Button>
              </div>
            </Card>

            {/* Results panel */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  Test Results
                  {judging && (
                    <Badge className="text-[10px] bg-chart-4/15 text-chart-4 border border-chart-4/30 animate-pulse">
                      Running on Judge0…
                    </Badge>
                  )}
                  {result && verdictMeta && (
                    <Badge className={`text-[10px] border ml-auto ${result.verdict === 'accepted' ? 'bg-chart-3/15 text-chart-3 border-chart-3/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                      {verdictMeta.label} {result.passedCount}/{result.totalCount}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {!result && !judging && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Submit your code to see real Judge0 results</p>
                  </div>
                )}

                {judging && (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-10 rounded-lg bg-muted" />
                    ))}
                    <p className="text-xs text-center text-muted-foreground pt-1 animate-pulse">
                      Compiling and running test cases…
                    </p>
                  </div>
                )}

                {result && !judging && (
                  <div className="space-y-2">
                    {/* Compile error */}
                    {result.compileError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                        <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Compilation Error
                        </p>
                        <pre className="text-[11px] text-destructive/80 font-mono whitespace-pre-wrap break-words">
                          {result.compileError}
                        </pre>
                      </div>
                    )}

                    {/* Per-test results */}
                    {result.testResults.map((t, i) => {
                      const pass = t.verdict === 'accepted';
                      return (
                        <div key={i}
                          className={`flex items-start gap-3 p-2.5 rounded-lg border ${pass ? 'bg-chart-3/10 border-chart-3/30' : 'bg-destructive/10 border-destructive/30'}`}>
                          {pass
                            ? <CheckCircle className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                            : <XCircle    className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-foreground">Case {t.case}</p>
                              <span className="text-[10px] text-muted-foreground">{t.time}</span>
                            </div>
                            {!pass && (
                              <div className="text-[11px] font-mono space-y-0.5">
                                <p className="text-muted-foreground">Expected: <code className="text-chart-3">{t.expectedOutput}</code></p>
                                <p className="text-muted-foreground">Got: <code className="text-destructive break-words">{t.actualOutput || '(empty)'}</code></p>
                              </div>
                            )}
                          </div>
                          <Badge className={`text-[10px] shrink-0 border ${pass ? 'bg-chart-3/15 text-chart-3 border-chart-3/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                            {pass ? 'Passed' : (VERDICT_META[t.verdict]?.label ?? t.verdict)}
                          </Badge>
                        </div>
                      );
                    })}

                    {/* Credits banner */}
                    {result.creditsAwarded > 0 && (
                      <div className="p-3 rounded-lg bg-chart-4/10 border border-chart-4/30 text-center mt-1">
                        <Trophy className="w-5 h-5 text-chart-4 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-chart-4">+{result.creditsAwarded} Credits Earned!</p>
                        <p className="text-xs text-muted-foreground">Daily challenge complete</p>
                      </div>
                    )}

                    {/* Stats */}
                    {result.verdict === 'accepted' && (
                      <div className="flex gap-4 pt-1 text-xs text-muted-foreground">
                        <span>⏱ {result.time_ms.toFixed(0)}ms</span>
                        <span>💾 {(result.memory_kb / 1024).toFixed(1)}MB</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
