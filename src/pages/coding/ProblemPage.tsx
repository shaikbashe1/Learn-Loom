import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import { 
  Play, Terminal, CheckCircle2, XCircle, ArrowLeft,
  Sparkles, Code2, Clock, Lightbulb, Loader2
} from 'lucide-react';
import type { DBCodingProblem, DBProblemTestcase } from '@/types/types';
import ReactMarkdown from 'react-markdown';

type Lang = 'python' | 'javascript' | 'java' | 'cpp';

const LANG_MAP: Record<Lang, { id: number; name: string }> = {
  python: { id: 71, name: 'Python (3.8.1)' },
  javascript: { id: 63, name: 'JavaScript (Node.js 12.14.0)' },
  java: { id: 62, name: 'Java (OpenJDK 13.0.1)' },
  cpp: { id: 54, name: 'C++ (GCC 9.2.0)' }
};

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>(); // This is actually the slug
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [problem, setProblem] = useState<DBCodingProblem | null>(null);
  const [testcases, setTestcases] = useState<DBProblemTestcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  const [language, setLanguage] = useState<Lang>('python');
  const [code, setCode] = useState('');
  
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [output, setOutput] = useState<{ status: string; stdout: string; time?: string; memory?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'hints'>('description');
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [generatingHint, setGeneratingHint] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        if (!id) return;
        const q = query(collection(db, 'coding_problems'), where('slug', '==', id));
        const querySnapshot = await getDocs(q);
          
        if (querySnapshot.empty) {
          toast.error('Problem not found');
          navigate('/coding/practice');
          return;
        }
        
        const probDoc = querySnapshot.docs[0];
        const probData = { id: probDoc.id, ...probDoc.data() } as any;
        
        // Safely parse JSONB fields if they came back as strings
        let parsedTags = probData.company_tags;
        if (typeof parsedTags === 'string') {
          try { parsedTags = JSON.parse(parsedTags); } catch(e) { parsedTags = []; }
        }
        let parsedConstraints = probData.constraints;
        if (typeof parsedConstraints === 'string') {
          try { parsedConstraints = JSON.parse(parsedConstraints); } catch(e) { parsedConstraints = []; }
        }
        let parsedStarter = probData.starter_code;
        if (typeof parsedStarter === 'string') {
          try { parsedStarter = JSON.parse(parsedStarter); } catch(e) { parsedStarter = {}; }
        }
        
        const safeProbData = {
          ...probData,
          company_tags: Array.isArray(parsedTags) ? parsedTags : [],
          constraints: Array.isArray(parsedConstraints) ? parsedConstraints : [],
          starter_code: typeof parsedStarter === 'object' && parsedStarter !== null ? parsedStarter : {},
        } as DBCodingProblem;

        setProblem(safeProbData);
        
        const draftKey = `draft_code_${user?.id}_${id}_${language}`;
        const savedDraft = localStorage.getItem(draftKey);
        
        if (savedDraft) {
          setCode(savedDraft);
        } else if (safeProbData.starter_code && safeProbData.starter_code[language]) {
          setCode(safeProbData.starter_code[language]);
        } else {
          setCode('# Write your code here\n');
        }

        // Fetch testcases
        const tcQuery = query(collection(db, 'problem_testcases'), where('problem_id', '==', probData.id));
        const tcSnapshot = await getDocs(tcQuery);
          
        if (!tcSnapshot.empty) {
          const tcData = tcSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTestcases(tcData as DBProblemTestcase[]);
        }
      } catch (err: any) {
        setRenderError(err.message || 'Failed to load problem');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProblem();
  }, [id, navigate, language, user?.id]);

  const handleLanguageChange = (lang: Lang) => {
    setLanguage(lang);
    const draftKey = `draft_code_${user?.id}_${id}_${lang}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      setCode(savedDraft);
    } else if (problem?.starter_code && problem.starter_code[lang]) {
      setCode(problem.starter_code[lang]);
    } else {
      setCode('# Write your code here\n');
    }
  };

  const executeCode = async (isSubmit: boolean = false) => {
    if (!problem || !code.trim()) return;
    
    if (isSubmit) setIsSubmitting(true);
    else setIsRunning(true);
    
    setOutput(null);
    
    try {
      // Mock Judge0 API for Demo
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let allPassed = true;
      let finalStatus = "Accepted";
      
      if (code.length < 10) {
        allPassed = false;
        finalStatus = "Compilation Error";
      }
      
      setOutput({
        status: finalStatus,
        stdout: finalStatus === "Accepted" ? "All test cases passed!" : "Failed on Testcase 1\nExpected: ...\nGot: ...",
        time: "45ms",
        memory: "12.4MB"
      });

      if (isSubmit && finalStatus === "Accepted" && user) {
        await addDoc(collection(db, 'coding_submissions'), {
          user_id: user.id,
          problem_id: problem.id,
          source_code: code,
          language: language,
          verdict: finalStatus,
          time_ms: 45,
          memory_kb: 12400,
          credits_awarded: problem.credits || 10,
          created_at: new Date().toISOString()
        });
        toast.success("Solution Accepted! XP & Progress Updated.");
      } else if (isSubmit) {
        toast.error("Submission failed. Check your logic.");
      }
    } catch (error) {
      setOutput({ status: "Error", stdout: "Server execution failed." });
      toast.error("Execution failed.");
    } finally {
      setIsRunning(false);
      setIsSubmitting(false);
    }
  };

  const getAIHint = async () => {
    setGeneratingHint(true);
    setActiveTab('hints');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAiHint(`Looking at your ${language} code, consider the following:\n1. Your loop boundary might be off by one.\n2. Try using a HashMap to reduce the time complexity from O(n^2) to O(n).`);
    } catch (e) {
      toast.error("Failed to generate AI hint");
    } finally {
      setGeneratingHint(false);
    }
  };

  if (renderError) {
    return (
      <AppLayout title="Error">
        <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
          <XCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-bold">Failed to load problem</h2>
          <p className="text-muted-foreground">{renderError}</p>
          <Button onClick={() => navigate('/coding/practice')}>Go Back</Button>
        </div>
      </AppLayout>
    );
  }

  if (loading || !problem) {
    return (
      <AppLayout title="Loading Problem...">
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={problem?.title || "Problem"} fullWidth noFooter>
      <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-background overflow-hidden">
        
        {/* Top Navbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-outline-variant h-14 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Link to="/coding/practice" className="text-on-surface-variant hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-heading font-semibold text-on-surface flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              {problem?.title || "Untitled Problem"}
            </h1>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              problem?.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
              problem?.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-600' :
              'bg-red-500/10 text-red-500'
            }`}>
              {problem?.difficulty || "Medium"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => executeCode(false)} 
              disabled={isRunning || isSubmitting}
            >
              {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Run Code
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => executeCode(true)}
              disabled={isRunning || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Submit
            </Button>
          </div>
        </div>

        {/* Split Workspace */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Pane: Problem Description */}
          <div className="w-1/2 flex flex-col border-r border-outline-variant bg-surface overflow-hidden">
            <div className="flex border-b border-outline-variant bg-surface-container-lowest shrink-0">
              <button 
                onClick={() => setActiveTab('description')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'description' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Description
              </button>
              <button 
                onClick={() => setActiveTab('hints')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'hints' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Sparkles className="w-4 h-4 text-tertiary" />
                AI Mentor
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {activeTab === 'description' && (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-surface-container prose-pre:border prose-pre:border-outline-variant">
                  <ReactMarkdown>{problem?.description || "No description provided."}</ReactMarkdown>
                  
                  {Array.isArray(problem?.company_tags) && problem.company_tags.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-outline-variant">
                      <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">Companies</h4>
                      <div className="flex gap-2 flex-wrap">
                        {problem.company_tags.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {Array.isArray(problem?.constraints) && problem.constraints.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">Constraints</h4>
                      <ul className="space-y-1">
                        {problem.constraints.map((c, i) => (
                          <li key={i} className="text-sm font-mono bg-surface-container px-2 py-1 rounded-md inline-block mr-2 mb-2">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'hints' && (
                <div className="space-y-6">
                  <div className="bg-tertiary/10 border border-tertiary/20 rounded-xl p-6 text-center">
                    <Sparkles className="w-10 h-10 text-tertiary mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-on-surface mb-2">Stuck on a bug?</h3>
                    <p className="text-on-surface-variant text-sm mb-4">
                      Our Gemini-powered AI Mentor can analyze your current code and provide targeted hints without giving away the full answer.
                    </p>
                    <Button variant="outline" className="border-tertiary text-tertiary hover:bg-tertiary/10" onClick={getAIHint} disabled={generatingHint}>
                      {generatingHint ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                      {generatingHint ? "Analyzing Code..." : "Get AI Hint"}
                    </Button>
                  </div>

                  {aiHint && (
                    <div className="bg-surface-container rounded-xl p-5 border border-outline-variant">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-tertiary" />
                        <span className="font-bold text-sm text-tertiary">Mentor Insight</span>
                      </div>
                      <div className="text-sm text-on-surface whitespace-pre-line leading-relaxed">
                        {aiHint}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Code Editor & Console */}
          <div className="w-1/2 flex flex-col bg-[#1e1e1e] overflow-hidden">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d] h-12 shrink-0">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Lang)}
                className="bg-[#1e1e1e] text-white border border-[#3d3d3d] rounded px-2 py-1 text-sm font-mono outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(LANG_MAP).map(([key, val]) => (
                  <option key={key} value={key}>{val.name}</option>
                ))}
              </select>
              
              <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                <span><Clock className="w-3 h-3 inline mr-1" /> {problem?.time_limit_ms || 1000}ms</span>
                <span>{problem?.memory_limit_mb || 256}MB</span>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 relative">
              <Editor
                height="100%"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(val) => {
                  setCode(val || '');
                  if (user && id) {
                    localStorage.setItem(`draft_code_${user.id}_${id}_${language}`, val || '');
                  }
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineHeight: 24,
                  padding: { top: 16, bottom: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                }}
              />
            </div>

            {/* Output Console */}
            <div className={`border-t border-[#3d3d3d] bg-[#1e1e1e] transition-all duration-300 flex flex-col ${output ? 'h-64' : 'h-12'}`}>
              <div 
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5"
                onClick={() => !output && setOutput({ status: 'Idle', stdout: 'Ready to run code.' })}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  <Terminal className="w-4 h-4" />
                  Console {output && <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    output.status === 'Accepted' ? 'bg-green-500/20 text-green-400' : 
                    output.status === 'Idle' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{output.status}</span>}
                </div>
                {output && (
                  <button onClick={(e) => { e.stopPropagation(); setOutput(null); }} className="text-gray-500 hover:text-white">
                    Close
                  </button>
                )}
              </div>
              
              {output && (
                <div className="flex-1 overflow-y-auto p-4 bg-[#121212] font-mono text-sm">
                  {output.status === 'Accepted' ? (
                    <div className="text-green-400 whitespace-pre-wrap">{output.stdout}</div>
                  ) : output.status === 'Idle' ? (
                    <div className="text-gray-400">{output.stdout}</div>
                  ) : (
                    <div className="text-red-400 whitespace-pre-wrap">{output.stdout}</div>
                  )}
                  
                  {output.time && output.status === 'Accepted' && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-6 text-gray-400 text-xs">
                      <div>Runtime: <span className="text-white font-bold">{output.time}</span></div>
                      <div>Memory: <span className="text-white font-bold">{output.memory}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
