import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { RoadmapDomain } from '@/types/types';

interface PhaseResource {
  title: string;
  type: 'video' | 'article' | 'book' | 'project';
  url?: string;
}

interface Phase {
  phase: number;
  title: string;
  duration_weeks: number;
  topics: string[];
  resources: PhaseResource[];
  milestone: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface GeneratedRoadmap {
  title: string;
  description: string;
  estimated_weeks: number;
  phases: Phase[];
  quiz_questions: QuizQuestion[];
}

const domainOptions = [
  { id: 'data-science' as RoadmapDomain, label: 'Data Science', icon: 'bar_chart', color: 'from-primary/20 to-primary/5', border: 'border-primary/40', iconColor: 'text-primary', weeks: 12 },
  { id: 'web-development' as RoadmapDomain, label: 'Web Development', icon: 'globe', color: 'from-secondary/20 to-secondary/5', border: 'border-secondary/40', iconColor: 'text-secondary', weeks: 16 },
  { id: 'ai-ml' as RoadmapDomain, label: 'AI / ML', icon: 'memory', color: 'from-tertiary/20 to-tertiary/5', border: 'border-tertiary/40', iconColor: 'text-tertiary', weeks: 20 },
  { id: 'cybersecurity' as RoadmapDomain, label: 'Cybersecurity', icon: 'shield', color: 'from-error/20 to-error/5', border: 'border-error/40', iconColor: 'text-error', weeks: 14 },
  { id: 'dsa' as RoadmapDomain, label: 'DSA', icon: 'code', color: 'from-primary-container/20 to-primary-container/5', border: 'border-primary-container/40', iconColor: 'text-primary-container', weeks: 18 },
];

export default function AIRoadmapPage() {
  const [selectedDomain, setSelectedDomain] = useState<RoadmapDomain | null>(null);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [roadmap, setRoadmap] = useState<GeneratedRoadmap | null>(null);

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCurrent, setQuizCurrent] = useState(0);
  const [quizSelectedOpt, setQuizSelectedOpt] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const domainInfo = domainOptions.find(d => d.id === selectedDomain);

