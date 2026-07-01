import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logUserActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';

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
const MONACO_LANG_MAP: Record<Lang, string> = {
  python: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp', c: 'c'
};

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

export default function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingP, setLoadingP] = useState(true);
  const [language, setLanguage] = useState<Lang>('javascript');
  const [code, setCode] = useState('');
  const [judging, setJudging] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JudgeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'ai'>('output');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'output'>('problem');
  
  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase
      .from('coding_problems')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Problem not found");
          navigate('/coding/practice');
          return;
        }
        setProblem(data as Problem);
        setLoadingP(false);
      });
  }, [id, navigate]);

  const storageKey = problem ? `code_${user?.id || 'default'}_${problem.id}_${language}` : '';

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

  const resetCode = useCallback(() => {
    if (!problem) return;
    const starter = problem.starter_code[language] ?? '';
    setCode(starter);
    if (storageKey) localStorage.setItem(storageKey, starter);
    setResult(null);
  }, [problem, language, storageKey]);

  const changeLang = (lang: Lang) => {
    setLanguage(lang);
    setResult(null);
  };

  const saveCodeToDB = async () => {
    if (!user || !problem) return;
    await supabase.from('saved_code').upsert({
      user_id: user.id,
      problem_id: problem.id,
      language,
      code,
      updated_at: new Date().toISOString()
    });
    toast.success("Code saved to cloud");
  };

  const callAI = async (action: string) => {
    if (!problem) return;
    setAiLoading(true);
    setActiveTab('ai');
    setMobileTab('output');
    setAiResponse('');
    
    try {
      const res = await fetch('/api/coding-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          code,
          language,
          problemTitle: problem.title,
          problemDescription: problem.description,
          error: result?.compileError || ''
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiResponse(data.result);
    } catch (e: any) {
      toast.error('AI Error', { description: e.message });
      setAiResponse('Failed to get response from AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRun = async () => {
    if (!user) { toast.error('Please log in to run code'); return; }
    if (!code.trim()) { toast.error('Please write some code first'); return; }
    setRunning(true); setResult(null); setActiveTab('output'); setMobileTab('output');

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
      if (data.compile && data.compile.code !== 0) compileError = data.compile.output || data.compile.stderr;

      setResult({
        verdict: 'accepted', testResults: [], compileError,
        time_ms: data.run?.cpu_time ?? 0,
        memory_kb: data.run?.memory ? Math.round(data.run.memory / 1024) : 0,
        creditsAwarded: 0, passedCount: 0, totalCount: 0, run_only: true,
        stdout: data.run?.stdout || '', stderr: data.run?.stderr || '',
      });
      if (compileError) toast.error('Compilation Error');
      else {
        toast.success('Execution finished');
        void logUserActivity(user.id, 'code_run', `Ran code for: ${problem?.title}`);
      }
    } catch (err: any) { toast.error('Execution failed', { description: err.message }); }
    finally { setRunning(false); }
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Please log in to submit code'); return; }
    if (!problem) return;
    if (!code.trim()) { toast.error('Please write some code first'); return; }

    setJudging(true); setResult(null); setActiveTab('output'); setMobileTab('output');

    try {
      const testCases = problem.test_cases || [];
      const testResults: TestResult[] = [];
      let compileError = null;
      let overallVerdict = 'accepted';
      let totalTimeMs = 0;
      let maxMemory = 0;

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
      let creditsEarned = 0;
      
      // Save submission
      const { data: subData } = await supabase.from('submissions').insert({
        user_id: user.id,
        problem_id: problem.id,
        language,
        source_code: code,
        verdict: overallVerdict,
        time_ms: totalTimeMs,
        memory_kb: maxMemory,
        credits_awarded: overallVerdict === 'accepted' ? problem.credits : 0
      }).select('credits_awarded').single();
      
      if (subData) creditsEarned = subData.credits_awarded;

      // Update XP if accepted
      if (overallVerdict === 'accepted') {
        const { data: prog } = await supabase.from('coding_progress').select('*').eq('user_id', user.id).single();
        let newXp = (prog?.total_xp || 0) + problem.credits;
        let newSolved = (prog?.problems_solved || 0) + 1;
        let diffCol = problem.difficulty === 'Beginner' ? 'easy_solved' : problem.difficulty === 'Intermediate' ? 'medium_solved' : 'hard_solved';
        
        await supabase.from('coding_progress').upsert({
          user_id: user.id,
          problems_solved: newSolved,
          total_xp: newXp,
          [diffCol]: (prog?.[diffCol] || 0) + 1,
          updated_at: new Date().toISOString()
        });
      }

      setResult({
        verdict: overallVerdict, testResults, compileError,
        time_ms: totalTimeMs, memory_kb: maxMemory,
        creditsAwarded: creditsEarned, passedCount, totalCount: testResults.length
      });

      if (overallVerdict === 'accepted') {
        toast.success(`All ${testResults.length} test cases passed!`);
        void logUserActivity(user.id, 'code_run', `Successfully solved: ${problem?.title}`);
      } else if (overallVerdict === 'compilation_error') {
        toast.error('Compilation Error');
      } else {
        toast.error(`${VERDICT_META[overallVerdict]?.label ?? 'Failed'} — ${passedCount}/${testResults.length} tests passed`);
      }
    } catch (err: any) { toast.error('Submission failed', { description: err.message }); }
    finally { setJudging(false); }
  };

  if (loadingP) {
    return (
      <AppLayout title="Coding Practice">
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden gap-4 w-full p-4">
          <Skeleton className="flex-1 bg-surface rounded-lg border shadow-sm min-w-[300px]" />
          <Skeleton className="flex-[1.5] bg-[#1e1e1e] rounded-lg shadow-sm min-w-[400px]" />
          <Skeleton className="flex-1 glass-panel rounded-lg shadow-sm min-w-[300px]" />
        </div>
      </AppLayout>
    );
  }

  if (!problem) return null;

  return (
    <AppLayout title={problem.title}>
      <div className="flex flex-col h-[calc(100vh-80px)] w-full gap-3 relative md:px-2 py-2">
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-surface/80 backdrop-blur-md border border-outline-variant/60 rounded-lg p-2 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/coding/practice')} className="text-on-surface-variant hover:text-primary transition-colors flex items-center p-1 rounded-full hover:bg-primary/10">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h2 className="font-bold text-on-surface truncate max-w-[200px]">{problem.title}</h2>
            <Badge className={`px-2 py-0.5 text-[10px] ${DIFF_COLORS[problem.difficulty]}`}>{problem.difficulty}</Badge>
            {problem.is_daily && (
              <Badge className="bg-tertiary-container/20 text-tertiary px-2 py-0.5 text-[10px] flex items-center gap-1 border-0">
                <span className="material-symbols-outlined text-[12px]">local_fire_department</span> Daily
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
             <select 
              value={language} 
              onChange={e => changeLang(e.target.value as Lang)}
              className="bg-surface-container-low border border-outline-variant/60 text-on-surface text-sm rounded px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none min-w-[120px]"
            >
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <option key={l} value={l}>{LANG_LABELS[l]}</option>
              ))}
            </select>
            <button onClick={saveCodeToDB} className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-outline-variant/60 hover:bg-surface-variant transition-colors text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">save</span> Save
            </button>
            <button onClick={resetCode} className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-outline-variant/60 hover:bg-surface-variant transition-colors text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">refresh</span> Reset
            </button>
            <button onClick={handleRun} disabled={judging || running} className="flex items-center gap-1 px-4 py-1.5 rounded-md bg-surface border border-primary text-primary font-bold hover:bg-primary/10 transition-colors disabled:opacity-50 text-sm">
              {running ? <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span> : <span className="material-symbols-outlined text-[16px]">play_arrow</span>} Run
            </button>
            <button onClick={handleSubmit} disabled={judging || running} className="flex items-center gap-1 bg-primary text-on-primary px-4 py-1.5 rounded-md font-bold hover:brightness-110 transition-colors disabled:opacity-50 text-sm shadow-md">
              {judging ? <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span> : <span className="material-symbols-outlined text-[16px]">publish</span>} Submit
            </button>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="flex md:hidden border border-outline-variant/60 rounded-lg bg-surface p-1 shrink-0 gap-1">
          {['problem', 'code', 'output'].map(t => (
            <button
              key={t}
              onClick={() => setMobileTab(t as any)}
              className={`flex-1 py-1.5 text-center rounded-md text-sm capitalize transition-colors ${mobileTab === t ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-on-surface-variant'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4 pb-2">
          
          {/* Left Pane: Problem Description */}
          <section className={`w-full md:w-1/3 flex flex-col bg-surface rounded-lg border border-outline-variant/60 shadow-sm overflow-hidden flex-shrink-0 transition-all ${mobileTab === 'problem' ? 'flex' : 'hidden md:flex'}`}>
            <div className="h-12 border-b border-outline-variant/60 flex items-center px-4 bg-surface-container-lowest shrink-0 gap-4 overflow-x-auto custom-scrollbar">
              <button className="font-bold text-primary border-b-2 border-primary h-full px-2 flex items-center gap-2 whitespace-nowrap">
                <span className="material-symbols-outlined text-[18px]">description</span> Description
              </button>
              {/* AI Actions */}
              <button onClick={() => callAI('explain')} className="text-on-surface-variant hover:text-primary transition-colors text-xs flex items-center gap-1 whitespace-nowrap">
                <span className="material-symbols-outlined text-[14px]">psychology</span> Explain
              </button>
              <button onClick={() => callAI('hint')} className="text-on-surface-variant hover:text-primary transition-colors text-xs flex items-center gap-1 whitespace-nowrap">
                <span className="material-symbols-outlined text-[14px]">lightbulb</span> Hint
              </button>
              <button onClick={() => callAI('complexity')} className="text-on-surface-variant hover:text-primary transition-colors text-xs flex items-center gap-1 whitespace-nowrap">
                <span className="material-symbols-outlined text-[14px]">speed</span> Complexity
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 text-sm text-on-surface-variant custom-scrollbar">
              <h3 className="text-xl font-bold font-display text-on-surface mb-4">{problem.title}</h3>
              <div className="mb-6 leading-relaxed whitespace-pre-line text-pretty prose prose-sm dark:prose-invert">
                {problem.description}
              </div>
              
              {problem.examples.map((ex, i) => (
                <div key={i} className="mb-6">
                  <h4 className="font-bold text-on-surface mb-2">Example {i + 1}:</h4>
                  <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-3 font-mono text-xs shadow-inner">
                    <p><strong className="text-on-surface-variant">Input:</strong> <span className="text-on-surface">{ex.input}</span></p>
                    <p className="mt-1"><strong className="text-on-surface-variant">Output:</strong> <span className="text-on-surface">{ex.output}</span></p>
                    {ex.explanation && <p className="mt-2 pt-2 border-t border-outline-variant/30 font-sans text-on-surface-variant text-[11px]">Explanation: {ex.explanation}</p>}
                  </div>
                </div>
              ))}
              
              {problem.constraints.length > 0 && (
                <div className="mb-4 pt-4 border-t border-outline-variant/30">
                  <h4 className="font-bold text-on-surface mb-3">Constraints:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {problem.constraints.map((c, i) => <li key={i}><code className="bg-surface-variant/50 px-1 py-0.5 rounded text-xs">{c}</code></li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Middle Pane: Code Editor */}
          <section className={`flex-1 bg-[#1e1e1e] rounded-lg border border-outline-variant/60 flex flex-col overflow-hidden shadow-sm ${mobileTab === 'code' ? 'flex' : 'hidden md:flex'}`}>
            <div className="h-10 border-b border-[#333] bg-[#252526] flex items-center justify-between px-4 shrink-0">
              <span className="text-xs text-[#cccccc] flex items-center gap-2 font-mono">
                <span className="material-symbols-outlined text-[16px] text-[#569cd6]">code</span>
                solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'c'}
              </span>
              <div className="flex gap-2">
                <button onClick={() => callAI('debug')} className="text-xs text-error/80 hover:text-error transition-colors flex items-center gap-1" title="Debug with AI">
                  <span className="material-symbols-outlined text-[14px]">bug_report</span> Debug
                </button>
                <button onClick={() => callAI('optimize')} className="text-xs text-[#4ade80]/80 hover:text-[#4ade80] transition-colors flex items-center gap-1" title="Optimize with AI">
                  <span className="material-symbols-outlined text-[14px]">bolt</span> Optimize
                </button>
              </div>
            </div>
            <div className="flex-1 w-full relative">
              <Editor
                height="100%"
                defaultLanguage={MONACO_LANG_MAP[language]}
                language={MONACO_LANG_MAP[language]}
                theme="vs-dark"
                value={code}
                onChange={(val) => {
                  setCode(val || '');
                  if (storageKey) localStorage.setItem(storageKey, val || '');
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  wordWrap: 'on',
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                }}
              />
            </div>
          </section>

          {/* Right Pane: Console/Output */}
          <section className={`w-full md:w-1/3 flex flex-col glass-panel rounded-lg overflow-hidden flex-shrink-0 relative border border-outline-variant/60 shadow-sm ${mobileTab === 'output' ? 'flex' : 'hidden md:flex'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-tertiary/5 to-primary/5 z-0 pointer-events-none"></div>
            
            <div className="h-10 border-b border-outline-variant/60 flex px-2 gap-1 bg-surface/40 backdrop-blur-md shrink-0 relative z-10">
              {['output', 'input', 'ai'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`text-sm pb-1 px-3 mt-1 border-b-2 transition-colors flex items-center gap-1 capitalize ${activeTab === tab ? 'text-primary border-primary font-bold' : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tab === 'output' ? 'terminal' : tab === 'input' ? 'keyboard' : 'smart_toy'}
                  </span>
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 relative z-10 custom-scrollbar">
              
              {activeTab === 'input' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" id="customInputCheck" checked={useCustomInput}
                      onChange={e => setUseCustomInput(e.target.checked)}
                      className="rounded border-outline-variant/60 text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="customInputCheck" className="text-sm text-on-surface cursor-pointer select-none">Use Custom Input</label>
                  </div>
                  {useCustomInput && (
                    <textarea
                      value={customInput} onChange={e => setCustomInput(e.target.value)}
                      placeholder="Type custom stdin here..."
                      className="w-full h-32 p-3 bg-surface-container border border-outline-variant/60 rounded-md font-mono text-xs focus:ring-2 focus:ring-primary/50 outline-none resize-none shadow-inner text-on-surface"
                    />
                  )}
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-4">
                  {aiLoading ? (
                    <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 text-primary font-medium animate-pulse mb-4">
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Gemini is analyzing...
                      </div>
                      <Skeleton className="h-4 w-full bg-primary/10" />
                      <Skeleton className="h-4 w-5/6 bg-primary/10" />
                      <Skeleton className="h-4 w-4/6 bg-primary/10" />
                    </div>
                  ) : aiResponse ? (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-sm">
                      <div className="flex items-center gap-2 text-primary font-bold mb-3">
                        <span className="material-symbols-outlined">psychology</span> AI Assistant
                      </div>
                      <div className="whitespace-pre-line text-on-surface-variant leading-relaxed">
                        {aiResponse}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[32px] opacity-30 mb-2">smart_toy</span>
                      <p className="text-xs">Click AI actions in the toolbar to get help</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'output' && (
                <>
                  {!result && !judging && !running && (
                    <div className="text-center py-10 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[32px] opacity-30 mb-2">science</span>
                      <p className="text-xs">Run or Submit code to see results</p>
                    </div>
                  )}

                  {(judging || running) && (
                    <div className="space-y-3 animate-pulse">
                      {[1, 2].map(i => <div key={i} className="h-20 rounded bg-surface-variant/50 border border-outline-variant/30"></div>)}
                      <p className="text-center text-xs text-on-surface-variant">{running ? 'Running code...' : 'Running tests...'}</p>
                    </div>
                  )}

                  {result && !judging && !running && (
                    <div className="space-y-3">
                      {result.run_only ? (
                        <div className="space-y-3 font-mono text-xs">
                          {result.compileError ? (
                            <div className="p-3 rounded border border-error/30 bg-error/10">
                              <div className="text-error font-sans font-bold flex items-center gap-1 mb-2">
                                <span className="material-symbols-outlined text-[16px]">error</span> Compile Error
                              </div>
                              <pre className="text-error/80 whitespace-pre-wrap">{result.compileError}</pre>
                            </div>
                          ) : (
                            <>
                              {result.stdout && (
                                <div className="p-3 rounded border border-outline-variant/30 bg-surface-container">
                                  <div className="font-sans font-bold text-on-surface-variant mb-1 text-[10px]">Stdout:</div>
                                  <pre className="text-on-surface whitespace-pre-wrap">{result.stdout}</pre>
                                </div>
                              )}
                              {result.stderr && (
                                <div className="p-3 rounded border border-error/30 bg-error/10">
                                  <div className="font-sans font-bold text-error mb-1 text-[10px]">Stderr:</div>
                                  <pre className="text-error/80 whitespace-pre-wrap">{result.stderr}</pre>
                                </div>
                              )}
                              {!result.stdout && !result.stderr && (
                                <div className="text-center text-on-surface-variant py-4 italic font-sans">Execution completed with no output</div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className={`p-3 rounded border font-bold flex items-center gap-2 ${result.verdict === 'accepted' ? 'border-[#2f3b2f] bg-[#1a2e1e] text-[#4ade80]' : 'border-[#3b2f2f] bg-[#2e1a1a] text-error'}`}>
                            <span className="material-symbols-outlined">{VERDICT_META[result.verdict]?.icon}</span>
                            <span>{VERDICT_META[result.verdict]?.label ?? result.verdict}</span>
                            <span className="ml-auto text-xs font-normal opacity-80">{result.passedCount}/{result.totalCount} passed</span>
                          </div>

                          {result.compileError && (
                            <div className="p-3 rounded border border-error/30 bg-error/10 text-xs font-mono">
                               <pre className="text-error/80 whitespace-pre-wrap">{result.compileError}</pre>
                            </div>
                          )}

                          {result.testResults.map((t, i) => {
                            const pass = t.verdict === 'accepted';
                            return (
                              <div key={i} className={`p-3 rounded border ${pass ? 'border-[#2f3b2f] bg-[#1a2e1e]' : 'border-[#3b2f2f] bg-[#2e1a1a]'}`}>
                                <div className={`flex justify-between items-center mb-2 ${pass ? 'text-[#4ade80]' : 'text-error'}`}>
                                  <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">{pass ? 'check_circle' : 'cancel'}</span>
                                    <span className="font-bold text-xs">Test Case {t.case}</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-[65px_1fr] gap-x-2 gap-y-1 text-[11px] font-mono text-on-surface-variant">
                                  <span>Input:</span><span className="text-on-surface break-all">{t.input}</span>
                                  <span>Expected:</span><span className="text-on-surface break-all">{t.expectedOutput}</span>
                                  {!pass && (
                                    <>
                                      <span className="text-error mt-1">Output:</span>
                                      <span className="text-error mt-1 break-all bg-error/10 px-1 rounded">{t.actualOutput || '(empty)'}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
