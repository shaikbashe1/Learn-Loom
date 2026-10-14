import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/db/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Loader2, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

type DartQuestion = {
  id: string;
  title: string;
  problemStatement: string;
  difficulty?: string;
  topic?: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  hints?: string[];
};

export default function DartPracticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<DartQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string>(`void main() {
  // Write your solution here
}`);
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!id) return;
      try {
        const qDoc = await getDoc(doc(db, 'dart_questions', id));
        if (qDoc.exists()) {
          setQuestion({ id, ...(qDoc.data() as any) });
        } else {
          toast.error('Question not found');
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load question');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [id]);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    setExecTime(null);
    const start = Date.now();
    try {
      const res = await fetch(import.meta.env.VITE_DART_EXECUTION_API_URL || '/api/dart/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, input, language: 'dart' }),
      });
      const data = await res.json();
      setOutput(data.output || data.error || 'No output');
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setExecTime(Date.now() - start);
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(`void main() {\n  // Write your solution here\n}`);
    toast.success('Code reset');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="animate-spin" /> Loading question…
        </div>
      </AppLayout>
    );
  }

  if (!question) {
    return (
      <AppLayout>
        <p className="text-red-500">Question not available.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">{question.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <p>{question.problemStatement}</p>
            {question.constraints && (
              <p><strong>Constraints:</strong> {question.constraints}</p>
            )}
            {question.sampleInput && (
              <pre className="bg-slate-800 p-2 rounded">Input: {question.sampleInput}</pre>
            )}
            {question.sampleOutput && (
              <pre className="bg-slate-800 p-2 rounded">Output: {question.sampleOutput}</pre>
            )}
          </CardContent>
        </Card>

        {/* Editor & Execution */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Write your Dart solution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <Editor
              height="250px"
              defaultLanguage="dart"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || '')}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
            <Textarea
              placeholder="Custom stdin (optional)"
              className="bg-slate-800 border-slate-700 text-slate-200"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button onClick={runCode} disabled={isRunning} className="bg-green-600 hover:bg-green-700 text-white">
                {isRunning ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />} Run
              </Button>
              <Button variant="outline" onClick={resetCode}><RotateCcw className="w-4 h-4" /> Reset</Button>
              <Button variant="outline" onClick={() => {navigator.clipboard.writeText(code); toast.success('Copied');}}><Copy className="w-4 h-4" /> Copy</Button>
            </div>
            {execTime !== null && (
              <p className="text-xs text-slate-500">Execution time: {execTime}ms</p>
            )}
            <pre className="bg-slate-800 p-2 rounded whitespace-pre-wrap text-slate-200 min-h-[80px]">
              {output || 'Program output will appear here.'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
