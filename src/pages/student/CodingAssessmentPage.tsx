import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/db/firebase';
import { collection, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { logUserActivity } from '@/lib/activity';
import { checkAndAwardCertificate } from '@/lib/progress';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Play, 
  Send, 
  FileText, 
  Terminal, 
  Keyboard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Award, 
  Loader2 
} from 'lucide-react';

type Lang = 'python' | 'javascript' | 'java' | 'cpp' | 'c';

interface Problem {
  id: string;
  course_id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  problem_statement: string;
  constraints: string[];
  starter_code: Record<Lang, string>;
  test_cases?: { input: string; expected_output: string; is_hidden: boolean }[];
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
  Beginner:     'bg-primary/10 text-primary border-primary/10',
  Intermediate: 'bg-chart-4/10 text-chart-4 border-chart-4/10',
  Advanced:     'bg-destructive/10 text-destructive border-destructive/10',
};

const VERDICT_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  accepted:             { label: 'Accepted',         color: 'text-emerald-500', icon: CheckCircle2 },
  wrong_answer:         { label: 'Wrong Answer',     color: 'text-destructive', icon: XCircle },
  time_limit_exceeded:  { label: 'TLE',              color: 'text-amber-500',   icon: AlertCircle },
  compilation_error:    { label: 'Compile Error',    color: 'text-destructive', icon: AlertCircle },
  runtime_error:        { label: 'Runtime Error',    color: 'text-destructive', icon: XCircle },
  pending:              { label: 'Pending',          color: 'text-muted-foreground', icon: Loader2 },
};

