import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logUserActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { 
  Play, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  UploadCloud, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Code2, 
  Keyboard, 
  AlertTriangle,
  FileText,
  Cpu
} from 'lucide-react';

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
  run_only?: boolean;
  stdout?: string;
  stderr?: string;
}

const PISTON_URL = '/api/piston/execute';
const LANG_MAP: Record<Lang, string> = {
  python: 'python', javascript: 'javascript', java: 'java', cpp: 'c++', c: 'c'
};

const LANG_LABELS: Record<Lang, string> = {
  python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++', c: 'C'
};

const DIFF_COLORS = {
  Beginner:     'bg-primary/10 text-primary border-primary/20',
  Intermediate: 'bg-chart-4/15 text-chart-4 border-chart-4/20',
  Advanced:     'bg-destructive/15 text-destructive border-destructive/20',
};

const VERDICT_META: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  accepted:             { label: 'Accepted',         color: 'text-success border-success/30 bg-success/5', icon: CheckCircle2 },
  wrong_answer:         { label: 'Wrong Answer',     color: 'text-destructive border-destructive/30 bg-destructive/5',     icon: XCircle },
  time_limit_exceeded:  { label: 'TLE',              color: 'text-warning border-warning/30 bg-warning/5',  icon: Clock },
  compilation_error:    { label: 'Compile Error',    color: 'text-destructive border-destructive/30 bg-destructive/5',     icon: AlertTriangle },
  runtime_error:        { label: 'Runtime Error',    color: 'text-destructive border-destructive/30 bg-destructive/5',     icon: XCircle },
  pending:              { label: 'Pending',          color: 'text-muted-foreground border-border bg-muted/20',   icon: Clock },
};

