'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../services/api';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Send, 
  Terminal, 
  BookOpen, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

export default function CodingPracticePage() {
  const params = useParams();
  const router = useRouter();

  const problemId = params.problemId as string;

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(`# Write your python solution here\ndef square(n):\n    return n * n\n\nimport sys\nfor line in sys.stdin:\n    print(square(int(line.strip())))`);
  const [stdin, setStdin] = useState('5');
  
  // Terminal outputs
  const [consoleOut, setConsoleOut] = useState('');
  const [consoleErr, setConsoleErr] = useState('');
  const [running, setRunning] = useState(false);

  // Submissions verdicts
  const [submitting, setSubmitting] = useState(false);
  const [verdicts, setVerdicts] = useState<any[] | null>(null);
  const [passedStatus, setPassedStatus] = useState<string | null>(null);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (lang === 'python') {
      setCode(`# Write your python solution here\ndef square(n):\n    return n * n\n\nimport sys\nfor line in sys.stdin:\n    print(square(int(line.strip())))`);
    } else if (lang === 'javascript') {
      setCode(`// Write your javascript solution here\nconst fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim();\nconst n = parseInt(input);\nconsole.log(n * n);`);
    } else if (lang === 'java') {
      setCode(`// Write your Java solution here\nimport java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            System.out.println(n * n);\n        }\n    }\n}`);
    }
  };

  const handleRunCode = async () => {
    try {
      setRunning(true);
      setConsoleOut('');
      setConsoleErr('');

      const res = await api.post('/coding/run', {
        code,
        language,
        stdin,
      });

      setConsoleOut(res.data.stdout);
      setConsoleErr(res.data.stderr);
    } catch (err: any) {
      setConsoleErr(err.response?.data?.message || 'Remote execution failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    try {
      setSubmitting(true);
      setVerdicts(null);
      setPassedStatus(null);

      const res = await api.post(`/coding/submit/${problemId}`, {
        code,
        language,
      });

      setVerdicts(res.data.verdicts);
      setPassedStatus(res.data.status);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit solution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans select-none text-slate-100">
      
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-xs text-white">Coding Playground Challenge</span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-850 px-2.5 py-0.5 rounded-md">
            Lab #{problemId.substring(0, 5)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="python">Python 3</option>
            <option value="javascript">Node.js</option>
            <option value="java">Java 15</option>
          </select>
        </div>
      </header>

      {/* Split Worksheets */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Pane: Challenge Outline and Verdicts */}
        <section className="flex-1 md:w-1/2 overflow-y-auto p-6 md:p-8 space-y-6 border-b md:border-b-0 md:border-r border-slate-800/40 bg-slate-950/20">
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Challenge: Square Int Parameters</h1>
            <p className="text-slate-400 text-xs leading-relaxed">
              Read integer values from standard input (stdin) and output the squared value of the parameter to stdout. Each output should terminate with a newline character.
            </p>
          </div>

          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Input constraints</h4>
            <code className="text-xs text-indigo-400 font-mono">1 &lt;= n &lt;= 1000</code>
          </div>

          {/* Test verdicts dashboard if submitted */}
          {verdicts && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white">Grading Verdicts</h3>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase ${
                  passedStatus === 'PASSED' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  {passedStatus}
                </span>
              </div>

              <div className="space-y-2">
                {verdicts.map((vc: any) => (
                  <div 
                    key={vc.testCaseIndex}
                    className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-300">Test Case #{vc.testCaseIndex}</span>
                    <span className="flex items-center gap-1">
                      {vc.passed ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400 font-bold">Passed</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-rose-400" /> <span className="text-rose-400 font-bold">Failed</span></>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Pane: Code IDE Editor */}
        <section className="flex-1 md:w-1/2 flex flex-col justify-between overflow-hidden bg-slate-950">
          
          {/* Monaco Editor Wrapper */}
          <div className="flex-1 min-h-[300px] border-b border-slate-850">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language === 'python' ? 'python' : 'javascript'}
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                lineNumbers: 'on',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Stdin Inputs & Terminal Console Logs */}
          <div className="h-44 bg-slate-900 border-b border-slate-850 p-4 flex flex-col justify-between overflow-y-auto">
            <div className="flex gap-4 h-full">
              <div className="w-1/3 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Stdin Input</span>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-200 resize-none"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Stdout Console Logs</span>
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-xs text-slate-400 overflow-y-auto">
                  {running ? (
                    <span className="text-slate-600">Running compiler engine...</span>
                  ) : consoleErr ? (
                    <span className="text-rose-400">{consoleErr}</span>
                  ) : (
                    consoleOut || <span className="text-slate-700">Run code to see outputs.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controller Actions bar */}
          <div className="p-4 bg-slate-950 flex items-center justify-between">
            <Link 
              href="/dashboard" 
              className="px-4 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-900 text-xs font-bold text-slate-500 hover:text-white transition"
            >
              Back
            </Link>

            <div className="flex gap-2">
              <button
                onClick={handleRunCode}
                disabled={running}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-bold rounded-xl border border-slate-800 flex items-center gap-1.5 disabled:opacity-50"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-indigo-400" />} Run Code
              </button>
              
              <button
                onClick={handleSubmitCode}
                disabled={submitting}
                className="px-6 py-2.5 bg-indigo-500 hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Solution
              </button>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