  const handleGenerate = async () => {
    if (!selectedDomain || !domainInfo) return;
    setGenerating(true);
    setRoadmap(null);
    setQuizStarted(false);
    setQuizSubmitted(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await supabase.functions.invoke('ai-roadmap', {
        body: {
          domain: selectedDomain,
          level: 'Beginner',
          goals: `Master ${domainInfo.label} fundamentals and placement prep`,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.error) {
        const msg = await res.error?.context?.text?.();
        const parsed = msg ? (() => { try { return JSON.parse(msg); } catch { return null; } })() : null;
        throw new Error(parsed?.error ?? msg ?? res.error.message);
      }

      if (!res.data) throw new Error('No data returned from AI Roadmap API');

      const parsedRoadmap = res.data as GeneratedRoadmap;
      setRoadmap(parsedRoadmap);
      setActivePhaseIndex(0);
      setGenerated(true);
    } catch (err: unknown) {
      console.error('Roadmap generation error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('daily limit') || msg.toLowerCase().includes('too many')) {
        toast.error('Daily Limit Reached', {
          description: 'You have reached the limit of 5 roadmap generations per day. Please try again tomorrow.',
        });
      } else {
        toast.error('Failed to generate roadmap', {
          description: msg || 'Please try again in a few moments.',
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const resourceIcon = (type: string) => {
    switch (type) {
      case 'video': return 'play_circle';
      case 'practice': case 'project': return 'code';
      case 'book': return 'book';
      default: return 'article';
    }
  };

  // Quiz helper functions
  const startQuiz = () => {
    if (!roadmap?.quiz_questions?.length) return;
    setQuizAnswers(Array(roadmap.quiz_questions.length).fill(null));
    setQuizCurrent(0);
    setQuizSelectedOpt(null);
    setQuizSubmitted(false);
    setQuizStarted(true);
  };

  const handleQuizNext = () => {
    if (quizSelectedOpt === null) return;
    const nextAnswers = [...quizAnswers];
    nextAnswers[quizCurrent] = quizSelectedOpt;
    setQuizAnswers(nextAnswers);

    if (quizCurrent < (roadmap?.quiz_questions?.length ?? 0) - 1) {
      setQuizCurrent(quizCurrent + 1);
      setQuizSelectedOpt(nextAnswers[quizCurrent + 1] ?? null);
    } else {
      // Calculate score
      const correct = nextAnswers.filter((ans, idx) => ans === roadmap?.quiz_questions[idx].correct_index).length;
      setQuizScore(correct);
      setQuizSubmitted(true);
    }
  };

  const activePhase = roadmap?.phases[activePhaseIndex];
  
  const handleNextPhase = () => {
    if (roadmap && activePhaseIndex < roadmap.phases.length - 1) {
      setActivePhaseIndex(activePhaseIndex + 1);
    }
  };

  return (
    <AppLayout title="AI Learning Roadmap">
      <div className="max-w-[1440px] mx-auto space-y-2xl">
        
        {!generated ? (
          <div className="space-y-xl">
            <div>
              <h1 className="font-display text-display text-on-surface mb-xs">AI Learning Roadmap Generator</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Get a structured, personalized week-by-week learning plan and verify your skills</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md md:gap-lg">
              {domainOptions.map(domain => (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`text-left p-xl rounded-xl border-2 transition-all bg-gradient-to-br ${domain.color} ${selectedDomain === domain.id ? domain.border + ' scale-[1.02] shadow-[0_0_15px_rgba(192,193,255,0.15)]' : 'border-outline-variant/40 bg-surface-container-low hover:border-primary/30'}`}
                >
                  <div className="flex items-center gap-md mb-md">
                    <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center border border-outline-variant/30 shadow-sm">
                      <span className={`material-symbols-outlined text-[24px] ${domain.iconColor}`}>{domain.icon}</span>
                    </div>
                    {selectedDomain === domain.id && <span className="material-symbols-outlined text-[24px] text-primary ml-auto">check_circle</span>}
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{domain.label}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{domain.weeks}-week curriculum plan</p>
                </button>
              ))}
            </div>

            <div className="bg-surface-container p-xl rounded-xl border border-outline-variant/60">
              <div className="flex flex-col md:flex-row items-center gap-lg">
                <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="material-symbols-outlined text-[40px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <h3 className="font-headline-md text-headline-md text-on-surface text-balance mb-2">
                    {selectedDomain ? `Generate ${domainOptions.find(d => d.id === selectedDomain)?.label} Roadmap` : 'Select a Domain to Begin'}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant text-pretty">
                    Our AI will map out structured modules, curate top resources, outline milestones, and generate custom placement prep quiz questions.
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!selectedDomain || generating}
                  className="bg-primary text-on-primary-container px-xl py-sm rounded-lg font-label-md text-label-md hover:brightness-110 transition-all shrink-0 shadow-[0_0_15px_rgba(192,193,255,0.2)] disabled:opacity-50 flex items-center gap-2 h-12"
                >
                  {generating ? (
                    <><span className="material-symbols-outlined text-[20px] animate-spin">autorenew</span> Customizing...</>
                  ) : (
                    <>Generate Roadmap <span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          roadmap && (
            <div className="space-y-2xl">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
                <div>
                  <h1 className="font-display text-display text-on-surface mb-xs leading-tight">{roadmap.title}</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">{roadmap.description}</p>
                </div>
                <div className="flex items-center gap-md font-label-md text-label-md shrink-0">
                  <div className="bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-on-surface">Target Mastery: 95%</span>
                  </div>
                  <button
                    onClick={() => { setGenerated(false); setSelectedDomain(null); }}
                    className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors border border-outline-variant/60"
                    title="Change Domain"
                  >
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                  </button>
                </div>
              </div>

              {/* Bento Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-md md:gap-lg">
                
                {/* Main Tree View (Takes up 2 columns) */}
                <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-md md:p-xl relative overflow-hidden flex flex-col min-h-[600px]">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, var(--primary) 0%, transparent 50%)" }}></div>
                  <div className="flex justify-between items-center mb-xl z-10">
                    <h2 className="font-headline-md text-headline-md text-on-surface">Dynamic Pathway</h2>
                  </div>
                  
                  {/* Simplified Tree Representation */}
                  <div className="flex-grow flex flex-col items-center justify-center relative z-10 py-xl">
                    
                    {/* Node 1: Mastered (Previous Phase) */}
                    {activePhaseIndex > 0 && (
                      <div className="relative w-full max-w-md">
                        <div 
                          className="bg-surface-container p-md rounded-lg border border-primary flex items-center justify-between mb-xl relative z-10 cursor-pointer hover:scale-105 transition-all duration-300"
                          onClick={() => setActivePhaseIndex(activePhaseIndex - 1)}
                        >
                          <div className="flex items-center gap-md">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            </div>
                            <div>
                              <div className="font-label-md text-label-md text-primary">Mastered</div>
                              <div className="font-headline-sm text-headline-sm text-on-surface">{roadmap.phases[activePhaseIndex - 1].title}</div>
                            </div>
                          </div>
                        </div>
                        {/* Connector */}
                        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-1 h-xl bg-primary" style={{ boxShadow: '0 0 8px var(--primary)' }}></div>
                      </div>
                    )}
                    
                    {/* Node 2: Current Focus */}
                    {activePhase && (
                      <div className={`relative w-full max-w-md ${activePhaseIndex > 0 ? 'mt-xl' : ''}`}>
                        <div className="bg-surface p-md rounded-lg border-2 border-primary shadow-[0_0_15px_rgba(192,193,255,0.15)] flex flex-col gap-sm relative z-10 transform scale-105">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-md">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary animate-pulse">
                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                              </div>
                              <div>
                                <div className="font-label-md text-label-md text-primary animate-pulse">Current Focus: Phase {activePhase.phase}</div>
                                <div className="font-headline-sm text-headline-sm text-on-surface">{activePhase.title}</div>
                              </div>
                            </div>
                            <span className="bg-surface-container-high px-2 py-1 rounded text-xs font-label-sm text-on-surface-variant border border-outline-variant">
                              Est. {activePhase.duration_weeks}w
                            </span>
                          </div>
                          
                          {/* Phase Content Preview */}
                          <div className="mt-4 pt-4 border-t border-outline-variant/40">
                            <div className="flex flex-wrap gap-2 mb-4">
                              {activePhase.topics.map((topic, i) => (
                                <span key={i} className="px-2 py-1 bg-surface-container-high rounded text-[11px] font-label-sm text-on-surface-variant border border-outline-variant/40">
                                  {topic}
                                </span>
                              ))}
                            </div>
                            <div className="space-y-2">
                              {activePhase.resources.slice(0, 2).map((res, i) => (
                                <a key={i} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors">
                                  <span className="material-symbols-outlined text-[14px]">{resourceIcon(res.type)}</span>
                                  <span className="truncate">{res.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Connector to Next */}
                        {activePhaseIndex < roadmap.phases.length - 1 && (
                          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-1 h-xl bg-outline-variant border-dashed border-l-2"></div>
                        )}
                      </div>
                    )}

                    {/* Node 3: Next Up Option */}
                    {activePhaseIndex < roadmap.phases.length - 1 && (
                      <div className="flex justify-center gap-xl mt-xl pt-xl relative w-full max-w-2xl">
                        <div 
                          className="flex-1 bg-surface-container-high p-md rounded-lg border border-outline-variant/60 opacity-70 hover:opacity-100 transition-all relative z-10 cursor-pointer hover:border-primary hover:scale-[1.02]"
                          onClick={handleNextPhase}
                        >
                          <div className="font-label-md text-label-md text-on-surface-variant mb-1">Next Up: Phase {roadmap.phases[activePhaseIndex + 1].phase}</div>
                          <div className="font-headline-sm text-headline-sm text-on-surface mb-2 truncate">{roadmap.phases[activePhaseIndex + 1].title}</div>
                          <button className="w-full py-1.5 rounded bg-surface border border-outline-variant text-on-surface-variant font-label-sm text-label-sm hover:text-primary hover:border-primary transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Sidebar (Takes 1 column) */}
                <div className="flex flex-col gap-md md:gap-lg">
                  
                  {/* AI Mentor Insights */}
                  <div className="bg-surface-container p-md md:p-lg rounded-xl border border-secondary/30 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary"></div>
                    <div className="flex items-center gap-2 mb-md">
                      <span className="material-symbols-outlined text-secondary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      <h3 className="font-headline-md text-headline-md text-on-surface text-lg">AI Mentor Insights</h3>
                    </div>
                    <div className="space-y-4 font-body-md text-body-md text-on-surface-variant">
                      <p>I have structured this roadmap into <strong>{roadmap.phases.length} phases</strong> to help you achieve your goals.</p>
                      
                      {activePhase && (
                        <div className="bg-surface p-3 rounded border border-outline-variant/40">
                          <div className="font-label-sm text-label-sm text-primary mb-1 uppercase tracking-wider">Current Milestone</div>
                          <p className="text-sm text-on-surface">{activePhase.milestone}</p>
                        </div>
                      )}
                      
                      <p className="text-sm">Complete each phase sequentially and take the practice quiz at the end to verify your understanding.</p>
                    </div>
                  </div>
                  
                  {/* Technical Stats */}
                  <div className="bg-surface-container p-md md:p-lg rounded-xl border border-outline-variant/60 flex-grow">
                    <h3 className="font-headline-md text-headline-md text-on-surface text-lg mb-md">Path Telemetry</h3>
                    <div className="space-y-sm">
                      <div className="p-3 rounded-lg bg-surface-lowest border border-outline-variant/40 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">schedule</span>
                          <span className="font-label-md text-label-md">Estimated Time</span>
                        </div>
                        <span className="font-label-md text-label-md text-on-surface">{roadmap.estimated_weeks} Weeks</span>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-lowest border border-outline-variant/40 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">military_tech</span>
                          <span className="font-label-md text-label-md">Projected Tier</span>
                        </div>
                        <span className="font-label-md text-label-md text-tertiary">Gold (Top 10%)</span>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-lowest border border-outline-variant/40 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">route</span>
                          <span className="font-label-md text-label-md">Nodes Remaining</span>
                        </div>
                        <span className="font-label-md text-label-md text-on-surface">{roadmap.phases.length - activePhaseIndex - 1}</span>
                      </div>
                    </div>
                    
                    {roadmap.quiz_questions && roadmap.quiz_questions.length > 0 && (
                      <button 
                        onClick={() => {
                          const el = document.getElementById('quiz-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full mt-xl py-3 rounded-lg bg-primary text-on-primary-container font-label-md text-label-md font-bold hover:brightness-110 transition-all active:scale-95 duration-100 flex justify-center items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">quiz</span> Jump to Practice Quiz
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Practice Quiz Section */}
              {roadmap.quiz_questions && roadmap.quiz_questions.length > 0 && (
                <div id="quiz-section" className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-md md:p-xl relative overflow-hidden pt-xl">
                  <div className="border-b border-outline-variant/40 pb-4 mb-xl">
                    <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[24px]">help</span> Placement Practice Quiz
                    </h2>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">Test your domain mastery with questions generated specifically for your career roadmap</p>
                  </div>
                  
                  <div>
                    {!quizStarted && !quizSubmitted ? (
                      <div className="text-center py-xl max-w-md mx-auto space-y-md">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary border border-primary/20">
                          <span className="material-symbols-outlined text-[32px]">emoji_events</span>
                        </div>
                        <div>
                          <p className="font-headline-sm text-headline-sm text-on-surface mb-2">Ready to test your knowledge?</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Answer {roadmap.quiz_questions.length} conceptual placement questions covering this domain.</p>
                        </div>
                        <button onClick={startQuiz} className="w-full bg-primary text-on-primary-container hover:brightness-110 py-3 rounded-lg font-label-md text-label-md font-bold transition-all shadow-sm mt-4">
                          Start Practice Quiz
                        </button>
                      </div>
                    ) : quizSubmitted ? (
                      <div className="space-y-xl">
                        <div className="text-center max-w-md mx-auto space-y-4 pb-md border-b border-outline-variant/40">
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border ${quizScore >= (roadmap.quiz_questions.length * 0.6) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-error/10 text-error border-error/30'}`}>
                            <span className="material-symbols-outlined text-[40px]">{quizScore >= (roadmap.quiz_questions.length * 0.6) ? 'emoji_events' : 'sentiment_dissatisfied'}</span>
                          </div>
                          <div>
                            <h4 className="font-headline-md text-headline-md text-on-surface">Practice Completed!</h4>
                            <p className="font-body-md text-body-md text-on-surface-variant mt-1">You scored {quizScore} out of {roadmap.quiz_questions.length} ({Math.round((quizScore / roadmap.quiz_questions.length) * 100)}%)</p>
                          </div>
                          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mt-4">
                            <div className={`h-full rounded-full ${quizScore >= (roadmap.quiz_questions.length * 0.6) ? 'bg-primary' : 'bg-error'}`} style={{ width: `${(quizScore / roadmap.quiz_questions.length) * 100}%` }}></div>
                          </div>
                          <button onClick={startQuiz} className="mt-6 px-6 py-2 border border-outline-variant/60 rounded-lg text-on-surface font-label-md text-label-md hover:bg-surface-variant transition-colors">
                            Retake Quiz
                          </button>
                        </div>

                        {/* Detailed question review */}
                        <div className="space-y-md">
                          <h5 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Question Review</h5>
                          {roadmap.quiz_questions.map((q, qidx) => {
                            const isCorrect = quizAnswers[qidx] === q.correct_index;
                            return (
                              <div key={qidx} className={`p-md rounded-xl border ${isCorrect ? 'bg-primary/5 border-primary/30' : 'bg-error/5 border-error/30'} space-y-4`}>
                                <div className="flex items-start gap-3">
                                  {isCorrect ? (
                                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">check_circle</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5">cancel</span>
                                  )}
                                  <p className="font-body-md text-body-md text-on-surface leading-relaxed">{q.question}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                                  {q.options.map((opt, oidx) => {
                                    const isSelected = quizAnswers[qidx] === oidx;
                                    const isCorrectOpt = q.correct_index === oidx;
                                    return (
                                      <div
                                        key={oidx}
                                        className={`p-3 rounded-lg border font-body-sm text-body-sm leading-normal flex items-start gap-2 ${isCorrectOpt ? 'bg-primary/10 border-primary/40 text-on-surface font-semibold' : isSelected ? 'bg-error/10 border-error/40 text-on-surface' : 'border-outline-variant/40 bg-surface-container-high text-on-surface-variant'}`}
                                      >
                                        <span className="font-bold">{String.fromCharCode(65 + oidx)}.</span>
                                        <span>{opt}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="pl-8 border-l-2 border-outline-variant/60 mt-4 pt-1 ml-[11px]">
                                  <p className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Explanation</p>
                                  <p className="font-body-sm text-body-sm text-on-surface/90 leading-relaxed">{q.explanation}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-lg max-w-3xl mx-auto">
                        <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                          <span>Question {quizCurrent + 1} of {roadmap.quiz_questions.length}</span>
                          <span>Score: {quizAnswers.slice(0, quizCurrent).filter((ans, idx) => ans === roadmap.quiz_questions[idx].correct_index).length}</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${((quizCurrent + 1) / roadmap.quiz_questions.length) * 100}%` }}></div>
                        </div>

                        {roadmap.quiz_questions[quizCurrent] && (
                          <div className="space-y-md mt-lg">
                            <h4 className="font-headline-sm text-headline-sm text-on-surface leading-relaxed">
                              {roadmap.quiz_questions[quizCurrent].question}
                            </h4>
                            <div className="space-y-3 mt-md">
                              {roadmap.quiz_questions[quizCurrent].options.map((opt, oidx) => (
                                <button
                                  key={oidx}
                                  onClick={() => setQuizSelectedOpt(oidx)}
                                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${quizSelectedOpt === oidx ? 'border-primary bg-primary/10 text-on-surface shadow-[0_0_10px_rgba(192,193,255,0.1)]' : 'border-outline-variant/60 hover:border-primary/40 hover:bg-surface-container-high text-on-surface-variant'}`}
                                >
                                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 font-label-sm text-[12px] font-bold ${quizSelectedOpt === oidx ? 'border-primary bg-primary text-on-primary-container' : 'border-outline-variant/60 text-on-surface-variant'}`}>
                                    {String.fromCharCode(65 + oidx)}
                                  </div>
                                  <span className="font-body-md text-body-md">{opt}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-md mt-xl border-t border-outline-variant/40">
                          <button
                            onClick={() => { setQuizCurrent(quizCurrent - 1); setQuizSelectedOpt(quizAnswers[quizCurrent - 1] ?? null); }}
                            disabled={quizCurrent === 0}
                            className="px-4 py-2 font-label-md text-label-md border border-outline-variant/60 rounded-lg text-on-surface hover:bg-surface-variant disabled:opacity-30 transition-colors"
                          >
                            Previous
                          </button>
                          <button
                            onClick={handleQuizNext}
                            disabled={quizSelectedOpt === null}
                            className="bg-primary text-on-primary-container px-6 py-2 rounded-lg font-label-md text-label-md font-bold hover:brightness-110 transition-all disabled:opacity-50"
                          >
                            {quizCurrent === roadmap.quiz_questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
