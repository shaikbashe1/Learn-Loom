import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target, ChevronRight, CheckCircle, BookOpen, Video, Code2,
  Zap, Calendar, ArrowRight, RefreshCw, Globe, BarChart3, Cpu, Shield,
  Book, Award, HelpCircle, AlertCircle, Play, Trophy
} from 'lucide-react';
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
  { id: 'data-science' as RoadmapDomain, label: 'Data Science', icon: BarChart3, color: 'from-primary/20 to-primary/5', border: 'border-primary/40', iconColor: 'text-primary', weeks: 12 },
  { id: 'web-development' as RoadmapDomain, label: 'Web Development', icon: Globe, color: 'from-chart-2/20 to-chart-2/5', border: 'border-chart-2/40', iconColor: 'text-chart-2', weeks: 16 },
  { id: 'ai-ml' as RoadmapDomain, label: 'AI / ML', icon: Cpu, color: 'from-chart-3/20 to-chart-3/5', border: 'border-chart-3/40', iconColor: 'text-chart-3', weeks: 20 },
  { id: 'cybersecurity' as RoadmapDomain, label: 'Cybersecurity', icon: Shield, color: 'from-chart-4/20 to-chart-4/5', border: 'border-chart-4/40', iconColor: 'text-chart-4', weeks: 14 },
  { id: 'dsa' as RoadmapDomain, label: 'DSA', icon: Code2, color: 'from-chart-5/20 to-chart-5/5', border: 'border-chart-5/40', iconColor: 'text-chart-5', weeks: 18 },
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
      case 'video':
        return <Video className="w-3.5 h-3.5 text-primary" />;
      case 'practice':
      case 'project':
        return <Code2 className="w-3.5 h-3.5 text-chart-3" />;
      case 'book':
        return <Book className="w-3.5 h-3.5 text-chart-4" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-chart-2" />;
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

  return (
    <AppLayout title="AI Learning Roadmap">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground text-balance">AI Learning Roadmap Generator</h2>
          <p className="text-sm text-muted-foreground mt-1">Get a structured, personalized week-by-week learning plan and verify your skills</p>
        </div>

        {!generated ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {domainOptions.map(domain => (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`text-left p-5 rounded-xl border-2 transition-all bg-gradient-to-br ${domain.color} ${selectedDomain === domain.id ? domain.border + ' scale-[1.01] shadow-md shadow-primary/5' : 'border-border bg-card hover:border-primary/30'}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-background/55 flex items-center justify-center border border-border/20 shadow-sm">
                      <domain.icon className={`w-5 h-5 ${domain.iconColor}`} />
                    </div>
                    {selectedDomain === domain.id && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{domain.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{domain.weeks}-week curriculum plan</p>
                </button>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <h3 className="font-bold text-foreground text-lg text-balance">
                    {selectedDomain ? `Generate ${domainOptions.find(d => d.id === selectedDomain)?.label} Roadmap` : 'Select a Domain to Begin'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 text-pretty">
                    Our AI will map out structured modules, curate top resources, outline milestones, and generate custom placement prep quiz questions.
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedDomain || generating}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 shrink-0 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {generating ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Customizing...</>
                  ) : (
                    <>Generate Roadmap <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          roadmap && (
            <div className="space-y-6">
              {/* Roadmap Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">AI Generated</Badge>
                    <Badge variant="outline" className="border-border text-muted-foreground text-xs">{roadmap.estimated_weeks} Weeks Total</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground text-balance">{roadmap.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{roadmap.description}</p>
                </div>
                <Button
                  onClick={() => { setGenerated(false); setSelectedDomain(null); }}
                  variant="ghost"
                  className="border border-border text-foreground hover:bg-accent shrink-0"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Change Domain
                </Button>
              </div>

              {/* Phase Navigation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Curriculum Phases</h4>
                  <div className="space-y-2">
                    {roadmap.phases.map((phase, idx) => (
                      <button
                        key={phase.phase}
                        onClick={() => setActivePhaseIndex(idx)}
                        className={`w-full flex items-start gap-4 p-4 rounded-xl text-left border transition-all ${activePhaseIndex === idx ? 'bg-primary/10 border-primary/40 shadow-sm' : 'border-border bg-card hover:border-primary/25 hover:bg-muted/40'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${activePhaseIndex === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {phase.phase}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">{phase.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{phase.duration_weeks} week{phase.duration_weeks > 1 ? 's' : ''} • {phase.topics.length} topics</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground self-center shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phase Details */}
                <div className="lg:col-span-2">
                  {activePhase && (
                    <Card className="bg-card border-border h-full shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">Phase {activePhase.phase}</Badge>
                          <span className="text-xs text-muted-foreground font-medium">{activePhase.duration_weeks} week{activePhase.duration_weeks > 1 ? 's' : ''} duration</span>
                        </div>
                        <CardTitle className="text-lg text-foreground text-balance mt-2">{activePhase.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {/* Topics */}
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Core Topics Covered</h4>
                          <div className="flex flex-wrap gap-2">
                            {activePhase.topics.map((topic, i) => (
                              <Badge key={i} variant="secondary" className="text-xs py-1 px-2.5 bg-muted border border-border">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Resources */}
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Recommended Resources</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activePhase.resources.map((res, i) => (
                              <a
                                key={i}
                                href={res.url && res.url !== '#' ? res.url : undefined}
                                target={res.url && res.url !== '#' ? '_blank' : undefined}
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-all border border-border/40 group ${res.url && res.url !== '#' ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
                              >
                                <div className="w-7 h-7 rounded bg-background flex items-center justify-center shrink-0 border border-border/20 shadow-sm">
                                  {resourceIcon(res.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{res.title}</p>
                                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{res.type}</p>
                                </div>
                                {res.url && res.url !== '#' && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />}
                              </a>
                            ))}
                          </div>
                        </div>

                        {/* Milestone */}
                        <div className="p-4 rounded-xl bg-chart-3/5 border border-chart-3/15">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-chart-3" />
                            <span className="text-xs font-bold text-chart-3 uppercase tracking-wide">Phase Milestone Goal</span>
                          </div>
                          <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{activePhase.milestone}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Practice Quiz Section */}
              {roadmap.quiz_questions && roadmap.quiz_questions.length > 0 && (
                <Card className="bg-card border-border shadow-sm pt-4">
                  <CardHeader className="border-b border-border/40 pb-3">
                    <CardTitle className="text-base text-foreground flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" /> Placement Practice Quiz
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Test your domain mastery with questions generated specifically for your career roadmap</p>
                  </CardHeader>
                  <CardContent className="p-6">
                    {!quizStarted && !quizSubmitted ? (
                      <div className="text-center py-6 max-w-sm mx-auto space-y-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Ready to test your knowledge?</p>
                          <p className="text-xs text-muted-foreground mt-1">Answer {roadmap.quiz_questions.length} conceptual placement questions covering this domain.</p>
                        </div>
                        <Button onClick={startQuiz} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                          Start Practice Quiz
                        </Button>
                      </div>
                    ) : quizSubmitted ? (
                      <div className="space-y-6">
                        <div className="text-center max-w-sm mx-auto space-y-3 pb-4 border-b border-border/40">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${quizScore >= (roadmap.quiz_questions.length * 0.6) ? 'bg-chart-3/15 text-chart-3' : 'bg-destructive/15 text-destructive'}`}>
                            <Trophy className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-foreground">Practice Completed!</h4>
                            <p className="text-sm text-muted-foreground mt-0.5">You scored {quizScore} out of {roadmap.quiz_questions.length} ({Math.round((quizScore / roadmap.quiz_questions.length) * 100)}%)</p>
                          </div>
                          <Progress value={(quizScore / roadmap.quiz_questions.length) * 100} className="h-2 mt-2" />
                          <Button onClick={startQuiz} variant="outline" size="sm" className="mt-4">
                            Retake Quiz
                          </Button>
                        </div>

                        {/* Detailed question review */}
                        <div className="space-y-4">
                          <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Question Review</h5>
                          {roadmap.quiz_questions.map((q, qidx) => {
                            const isCorrect = quizAnswers[qidx] === q.correct_index;
                            return (
                              <div key={qidx} className={`p-4 rounded-xl border ${isCorrect ? 'bg-chart-3/5 border-chart-3/15' : 'bg-destructive/5 border-destructive/15'} space-y-3`}>
                                <div className="flex items-start gap-2.5">
                                  {isCorrect ? (
                                    <CheckCircle className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                  )}
                                  <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question}</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                                  {q.options.map((opt, oidx) => {
                                    const isSelected = quizAnswers[qidx] === oidx;
                                    const isCorrectOpt = q.correct_index === oidx;
                                    return (
                                      <div
                                        key={oidx}
                                        className={`p-2.5 rounded-lg border text-xs leading-normal ${isCorrectOpt ? 'bg-chart-3/10 border-chart-3/30 text-foreground font-medium' : isSelected ? 'bg-destructive/10 border-destructive/30 text-foreground' : 'border-border bg-muted/20 text-muted-foreground'}`}
                                      >
                                        <span className="font-bold mr-1.5">{String.fromCharCode(65 + oidx)}.</span>
                                        {opt}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="pl-6 border-l-2 border-muted mt-2 pt-1">
                                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Explanation:</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{q.explanation}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 max-w-2xl mx-auto">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Question {quizCurrent + 1} of {roadmap.quiz_questions.length}</span>
                          <span>Score: {quizAnswers.slice(0, quizCurrent).filter((ans, idx) => ans === roadmap.quiz_questions[idx].correct_index).length}</span>
                        </div>
                        <Progress value={((quizCurrent + 1) / roadmap.quiz_questions.length) * 100} className="h-1.5" />

                        {roadmap.quiz_questions[quizCurrent] && (
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-foreground leading-relaxed">
                              {roadmap.quiz_questions[quizCurrent].question}
                            </h4>
                            <div className="space-y-2">
                              {roadmap.quiz_questions[quizCurrent].options.map((opt, oidx) => (
                                <button
                                  key={oidx}
                                  onClick={() => setQuizSelectedOpt(oidx)}
                                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-xs transition-all ${quizSelectedOpt === oidx ? 'border-primary bg-primary/5 text-foreground font-medium' : 'border-border hover:border-primary/30 hover:bg-muted/40 text-foreground'}`}
                                >
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${quizSelectedOpt === oidx ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>
                                    {String.fromCharCode(65 + oidx)}
                                  </div>
                                  <span>{opt}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <Button
                            onClick={() => { setQuizCurrent(quizCurrent - 1); setQuizSelectedOpt(quizAnswers[quizCurrent - 1] ?? null); }}
                            disabled={quizCurrent === 0}
                            variant="ghost"
                            className="text-xs border border-border text-foreground hover:bg-accent disabled:opacity-40"
                          >
                            Previous
                          </Button>
                          <Button
                            onClick={handleQuizNext}
                            disabled={quizSelectedOpt === null}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6"
                          >
                            {quizCurrent === roadmap.quiz_questions.length - 1 ? 'Finish Quiz' : 'Next'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
