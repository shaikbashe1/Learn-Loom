import React, { useState, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Copy, Trash2, Terminal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CODE = `void main() {
  print('Hello, LearnLoom!');
}`;

export default function DartPlaygroundPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('');
    setExecutionTime(null);
    const start = Date.now();

    try {
      // In Phase 4, we will connect this to our actual Dart execution backend
      const response = await fetch(import.meta.env.VITE_DART_EXECUTION_API_URL || '/api/dart/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, input, language: 'dart' })
      });

      if (!response.ok) {
        throw new Error('Failed to execute code');
      }

      const result = await response.json();
      setOutput(result.output || result.error || 'Execution completed with no output.');
    } catch (err: any) {
      // Fallback for Phase 3 (Frontend only) if backend is not ready
      console.error(err);
      setOutput(`Error connecting to Dart execution service:\n\n${err.message}\n\n(Backend will be implemented in Phase 4)`);
    } finally {
      setExecutionTime(Date.now() - start);
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(DEFAULT_CODE);
    toast.success('Code reset to default');
  };

  const handleClearOutput = () => {
    setOutput('');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-4 bg-slate-900 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Dart Playground</h1>
              <p className="text-sm text-slate-400">Online Dart Compiler & Execution Environment</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-2">
              <Copy className="w-4 h-4" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
            <Button 
              size="sm" 
              onClick={handleRunCode} 
              disabled={isRunning}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Code
            </Button>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          
          {/* Editor Panel */}
          <Card className="flex flex-col border-slate-800 bg-slate-950 overflow-hidden">
            <div className="flex items-center px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="text-sm font-medium text-slate-300">main.dart</span>
            </div>
            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                defaultLanguage="dart"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  contextmenu: true,
                }}
              />
            </div>
          </Card>

          {/* I/O Panel */}
          <Card className="flex flex-col border-slate-800 bg-slate-950 overflow-hidden">
            <Tabs defaultValue="output" className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900 border-b border-slate-800">
                <TabsList className="bg-slate-800 h-8">
                  <TabsTrigger value="output" className="text-xs data-[state=active]:bg-slate-700">Console Output</TabsTrigger>
                  <TabsTrigger value="input" className="text-xs data-[state=active]:bg-slate-700">Custom Input</TabsTrigger>
                </TabsList>
                
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={handleClearOutput}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <TabsContent value="output" className="flex-1 p-0 m-0 relative">
                <div className="absolute inset-0 p-4 overflow-auto font-mono text-sm">
                  {output ? (
                    <pre className="text-slate-300 whitespace-pre-wrap">{output}</pre>
                  ) : (
                    <div className="text-slate-500 italic">Output will appear here after execution...</div>
                  )}
                </div>
                {executionTime !== null && (
                  <div className="absolute bottom-2 right-4 text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    Execution time: {executionTime}ms
                  </div>
                )}
              </TabsContent>

              <TabsContent value="input" className="flex-1 p-4 m-0">
                <Textarea 
                  placeholder="Enter custom input here..."
                  className="h-full resize-none bg-slate-900 border-slate-800 text-slate-300 font-mono text-sm focus-visible:ring-blue-500"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </TabsContent>
            </Tabs>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