export default function CodingPracticePage() {
  const { user } = useAuth();
  const [problems, setProblems]     = useState<Problem[]>([]);
  const [loadingP, setLoadingP]     = useState(true);
  const [idx, setIdx]               = useState(0);
  const [language, setLanguage]     = useState<Lang>('javascript');
  const [code, setCode]             = useState('');
  const [judging, setJudging]       = useState(false);
  const [running, setRunning]       = useState(false);
  const [result, setResult]         = useState<JudgeResponse | null>(null);
  const [activeTab, setActiveTab]   = useState<'output' | 'input'>('output');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [mobileTab, setMobileTab]   = useState<'problem' | 'code' | 'output'>('problem');

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

  // Storage key for local storage persistence
  const storageKey = problem ? `code_${user?.id || 'default'}_${problem.id}_${language}` : '';

  // Load saved code when problem, language, or storage key changes
  useEffect(() => {
    if (!problem || !storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setCode(saved);
    } else {
      setCode(problem.starter_code[language] ?? '');
    }
    setResult(null);
  }, [problem?.id, language, storageKey]);

  // Reset code manually
  const resetCode = useCallback(() => {
    if (!problem) return;
    const starter = problem.starter_code[language] ?? '';
    setCode(starter);
    if (storageKey) {
      localStorage.setItem(storageKey, starter);
    }
    setResult(null);
  }, [problem, language, storageKey]);

  const changeLang = (lang: Lang) => {
    setLanguage(lang);
    setResult(null);
  };

  const handleRun = async () => {
    if (!user) { toast.error('Please log in to run code'); return; }
    if (!code.trim()) { toast.error('Please write some code first'); return; }

    setRunning(true);
    setResult(null);
    setActiveTab('output');
    setMobileTab('output');

    try {
      const res = await fetch(PISTON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: LANG_MAP[language],
          version: '*',
          files: [{ content: code }],
          stdin: useCustomInput ? customInput : '',
        })
      });

      if (!res.ok) throw new Error(`Piston API Error: ${res.status}`);
      const data = await res.json();
      
      let compileError = null;
      if (data.compile && data.compile.code !== 0) {
        compileError = data.compile.output || data.compile.stderr;
      }

      const runResponse: JudgeResponse = {
        verdict: 'accepted',
        testResults: [],
        compileError,
        time_ms: data.run?.cpu_time ?? 0,
        memory_kb: data.run?.memory ? Math.round(data.run.memory / 1024) : 0,
        creditsAwarded: 0,
        passedCount: 0,
        totalCount: 0,
        run_only: true,
        stdout: data.run?.stdout || '',
        stderr: data.run?.stderr || '',
      };

      setResult(runResponse);
      if (compileError) {
        toast.error('Compilation Error');
      } else {
        toast.success('Execution finished');
        void logUserActivity(user.id, 'code_run', `Ran code for: ${problem?.title}`);
      }
    } catch (err: any) {
      toast.error('Execution failed', { description: err.message });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Please log in to submit code'); return; }
    if (!problem) return;
    if (!code.trim()) { toast.error('Please write some code first'); return; }

    setJudging(true);
    setResult(null);
    setActiveTab('output');
    setMobileTab('output');

    try {
      const testCases = problem.test_cases || [];
      const testResults: TestResult[] = [];
      let compileError = null;
      let overallVerdict = 'accepted';
      const totalTimeMs = 0;
      const maxMemory = 0;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const res = await fetch(PISTON_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: LANG_MAP[language],
            version: '*',
            files: [{ content: code }],
            stdin: tc.input,
          })
        });

        if (!res.ok) throw new Error(`Piston API Error: ${res.status}`);
        const data = await res.json();

        if (data.compile && data.compile.code !== 0) {
          compileError = data.compile.output || data.compile.stderr;
          overallVerdict = 'compilation_error';
          testResults.push({
            case: i + 1, input: tc.input, expectedOutput: tc.expectedOutput,
            actualOutput: compileError ?? '', verdict: 'compilation_error',
            time: '0ms', memory: 0
          });
          break;
        }

        const runOutput = data.run?.output || '';
        const actualOutputTrimmed = runOutput.trim();
        const expectedOutputTrimmed = tc.expectedOutput.trim();
        
        let verdict = 'accepted';
        if (data.run?.signal === 'SIGKILL') verdict = 'time_limit_exceeded';
        else if (data.run?.code !== 0) verdict = 'runtime_error';
        else if (actualOutputTrimmed !== expectedOutputTrimmed) verdict = 'wrong_answer';

        testResults.push({
          case: i + 1, input: tc.input, expectedOutput: tc.expectedOutput,
          actualOutput: runOutput, verdict, time: `${data.run?.cpu_time ?? 0}ms`,
          memory: data.run?.memory ? Math.round(data.run.memory / 1024) : 0
        });

        if (verdict !== 'accepted' && overallVerdict === 'accepted') overallVerdict = verdict;
      }

      const passedCount = testResults.filter(r => r.verdict === 'accepted').length;
      const resultData: JudgeResponse = {
        verdict: overallVerdict,
        testResults,
        compileError,
        time_ms: totalTimeMs,
        memory_kb: maxMemory,
        creditsAwarded: 0,
        passedCount,
        totalCount: testResults.length
      };

      setResult(resultData);

      if (overallVerdict === 'accepted') {
        toast.success(`All ${testResults.length} test cases passed!`);
        void logUserActivity(user.id, 'code_run', `Successfully submitted: ${problem?.title}`);
      } else if (overallVerdict === 'compilation_error') {
        toast.error('Compilation Error', { description: 'Fix the syntax errors and try again.' });
      } else {
        toast.error(`${VERDICT_META[overallVerdict]?.label ?? 'Failed'} — ${passedCount}/${testResults.length} tests passed`);
      }
    } catch (err: any) {
      toast.error('Submission failed', { description: err.message });
    } finally {
      setJudging(false);
    }
  };

  if (loadingP) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden gap-4 w-full p-4 select-none">
          <Loading variant="skeleton" className="flex-1 bg-card rounded-xl border border-border shadow-sm min-w-[300px]" />
          <Loading variant="skeleton" className="flex-[1.5] bg-card rounded-xl border border-border shadow-sm min-w-[400px]" />
          <Loading variant="skeleton" className="flex-1 bg-card rounded-xl border border-border shadow-sm min-w-[300px]" />
        </div>
      </AppLayout>
    );
  }

  if (!problem) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground h-[calc(100vh-80px)] flex flex-col items-center justify-center select-none">
          <Terminal className="w-12 h-12 opacity-30 mb-4 animate-bounce" />
          <p className="text-sm font-bold text-foreground">No problems available</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-80px)] w-full gap-3 relative px-margin-mobile md:px-margin-desktop py-4">
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-card border border-border rounded-xl p-2 shrink-0 z-10 shadow-sm select-none">
          <div className="flex flex-wrap items-center gap-3 pl-1">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIdx(Math.max(0, idx - 1))} 
                disabled={idx === 0}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 p-1.5 rounded-lg hover:bg-muted/50"
                aria-label="Previous Problem"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-muted-foreground min-w-[45px] text-center">
                {idx + 1} / {problems.length}
              </span>
              <button 
                onClick={() => setIdx(Math.min(problems.length - 1, idx + 1))} 
                disabled={idx === problems.length - 1}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 p-1.5 rounded-lg hover:bg-muted/50"
                aria-label="Next Problem"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {problem.is_daily && (
              <span className="bg-chart-3/10 text-chart-3 border border-chart-3/20 px-2.5 py-0.5 rounded-lg font-bold text-[9px] flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Daily +{problem.credits} pts
              </span>
            )}
            <div className="h-4 w-px bg-border hidden sm:block" />
            <select 
              value={language} 
              onChange={e => changeLang(e.target.value as Lang)}
              className="bg-card border border-border text-foreground text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            >
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <option key={l} value={l}>{LANG_LABELS[l]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pr-1">
            <button 
              onClick={() => resetCode()} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-all font-bold text-xs min-h-[36px]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
            <button 
              onClick={handleRun} 
              disabled={judging || running || !user} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-card text-primary hover:bg-muted/50 transition-all font-bold text-xs disabled:opacity-50 min-h-[36px]"
            >
              {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-primary" />}
              {running ? 'Running' : 'Run'}
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={judging || running || !user} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-xl font-bold text-xs hover:opacity-90 transition-all disabled:opacity-50 min-h-[36px] shadow-sm"
            >
              {judging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              {judging ? 'Judging' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Mobile Tab Selector (only visible on mobile) */}
        <div className="flex md:hidden border border-border rounded-xl bg-card p-1 shrink-0 gap-1 select-none">
          <button
            onClick={() => setMobileTab('problem')}
            className={cn(
              "flex-1 py-2 text-center rounded-lg text-xs transition-all font-semibold",
              mobileTab === 'problem' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Problem
          </button>
          <button
            onClick={() => setMobileTab('code')}
            className={cn(
              "flex-1 py-2 text-center rounded-lg text-xs transition-all font-semibold",
              mobileTab === 'code' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Code
          </button>
          <button
            onClick={() => setMobileTab('output')}
            className={cn(
              "flex-1 py-2 text-center rounded-lg text-xs transition-all font-semibold",
              mobileTab === 'output' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Console
          </button>
        </div>

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4 pb-2">
          
          {/* Left Pane: Problem Description */}
          <section className={cn(
            "w-full md:w-1/4 md:min-w-[300px] flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden flex-shrink-0 transition-all duration-200",
            mobileTab === 'problem' ? 'flex' : 'hidden md:flex'
          )}>
            <div className="h-10 border-b border-border flex justify-between items-center px-4 bg-muted/20 shrink-0 select-none">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <FileText className="w-4 h-4 text-primary" /> Description
              </span>
              <span className={cn("px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider", DIFF_COLORS[problem.difficulty])}>
                {problem.difficulty}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="text-sm font-extrabold text-foreground">{problem.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line text-pretty">
                {problem.description}
              </p>
              
              {problem.examples.map((ex, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground select-none">Example {i + 1}:</h4>
                  <div className="bg-muted/40 border border-border rounded-xl p-3.5 font-mono text-[11px] text-foreground space-y-1 shadow-inner">
                    <p><strong className="text-muted-foreground">Input:</strong> {ex.input}</p>
                    <p><strong className="text-muted-foreground">Output:</strong> {ex.output}</p>
                    {ex.explanation && <p className="text-muted-foreground mt-1.5 text-[10px] leading-normal font-sans">Explanation: {ex.explanation}</p>}
                  </div>
                </div>
              ))}
              
              {problem.constraints && problem.constraints.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-foreground select-none">Constraints:</h4>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                    {problem.constraints.map((c, i) => <li key={i}><code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">{c}</code></li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Middle Pane: Code Editor */}
          <section className={cn(
            "flex-1 md:flex-[1.5] bg-neutral-900 border border-border rounded-xl flex flex-col overflow-hidden md:min-w-[300px] shadow-sm",
            mobileTab === 'code' ? 'flex' : 'hidden md:flex'
          )}>
            <div className="h-10 border-b border-neutral-800 bg-neutral-950 flex items-center px-4 shrink-0 select-none">
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-primary" />
                solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'c'}
              </span>
            </div>
            <div className="flex-1 overflow-auto flex relative bg-neutral-900">
              {/* Line Numbers Fake */}
              <div className="w-12 bg-neutral-950 border-r border-neutral-800 text-neutral-600 font-mono text-[13px] text-right pr-3.5 pt-4 flex flex-col select-none shrink-0 overflow-hidden" aria-hidden="true">
                 {Array.from({length: 40}).map((_, i) => <span key={i} className="h-[21px]">{i + 1}</span>)}
              </div>
              <textarea
                className="w-full h-full p-4 pt-4 bg-transparent text-neutral-200 font-mono text-[13px] resize-none outline-none leading-[21px] selection:bg-primary/20 selection:text-white"
                value={code}
                onChange={e => {
                  const val = e.target.value;
                  setCode(val);
                  if (storageKey) {
                    localStorage.setItem(storageKey, val);
                  }
                }}
                spellCheck={false}
                style={{ fontFamily: '"Fira Code", "JetBrains Mono", monospace', tabSize: 4 }}
              />
            </div>
          </section>

          {/* Right Pane: Console/Output */}
          <section className={cn(
            "w-full md:w-1/4 md:min-w-[300px] flex flex-col bg-card rounded-xl overflow-hidden flex-shrink-0 relative border border-border shadow-sm",
            mobileTab === 'output' ? 'flex' : 'hidden md:flex'
          )}>
            <div className="h-10 border-b border-border flex px-2 gap-1 bg-muted/10 shrink-0 relative z-10 select-none">
              <button 
                onClick={() => setActiveTab('output')}
                className={cn(
                  "text-xs font-bold pb-1 px-4 mt-1 border-b-2 transition-all flex items-center gap-1.5",
                  activeTab === 'output' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
                )}
              >
                <Terminal className="w-4 h-4" /> Output
              </button>
              <button 
                onClick={() => setActiveTab('input')}
                className={cn(
                  "text-xs font-bold pb-1 px-4 mt-1 border-b-2 transition-all flex items-center gap-1.5",
                  activeTab === 'input' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
                )}
              >
                <Keyboard className="w-4 h-4" /> Custom Input
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 relative z-10">
              
              {activeTab === 'input' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 select-none">
                    <input 
                      type="checkbox" 
                      id="customInputCheck"
                      checked={useCustomInput}
                      onChange={e => setUseCustomInput(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 shadow-sm"
                    />
                    <label htmlFor="customInputCheck" className="text-muted-foreground text-xs font-bold cursor-pointer select-none">
                      Use Custom Input
                    </label>
                  </div>
                  {useCustomInput && (
                    <textarea
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      placeholder="Type custom stdin here..."
                      className="w-full h-32 p-3 bg-muted/40 border border-border rounded-xl font-mono text-xs text-foreground focus:outline-none focus:border-primary resize-none shadow-inner"
                    />
                  )}
                </div>
              )}

              {activeTab === 'output' && (
                <div className="space-y-4">
                  {!result && !judging && !running && (
                    <div className="text-center py-10 text-muted-foreground select-none">
                      <Terminal className="w-8 h-8 opacity-30 mx-auto mb-2" />
                      <p className="text-xs">Run or Submit code to see results</p>
                    </div>
                  )}

                  {(judging || running) && (
                    <div className="space-y-3 select-none">
                      {[1, 2].map(i => (
                        <Loading key={i} variant="skeleton" className="h-16 w-full rounded-xl" />
                      ))}
                      <p className="text-center text-xs text-muted-foreground font-semibold animate-pulse">
                        {running ? 'Running code...' : 'Running tests...'}
                      </p>
                    </div>
                  )}

                  {result && !judging && !running && (
                    <div className="space-y-4">
                      
                      {/* Credits banner */}
                      {result.creditsAwarded > 0 && (
                        <div className="p-4 rounded-xl border border-chart-3/30 bg-chart-3/5 text-center space-y-1 shadow-sm select-none">
                          <Sparkles className="w-6 h-6 text-chart-3 mx-auto animate-pulse" />
                          <p className="font-bold text-chart-3 text-xs">+{result.creditsAwarded} Credits Earned!</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Daily challenge complete</p>
                        </div>
                      )}

                      {/* Run Only Results */}
                      {result.run_only && (
                        <div className="space-y-3 font-mono text-xs">
                          <div className="flex gap-4 text-[10px] text-muted-foreground px-1 border-b border-border pb-2 select-none">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {result.time_ms.toFixed(0)}ms</span>
                            <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {result.memory_kb > 0 ? `${result.memory_kb}KB` : '—'}</span>
                          </div>
                          
                          {result.compileError && (
                            <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
                              <div className="flex items-center gap-1.5 text-destructive font-sans font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Compilation Error</span>
                              </div>
                              <pre className="text-destructive/80 text-[10px] whitespace-pre-wrap">{result.compileError}</pre>
                            </div>
                          )}

                          {!result.compileError && (
                            <>
                              {result.stdout && (
                                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                                  <div className="text-[10px] text-muted-foreground font-bold font-sans select-none">Standard Output:</div>
                                  <pre className="text-foreground whitespace-pre-wrap">{result.stdout}</pre>
                                </div>
                              )}
                              {result.stderr && (
                                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1">
                                  <div className="text-[10px] text-destructive font-bold font-sans select-none">Standard Error:</div>
                                  <pre className="text-destructive/80 whitespace-pre-wrap">{result.stderr}</pre>
                                </div>
                              )}
                              {!result.stdout && !result.stderr && (
                                <div className="text-center py-4 text-muted-foreground italic font-sans select-none">
                                  (Code executed successfully with no output)
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Summary */}
                      {!result.run_only && (
                        <div className={cn(
                          "p-3 rounded-xl border font-bold flex items-center gap-2 text-xs",
                          result.verdict === 'accepted' 
                            ? 'border-success/30 bg-success/5 text-success' 
                            : 'border-destructive/30 bg-destructive/5 text-destructive'
                        )}>
                          {(() => {
                            const VerdictIcon = VERDICT_META[result.verdict]?.icon || AlertTriangle;
                            return <VerdictIcon className="w-4.5 h-4.5" />;
                          })()}
                          <span>{VERDICT_META[result.verdict]?.label ?? result.verdict}</span>
                          <span className="ml-auto text-[10px] font-semibold opacity-80 select-none">
                            {result.passedCount}/{result.totalCount} passed
                          </span>
                        </div>
                      )}

                      {/* Stats */}
                      {result.verdict === 'accepted' && !result.run_only && (
                        <div className="flex gap-4 text-[10px] text-muted-foreground px-1 select-none">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {result.time_ms.toFixed(0)}ms</span>
                          <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {(result.memory_kb / 1024).toFixed(1)}MB</span>
                        </div>
                      )}

                      {/* Compile error */}
                      {result.compileError && !result.run_only && (
                        <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
                          <div className="flex items-center gap-1.5 text-destructive font-bold">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Compilation Error</span>
                          </div>
                          <pre className="text-destructive/80 text-[10px] whitespace-pre-wrap font-mono">{result.compileError}</pre>
                        </div>
                      )}

                      {/* Test Cases */}
                      {!result.run_only && result.testResults.map((t, i) => {
                        const pass = t.verdict === 'accepted';
                        return (
                          <div key={i} className={cn(
                            "p-3 rounded-xl border space-y-2",
                            pass ? 'border-success/15 bg-success/5' : 'border-destructive/15 bg-destructive/5'
                          )}>
                            <div className={cn(
                              "flex justify-between items-center font-bold text-xs",
                              pass ? 'text-success' : 'text-destructive'
                            )}>
                              <div className="flex items-center gap-1">
                                {pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                <span>Test Case {t.case}</span>
                              </div>
                              {!pass && <span className="text-[9px] bg-destructive/25 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{VERDICT_META[t.verdict]?.label ?? t.verdict}</span>}
                            </div>
                            <div className="text-muted-foreground grid grid-cols-[60px_1fr] gap-x-2 gap-y-1 text-[10px] font-mono overflow-x-auto scrollbar-hide">
                              <span>Input:</span><span className="text-foreground overflow-x-auto whitespace-pre-wrap break-all">{t.input}</span>
                              <span>Expected:</span><span className="text-foreground overflow-x-auto whitespace-pre-wrap break-all">{t.expectedOutput}</span>
                              {!pass && (
                                <>
                                  <span className="text-destructive mt-1 font-bold">Output:</span>
                                  <span className="text-destructive mt-1 overflow-x-auto whitespace-pre-wrap break-all bg-destructive/10 px-2 py-0.5 rounded">{t.actualOutput || '(empty)'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