export default function CodingAssessmentPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
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
  const [customInput, setCustomInput]       = useState('');

  const [attempts, setAttempts]     = useState(0);
  const [mobileTab, setMobileTab]   = useState<'problem' | 'code' | 'output'>('problem');
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    if (!courseId) return;
    const fetchProblems = async () => {
      try {
        const q = query(
          collection(db, 'coding_questions'),
          where('course_id', '==', courseId),
          orderBy('sort_order')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Problem));
        
        if (!data || data.length === 0) {
           toast.error("No coding questions found for this assessment.");
           navigate(`/courses/${courseId}`);
           return;
        }
        setProblems(data);
        setLoadingP(false);
      } catch (err) {
        toast.error("Error fetching coding questions.");
        console.error(err);
        navigate(`/courses/${courseId}`);
      }
    };
    fetchProblems();
  }, [courseId, navigate]);

  const problem = problems[idx];
  const storageKey = problem ? `code_assess_${user?.id || 'default'}_${problem.id}_${language}` : '';

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
            case: i + 1, input: tc.input, expectedOutput: tc.expected_output,
            actualOutput: compileError ?? '', verdict: 'compilation_error',
            time: '0ms', memory: 0
          });
          break;
        }

        const runOutput = data.run?.output || '';
        const actualOutputTrimmed = runOutput.trim();
        const expectedOutputTrimmed = tc.expected_output.trim();
        
        let verdict = 'accepted';
        if (data.run?.signal === 'SIGKILL') verdict = 'time_limit_exceeded';
        else if (data.run?.code !== 0) verdict = 'runtime_error';
        else if (actualOutputTrimmed !== expectedOutputTrimmed) verdict = 'wrong_answer';

        testResults.push({
          case: i + 1, input: tc.input, expectedOutput: tc.expected_output,
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
      setAttempts(a => a + 1);

      if (overallVerdict === 'accepted') {
        toast.success(`All ${testResults.length} test cases passed!`);
        void logUserActivity(user.id, 'code_run', `Successfully completed coding assessment: ${problem?.title}`);
        
        await addDoc(collection(db, 'assessment_attempts'), {
          user_id: user.id,
          course_id: courseId!,
          score_percentage: 100,
          is_passed: true,
          attempt_number: attempts + 1,
          metrics: { type: 'coding', problem: problem.title },
          created_at: new Date().toISOString()
        });
        
        await checkAndAwardCertificate(user.id, courseId!);

      } else if (overallVerdict === 'compilation_error') {
        toast.error(`Compilation Error (Attempt ${attempts + 1}/${MAX_ATTEMPTS})`, { description: 'Fix the syntax errors and try again.' });
      } else {
        toast.error(`${VERDICT_META[overallVerdict]?.label ?? 'Failed'} — ${passedCount}/${testResults.length} tests passed (Attempt ${attempts + 1}/${MAX_ATTEMPTS})`);
      }
      
      if (attempts + 1 >= MAX_ATTEMPTS && overallVerdict !== 'accepted') {
         toast.error("Maximum attempts reached. Assessment failed.");
         await addDoc(collection(db, 'assessment_attempts'), {
            user_id: user.id,
            course_id: courseId!,
            score_percentage: Math.round((passedCount / testResults.length) * 100),
            is_passed: false,
            attempt_number: attempts + 1,
            metrics: { type: 'coding', problem: problem.title },
            created_at: new Date().toISOString()
         });
      }
    } catch (err: any) {
      toast.error('Submission failed', { description: err.message });
    } finally {
      setJudging(false);
    }
  };

  if (loadingP) {
    return (
      <AppLayout title="Coding Assessment">
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden gap-4 w-full p-4">
          <Skeleton className="flex-1 bg-card rounded-2xl border border-border shadow-sm min-w-[300px]" />
          <Skeleton className="flex-[1.5] bg-[#1e1e1e] rounded-2xl border border-border shadow-sm min-w-[400px]" />
          <Skeleton className="flex-1 bg-card rounded-2xl border border-border shadow-sm min-w-[300px]" />
        </div>
      </AppLayout>
    );
  }

  if (!problem) {
    return (
      <AppLayout title="Coding Assessment">
        <div className="text-center py-20 text-muted-foreground h-[calc(100vh-80px)] flex flex-col items-center justify-center">
          <Terminal className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-bold text-foreground">No problems available</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Coding Assessment">
      <div className="flex flex-col h-[calc(100vh-80px)] w-full gap-3 relative px-4 md:px-6 py-4 select-none">
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-card border border-border rounded-2xl p-3 shrink-0 z-10 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 pl-1">
            <button 
              onClick={() => navigate(`/courses/${courseId}`)} 
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 min-h-[38px] md:min-h-[auto]"
            >
              <ArrowLeft className="h-4 w-4" /> <span>Course</span>
            </button>
            
            <div className="h-4 w-px bg-border hidden sm:block" />
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIdx(Math.max(0, idx - 1))} 
                disabled={idx === 0}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 p-1"
                aria-label="Previous Problem"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-muted-foreground min-w-[40px] text-center">
                {idx + 1} / {problems.length}
              </span>
              <button 
                onClick={() => setIdx(Math.min(problems.length - 1, idx + 1))} 
                disabled={idx === problems.length - 1}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 p-1"
                aria-label="Next Problem"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="h-4 w-px bg-border hidden sm:block" />
            
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Attempts:</span>
              <span className={`text-xs font-bold ${attempts >= MAX_ATTEMPTS ? 'text-destructive' : 'text-primary'}`}>
                {attempts} / {MAX_ATTEMPTS}
              </span>
            </div>
            
            <div className="h-4 w-px bg-border hidden sm:block" />
            
            <select 
              value={language} 
              onChange={e => changeLang(e.target.value as Lang)}
              className="bg-background border border-border text-foreground text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[38px] md:min-h-[auto]"
            >
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <option key={l} value={l}>{LANG_LABELS[l]}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 pr-1">
            <button 
              onClick={() => resetCode()} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold hover:bg-muted/30 transition-all min-h-[38px] md:min-h-[auto]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> <span>Reset</span>
            </button>
            
            <button 
              onClick={handleRun} 
              disabled={judging || running || !user} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background text-primary text-xs font-bold hover:bg-muted/30 transition-all disabled:opacity-50 min-h-[38px] md:min-h-[auto]"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              <span>{running ? 'Running' : 'Run'}</span>
            </button>
            
            <button 
              onClick={handleSubmit} 
              disabled={judging || running || attempts >= MAX_ATTEMPTS || !user} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-md shadow-primary/10 min-h-[38px] md:min-h-[auto]"
            >
              {judging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>{judging ? 'Evaluating' : 'Submit'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="flex md:hidden border border-border rounded-xl bg-card p-1 shrink-0 gap-1">
          {['problem', 'code', 'output'].map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab as any)}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all capitalize ${
                mobileTab === tab 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'output' ? 'Console' : tab}
            </button>
          ))}
        </div>

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4 pb-2">
          
          {/* Left Pane: Problem Description */}
          <section className={`w-full md:w-1/4 md:min-w-[300px] flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex-shrink-0 transition-all duration-200 ${
            mobileTab === 'problem' ? 'flex' : 'hidden md:flex'
          }`}>
            <div className="h-11 border-b border-border flex justify-between items-center px-4 bg-muted/40 shrink-0">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <FileText className="h-4 w-4 text-primary" /> <span>Description</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${DIFF_COLORS[problem.difficulty]}`}>
                {problem.difficulty}
              </span>
            </div>
            <div className="flex-grow overflow-y-auto p-5 text-xs text-muted-foreground space-y-4 leading-relaxed scrollbar-hide">
              <h3 className="text-sm font-bold text-foreground">{problem.title}</h3>
              <p className="whitespace-pre-line leading-relaxed text-pretty text-foreground/90">
                {problem.problem_statement}
              </p>
              
              {problem.constraints && problem.constraints.length > 0 && (
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-xs font-bold text-foreground mb-2">Constraints</h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground/80">
                    {problem.constraints.map((c, i) => (
                      <li key={i}><code className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground font-mono">{c}</code></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Middle Pane: Code Editor */}
          <section className={`flex-grow md:flex-[1.5] bg-[#1e1e1e] rounded-2xl border border-[#333] flex flex-col overflow-hidden md:min-w-[300px] shadow-sm ${
            mobileTab === 'code' ? 'flex' : 'hidden md:flex'
          }`}>
            <div className="h-11 border-b border-[#2d2d2d] bg-[#252526] flex items-center px-4 shrink-0 justify-between">
              <span className="text-[11px] font-bold text-[#cccccc] flex items-center gap-1.5 font-mono">
                <Terminal className="h-3.5 w-3.5 text-[#569cd6]" />
                <span>
                  solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'c'}
                </span>
              </span>
            </div>
            
            <div className="flex-grow overflow-auto flex relative bg-[#1e1e1e]">
              {/* Line Numbers */}
              <div className="w-10 bg-[#1e1e1e] border-r border-[#2d2d2d] text-[#858585] font-mono text-xs text-right pr-3.5 pt-4 flex flex-col select-none shrink-0 overflow-hidden" aria-hidden="true">
                 {Array.from({ length: 40 }).map((_, i) => (
                   <span key={i} className="h-[22px] leading-[22px]">{i + 1}</span>
                 ))}
              </div>
              
              <textarea
                className="flex-grow h-full p-4 bg-transparent text-[#d4d4d4] font-mono text-xs resize-none outline-none leading-[22px]"
                value={code}
                onChange={e => {
                  const val = e.target.value;
                  setCode(val);
                  if (storageKey) {
                    localStorage.setItem(storageKey, val);
                  }
                }}
                spellCheck={false}
                style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace', tabSize: 4 }}
              />
            </div>
          </section>

          {/* Right Pane: Console/Output */}
          <section className={`w-full md:w-1/4 md:min-w-[300px] flex flex-col bg-card rounded-2xl overflow-hidden flex-shrink-0 relative border border-border shadow-sm ${
            mobileTab === 'output' ? 'flex' : 'hidden md:flex'
          }`}>
            <div className="h-11 border-b border-border flex px-2 gap-1 bg-muted/20 shrink-0 relative z-10">
              <button 
                onClick={() => setActiveTab('output')}
                className={`text-xs font-bold pb-1 px-4 mt-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'output' 
                    ? 'text-primary border-primary' 
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" /> <span>Output</span>
              </button>
              <button 
                onClick={() => setActiveTab('input')}
                className={`text-xs font-bold pb-1 px-4 mt-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'input' 
                    ? 'text-primary border-primary' 
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Keyboard className="h-3.5 w-3.5" /> <span>Custom Input</span>
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 relative z-10 scrollbar-hide">
              
              {activeTab === 'input' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="customInputCheck"
                      checked={useCustomInput}
                      onChange={e => setUseCustomInput(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="customInputCheck" className="text-xs text-muted-foreground font-semibold cursor-pointer select-none">
                      Enable Custom Input
                    </label>
                  </div>
                  {useCustomInput && (
                    <textarea
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      placeholder="Type custom stdin here..."
                      className="w-full h-36 p-3 bg-background border border-border rounded-xl font-mono text-[11px] text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none shadow-inner"
                    />
                  )}
                </div>
              )}

              {activeTab === 'output' && (
                <>
                  {!result && !judging && !running && (
                    <div className="text-center py-12 text-muted-foreground/60">
                      <Terminal className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Run or Submit code to see results</p>
                    </div>
                  )}

                  {(judging || running) && (
                    <div className="space-y-3 animate-pulse py-4">
                      <div className="h-16 rounded-xl bg-muted border border-border" />
                      <div className="h-16 rounded-xl bg-muted border border-border" />
                      <p className="text-center text-xs text-muted-foreground">{running ? 'Running code...' : 'Running tests...'}</p>
                    </div>
                  )}

                  {result && !judging && !running && (
                    <div className="space-y-3">
                      
                      {result.creditsAwarded > 0 && (
                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center mb-4">
                          <Award className="h-6 w-6 text-primary mx-auto mb-1.5" />
                          <p className="font-bold text-primary text-xs">+{result.creditsAwarded} Credits Earned!</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Daily challenge complete</p>
                        </div>
                      )}

                      {/* Run Only Results */}
                      {result.run_only && (
                        <div className="space-y-3 font-mono text-xs">
                          <div className="flex gap-4 text-[10px] text-muted-foreground px-1 border-b border-border pb-2">
                            <span className="flex items-center gap-1">Time: {result.time_ms.toFixed(0)}ms</span>
                            <span className="flex items-center gap-1">Memory: {result.memory_kb > 0 ? `${result.memory_kb}KB` : '—'}</span>
                          </div>
                          
                          {result.compileError && (
                            <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5">
                              <div className="flex items-center gap-1.5 mb-2 text-destructive font-sans font-bold">
                                <AlertCircle className="h-4 w-4" />
                                <span>Compilation Error</span>
                              </div>
                              <pre className="text-destructive/80 text-[10px] whitespace-pre-wrap">{result.compileError}</pre>
                            </div>
                          )}

                          {!result.compileError && (
                            <>
                              {result.stdout && (
                                <div className="p-3 rounded-xl border border-border bg-background">
                                  <div className="text-[10px] text-muted-foreground font-bold mb-1.5 font-sans">Standard Output</div>
                                  <pre className="text-foreground whitespace-pre-wrap leading-relaxed">{result.stdout}</pre>
                                </div>
                              )}
                              {result.stderr && (
                                <div className="p-3 rounded-xl border border-destructive/25 bg-destructive/5">
                                  <div className="text-[10px] text-destructive font-bold mb-1.5 font-sans">Standard Error</div>
                                  <pre className="text-destructive/80 whitespace-pre-wrap leading-relaxed">{result.stderr}</pre>
                                </div>
                              )}
                              {!result.stdout && !result.stderr && (
                                <div className="text-center py-6 text-muted-foreground/60 italic font-sans text-xs">
                                  (Code executed successfully with no output)
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Submit Summary */}
                      {!result.run_only && (
                        <div className={`p-3.5 rounded-xl border font-bold flex items-center gap-2 text-xs ${
                          result.verdict === 'accepted' 
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' 
                            : 'border-destructive/20 bg-destructive/5 text-destructive'
                        }`}>
                          {result.verdict === 'accepted' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          <span className="capitalize">{VERDICT_META[result.verdict]?.label ?? result.verdict}</span>
                          <span className="ml-auto text-[10px] font-medium opacity-80">{result.passedCount}/{result.totalCount} passed</span>
                        </div>
                      )}

                      {/* Compile error */}
                      {result.compileError && !result.run_only && (
                        <div className="p-3 rounded-xl border border-destructive/25 bg-destructive/5">
                          <div className="flex items-center gap-1.5 mb-2 text-destructive font-bold">
                            <AlertCircle className="h-4 w-4" />
                            <span>Compilation Error</span>
                          </div>
                          <pre className="text-destructive/85 text-[10px] whitespace-pre-wrap font-mono">{result.compileError}</pre>
                        </div>
                      )}

                      {/* Test Cases */}
                      {!result.run_only && result.testResults.map((t, i) => {
                        const pass = t.verdict === 'accepted';
                        return (
                          <div key={i} className={`p-4 rounded-xl border ${
                            pass ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-destructive/15 bg-destructive/5'
                          }`}>
                            <div className={`flex justify-between items-center mb-2.5 ${pass ? 'text-emerald-500' : 'text-destructive'}`}>
                              <div className="flex items-center gap-1.5">
                                {pass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                <span className="font-bold text-xs">Test Case {t.case}</span>
                              </div>
                              {!pass && (
                                <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-extrabold capitalize">
                                  {VERDICT_META[t.verdict]?.label ?? t.verdict}
                                </span>
                              )}
                            </div>
                            
                            <div className="text-muted-foreground grid grid-cols-[65px_1fr] gap-x-2 gap-y-1.5 text-[10px] font-mono overflow-x-auto">
                              <span className="font-bold text-foreground/70">Input</span>
                              <span className="text-foreground whitespace-pre-wrap break-all">{t.input}</span>
                              
                              <span className="font-bold text-foreground/70">Expected</span>
                              <span className="text-foreground whitespace-pre-wrap break-all">{t.expectedOutput}</span>
                              
                              {!pass && (
                                <>
                                  <span className="text-destructive font-bold mt-1">Output</span>
                                  <span className="text-destructive mt-1 whitespace-pre-wrap break-all bg-destructive/10 px-2 py-1 rounded">
                                    {t.actualOutput || '(empty)'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
