import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Loading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { enrollInCourse, getEnrollment, getCourseModuleProgress } from '@/lib/progress';
import { toast } from 'sonner';
import { getYouTubeVideoId, buildYouTubeEmbedUrl } from '@/lib/youtube';
import { 
  ArrowLeft, 
  Star, 
  Users, 
  Award, 
  Lock, 
  PlayCircle, 
  CheckCircle2, 
  Send, 
  RefreshCw, 
  FileText, 
  BookOpen, 
  HelpCircle, 
  Trophy, 
  Play, 
  ArrowRight, 
  Clock, 
  BarChart, 
  LockKeyhole,
  FileQuestion,
  GraduationCap,
  Sparkles,
  Code
} from 'lucide-react';
import type {
  DBCourse, DBModule, DBModuleProgress, DBEnrollment,
  DBAssignment, DBQuiz, DBQuizQuestion,
  DBAssignmentSubmission, DBQuizAttempt,
} from '@/types/types';

type ModuleWithStatus = DBModule & { status: 'locked' | 'unlocked' | 'completed' };

interface AssignmentWithSub extends DBAssignment {
  submission: DBAssignmentSubmission | null;
  draftText: string;
  submitting: boolean;
}

interface QuizWithState extends DBQuiz {
  questions: DBQuizQuestion[];
  attempt: DBQuizAttempt | null;
  selectedAnswers: number[];
  quizStarted: boolean;
  submitting: boolean;
}

export default function CourseDetailPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<DBCourse | null>(null);
  const [modules, setModules] = useState<ModuleWithStatus[]>([]);
  const [previewModule, setPreviewModule] = useState<ModuleWithStatus | null>(null);
  const [enrollment, setEnrollment] = useState<DBEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const [assignments, setAssignments] = useState<AssignmentWithSub[]>([]);
  const [moduleQuizzes, setModuleQuizzes] = useState<QuizWithState[]>([]);
  const [grandTest, setGrandTest] = useState<QuizWithState | null>(null);

  const loadAssessments = useCallback(async (enroll: DBEnrollment | null) => {
    if (!courseId || !user) return;

    const { data: asgns } = await supabase.from('assignments').select('*').eq('course_id', courseId).order('created_at', { ascending: true });
    const asgList: DBAssignment[] = asgns ?? [];
    const asgIds = asgList.map(a => a.id);

    const subMap = new Map<string, DBAssignmentSubmission>();
    if (asgIds.length > 0) {
      const { data: subs } = await supabase.from('assignment_submissions').select('*').eq('user_id', user.id).in('assignment_id', asgIds);
      (subs ?? []).forEach((s: DBAssignmentSubmission) => subMap.set(s.assignment_id, s));
    }

    setAssignments(asgList.map(a => ({ ...a, submission: subMap.get(a.id) ?? null, draftText: subMap.get(a.id)?.answer_text ?? '', submitting: false })));

    const { data: qzs } = await supabase.from('quizzes').select('*').eq('course_id', courseId).order('is_grand_test', { ascending: true });
    const qzList: DBQuiz[] = qzs ?? [];
    const qzIds = qzList.map(q => q.id);

    const questionsMap = new Map<string, DBQuizQuestion[]>();
    if (qzIds.length > 0) {
      const { data: allQ } = await supabase.from('quiz_questions').select('*').in('quiz_id', qzIds).order('sort_order', { ascending: true });
      (allQ ?? []).forEach((q: DBQuizQuestion) => {
        if (!questionsMap.has(q.quiz_id)) questionsMap.set(q.quiz_id, []);
        questionsMap.get(q.quiz_id)!.push(q);
      });
    }

    const attemptMap = new Map<string, DBQuizAttempt>();
    if (qzIds.length > 0) {
      const { data: attempts } = await supabase.from('quiz_attempts').select('*').eq('user_id', user.id).in('quiz_id', qzIds);
      (attempts ?? []).forEach((a: DBQuizAttempt) => attemptMap.set(a.quiz_id, a));
    }

    const modulequizzesArr: QuizWithState[] = [];
    let grandTestState: QuizWithState | null = null;
    qzList.forEach(q => {
      const qs = questionsMap.get(q.id) ?? [];
      const attempt = attemptMap.get(q.id) ?? null;
      const state: QuizWithState = { ...q, questions: qs, attempt, selectedAnswers: Array(qs.length).fill(-1), quizStarted: false, submitting: false };
      if (q.is_grand_test) grandTestState = state;
      else modulequizzesArr.push(state);
    });

    setModuleQuizzes(modulequizzesArr);
    setGrandTest(grandTestState);
    void enroll;
  }, [courseId, user]);

  const loadData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);

    const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
    setCourse(courseData);

    const { data: mods } = await supabase.from('course_modules').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
    const moduleList: DBModule[] = mods ?? [];

    let enrichedModules: ModuleWithStatus[] = moduleList.map(m => ({ ...m, status: 'locked' as const }));
    let enroll: DBEnrollment | null = null;

    if (user) {
      enroll = await getEnrollment(user.id, courseId);
      setEnrollment(enroll);
      if (enroll) {
        const progRows: DBModuleProgress[] = await getCourseModuleProgress(user.id, courseId);
        const statusMap = new Map(progRows.map(p => [p.module_id, p.status]));
        enrichedModules = moduleList.map(m => ({ ...m, status: statusMap.get(m.id) ?? 'locked' as const }));
      }
    }
    setModules(enrichedModules);

    const firstUnlocked = enrichedModules.find(m => m.status === 'unlocked');
    setPreviewModule(firstUnlocked ?? enrichedModules[0] ?? null);

    setLoading(false);
    await loadAssessments(enroll);
  }, [courseId, user, loadAssessments]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEnroll = async () => {
    if (!user) { navigate('/login', { state: { from: `/courses/${courseId}` } }); return; }
    if (!courseId) return;
    setEnrolling(true);
    const { error } = await enrollInCourse(user.id, courseId);
    if (error) toast.error('Enrollment failed', { description: error });
    else { toast.success('Enrolled! Starting from Module 1.'); await loadData(); }
    setEnrolling(false);
  };

  const startOrResume = () => {
    if (!enrollment) { handleEnroll(); return; }
    const targetModuleId = enrollment.last_module_id
      ?? modules.find(m => m.status === 'unlocked')?.id
      ?? modules[0]?.id;
    if (targetModuleId) {
      navigate(`/courses/${courseId}/learn/${targetModuleId}`);
    } else {
      navigate(`/courses/${courseId}`);
    }
  };

  const submitAssignment = async (asgIdx: number) => {
    if (!user) return;
    const asg = assignments[asgIdx];
    if (!asg.draftText.trim()) { toast.error('Please write your answer first.'); return; }
    setAssignments(prev => prev.map((a, i) => i === asgIdx ? { ...a, submitting: true } : a));
    const { error } = await supabase.from('assignment_submissions').upsert({ user_id: user.id, assignment_id: asg.id, answer_text: asg.draftText.trim(), status: 'submitted' }, { onConflict: 'user_id,assignment_id' });
    if (error) { toast.error('Submission failed', { description: error.message }); setAssignments(prev => prev.map((a, i) => i === asgIdx ? { ...a, submitting: false } : a)); return; }
    toast.success('Assignment submitted successfully!');
    const { data: sub } = await supabase.from('assignment_submissions').select('*').eq('user_id', user.id).eq('assignment_id', asg.id).maybeSingle();
    setAssignments(prev => prev.map((a, i) => i === asgIdx ? { ...a, submission: sub ?? null, submitting: false } : a));
  };

  const updateDraft = (asgIdx: number, text: string) => setAssignments(prev => prev.map((a, i) => i === asgIdx ? { ...a, draftText: text } : a));

  const startQuiz = (quizIdx: number, isGrandTest = false) => {
    if (isGrandTest && grandTest) setGrandTest(prev => prev ? { ...prev, quizStarted: true, selectedAnswers: Array(prev.questions.length).fill(-1) } : prev);
    else setModuleQuizzes(prev => prev.map((q, i) => i === quizIdx ? { ...q, quizStarted: true, selectedAnswers: Array(q.questions.length).fill(-1) } : q));
  };

  const selectAnswer = (quizIdx: number, qIdx: number, ansIdx: number, isGrandTest = false) => {
    if (isGrandTest && grandTest) setGrandTest(prev => { if (!prev) return prev; const u = [...prev.selectedAnswers]; u[qIdx] = ansIdx; return { ...prev, selectedAnswers: u }; });
    else setModuleQuizzes(prev => prev.map((q, i) => { if (i !== quizIdx) return q; const u = [...q.selectedAnswers]; u[qIdx] = ansIdx; return { ...q, selectedAnswers: u }; }));
  };

  const submitQuiz = async (quizIdx: number, isGrandTest = false) => {
    if (!user) return;
    const quiz = isGrandTest ? grandTest : moduleQuizzes[quizIdx];
    if (!quiz) return;
    if (quiz.selectedAnswers.includes(-1)) { toast.error('Please answer all questions before submitting.'); return; }
    const setSubmitting = (val: boolean) => {
      if (isGrandTest) setGrandTest(prev => prev ? { ...prev, submitting: val } : prev);
      else setModuleQuizzes(prev => prev.map((q, i) => i === quizIdx ? { ...q, submitting: val } : q));
    };
    setSubmitting(true);
    const correct = quiz.questions.filter((q, i) => q.answer_index === quiz.selectedAnswers[i]).length;
    const total = quiz.questions.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= quiz.passing_score;
    const { error } = await supabase.from('quiz_attempts').upsert({ user_id: user.id, quiz_id: quiz.id, answers: quiz.selectedAnswers, score: correct, total, passed }, { onConflict: 'user_id,quiz_id' });
    if (error) { toast.error('Failed to save quiz result', { description: error.message }); setSubmitting(false); return; }
    const attempt: DBQuizAttempt = { id: '', user_id: user.id, quiz_id: quiz.id, answers: quiz.selectedAnswers, score: correct, total, passed, completed_at: new Date().toISOString() };
    if (isGrandTest) setGrandTest(prev => prev ? { ...prev, attempt, submitting: false, quizStarted: false } : prev);
    else setModuleQuizzes(prev => prev.map((q, i) => i === quizIdx ? { ...q, attempt, submitting: false, quizStarted: false } : q));
    toast.success(passed ? `Passed! Score: ${score}%` : `Score: ${score}% — Keep practicing!`);
    setSubmitting(false);
  };

  const retakeQuiz = (quizIdx: number, isGrandTest = false) => {
    if (isGrandTest && grandTest) setGrandTest(prev => prev ? { ...prev, attempt: null, quizStarted: true, selectedAnswers: Array(prev.questions.length).fill(-1) } : prev);
    else setModuleQuizzes(prev => prev.map((q, i) => i === quizIdx ? { ...q, attempt: null, quizStarted: true, selectedAnswers: Array(q.questions.length).fill(-1) } : q));
  };

  if (loading) return (
    <AppLayout>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl space-y-8 select-none">
        <Loading variant="skeleton" className="h-6 w-32" />
        <Loading variant="skeleton" className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Loading variant="skeleton" className="h-24 w-full rounded-xl" />
            <Loading variant="skeleton" className="h-48 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4">
            <Loading variant="skeleton" className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </AppLayout>
  );

  if (!course) return (
    <AppLayout>
      <div className="max-w-container-max mx-auto text-center py-20 flex flex-col items-center select-none">
        <BookOpen className="w-16 h-16 text-muted-foreground opacity-30 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-foreground mb-2">Course not found</h2>
        <Link to="/courses" className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
          Browse Courses
        </Link>
      </div>
    </AppLayout>
  );

  const isEnrolled = !!enrollment;
  const isCompleted = !!enrollment?.completed_at;
  const completedCount = modules.filter(m => m.status === 'completed').length;
  const allModulesCompleted = modules.length > 0 && completedCount === modules.length;

  const renderQuizInProgress = (quiz: QuizWithState, quizIdx: number, isGT = false) => (
    <div key={quiz.id} className={cn(
      "bg-card rounded-xl border p-6 shadow-sm",
      isGT ? 'border-chart-3/30' : 'border-border'
    )}>
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-sm font-bold text-foreground">{quiz.title}</h4>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
          {quiz.questions.length} Questions
        </span>
      </div>
      <div className="space-y-6">
        {quiz.questions.map((q, qiIdx) => (
          <div key={q.id} className="space-y-3">
            <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed">{qiIdx + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, optIdx) => (
                <button 
                  key={optIdx} 
                  onClick={() => selectAnswer(quizIdx, qiIdx, optIdx, isGT)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl border transition-all text-xs",
                    quiz.selectedAnswers[qiIdx] === optIdx 
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm' 
                      : 'border-border text-foreground hover:border-primary/20 hover:bg-muted/30'
                  )}
                >
                  <span className="font-bold mr-3">{String.fromCharCode(65 + optIdx)}.</span>{opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-4 mt-6 border-t border-border/40">
        <p className="text-xs text-muted-foreground font-semibold">
          {quiz.selectedAnswers.filter(a => a >= 0).length}/{quiz.questions.length} answered
        </p>
        <button 
          onClick={() => submitQuiz(quizIdx, isGT)} 
          disabled={quiz.submitting || quiz.selectedAnswers.includes(-1)} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-xs flex items-center gap-2 hover:opacity-90 disabled:opacity-50 min-h-[38px] transition-opacity"
        >
          {quiz.submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit Quiz
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full pb-24 lg:pb-12 animate-fade-in">
        
        {/* Link back */}
        <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-6 mt-4 select-none">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
        
        {/* Hero Section */}
        <section className="rounded-2xl overflow-hidden relative shadow-sm mb-8 flex flex-col md:block border border-border bg-card select-none">
          <div className="h-[200px] sm:h-[250px] md:h-[350px] w-full bg-muted/20 relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/25 via-chart-4/10 to-secondary/25 mix-blend-multiply z-10 pointer-events-none" />
            {course.thumbnail_url ? (
               <img src={course.thumbnail_url} alt="Course Hero" className="w-full h-full object-cover opacity-90" />
            ) : (
               <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Code className="w-16 h-16 text-muted-foreground opacity-20" />
               </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent z-10 hidden md:block" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/20 z-10 md:hidden" />
          </div>
          
          {/* Desktop Overlay Content */}
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 text-white z-20 hidden md:block">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-primary/90 text-primary-foreground font-semibold text-[10px] px-3 py-1 rounded-md border border-primary/20 uppercase tracking-wider">{course.category}</span>
              <span className="bg-card/25 backdrop-blur-sm text-white font-semibold text-[10px] px-3 py-1 rounded-md border border-white/20 flex items-center gap-1.5 uppercase tracking-wider">
                 <BarChart className="w-3.5 h-3.5" />
                 {course.difficulty}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white mb-2 tracking-tight">{course.title}</h1>
            <div className="flex items-center gap-4 flex-wrap mt-2 text-white/90">
              <div className="flex items-center gap-1">
                <Star className="w-4.5 h-4.5 text-chart-3 fill-chart-3" />
                <span className="text-xs font-bold">{course.rating.toFixed(1)}</span>
              </div>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-1">
                <Users className="w-4.5 h-4.5 text-white/80" />
                <span className="text-xs font-bold">{course.student_count.toLocaleString()} enrolled</span>
              </div>
            </div>
          </div>

          {/* Mobile Details Content (Stacked below image) */}
          <div className="p-5 md:hidden text-foreground flex flex-col gap-3 bg-card">
            <div className="flex flex-wrap gap-2">
              <span className="bg-primary/10 text-primary font-bold text-[9px] px-2 py-0.5 rounded-md border border-primary/20 uppercase tracking-wider">{course.category}</span>
              <span className="bg-secondary/10 text-secondary font-bold text-[9px] px-2 py-0.5 rounded-md border border-secondary/20 flex items-center gap-1 uppercase tracking-wider">
                 <BarChart className="w-3 h-3" />
                 {course.difficulty}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight leading-tight">{course.title}</h1>
            <div className="flex items-center gap-4 flex-wrap mt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-chart-3 fill-chart-3" />
                <span className="font-bold text-foreground">{course.rating.toFixed(1)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{course.student_count.toLocaleString()} enrolled</span>
              </div>
            </div>
          </div>
        </section>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 flex flex-col gap-10">
            {/* Overview */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-foreground select-none">Course Overview</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {course.description}
              </p>
              
              {course.topics && course.topics.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-foreground select-none">Skills You'll Master</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.topics.map(topic => (
                      <span key={topic} className="bg-muted border border-border text-foreground text-xs font-semibold px-3.5 py-1.5 rounded-full hover:border-primary/30 hover:text-primary transition-colors cursor-default select-none">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Curriculum */}
            <section className="space-y-6">
              <div className="flex justify-between items-end border-b border-border pb-4 select-none">
                <h2 className="text-lg font-bold text-foreground">Curriculum & Tasks</h2>
                <span className="text-xs font-bold text-muted-foreground">{modules.length} Modules</span>
              </div>
              
              <Tabs defaultValue="modules" className="w-full">
                <TabsList className="w-full justify-start bg-transparent overflow-x-auto whitespace-nowrap rounded-none p-0 h-auto gap-2 mb-6 scrollbar-hide">
                  <TabsTrigger value="modules" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/15 rounded-xl px-4 py-2 text-muted-foreground text-xs font-bold">
                    Modules
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/15 rounded-xl px-4 py-2 text-muted-foreground text-xs font-bold">
                    Assignments
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/15 rounded-xl px-4 py-2 text-muted-foreground text-xs font-bold">
                    Quizzes
                  </TabsTrigger>
                  <TabsTrigger value="grandtest" className="data-[state=active]:bg-chart-3/15 data-[state=active]:text-chart-3 border border-transparent data-[state=active]:border-chart-3/15 rounded-xl px-4 py-2 text-muted-foreground text-xs font-bold flex items-center gap-1">
                    <Award className="w-4.5 h-4.5" />
                    Grand Test
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="modules" className="flex flex-col gap-3">
                  {modules.map((mod, idx) => {
                    const accessible = mod.status !== 'locked';
                    return (
                      <div key={mod.id} className={cn(
                        "border rounded-xl overflow-hidden transition-all duration-300",
                        accessible || isEnrolled 
                          ? 'border-border bg-card hover:border-primary/20 hover:shadow-sm' 
                          : 'border-border/60 opacity-60 bg-muted/20'
                      )}>
                        <div 
                          onClick={() => {
                            setPreviewModule(mod);
                            if (accessible && isEnrolled) navigate(`/courses/${courseId}/learn/${mod.id}`);
                          }}
                          className={cn(
                            "p-4 sm:p-5 flex justify-between items-center transition-colors select-none",
                            accessible || isEnrolled ? 'cursor-pointer hover:bg-muted/20' : 'bg-muted/5'
                          )}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border",
                              mod.status === 'completed' 
                                ? 'bg-success/15 border-success/25 text-success' 
                                : mod.status === 'unlocked' || isEnrolled 
                                  ? 'bg-primary/10 border-primary/20 text-primary' 
                                  : 'bg-muted border-border text-muted-foreground'
                            )}>
                              {mod.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : mod.status === 'locked' && !isEnrolled ? <Lock className="w-4.5 h-4.5" /> : <span>{idx + 1}</span>}
                            </div>
                            <div className="min-w-0">
                              <h4 className={cn("text-xs sm:text-sm font-bold truncate", mod.status === 'completed' ? 'text-primary' : 'text-foreground')}>{mod.title}</h4>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">{mod.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground hidden sm:block">{mod.duration_minutes} min</span>
                            <PlayCircle className={cn("w-5 h-5 transition-colors", (accessible || isEnrolled) ? 'text-primary' : 'text-muted-foreground')} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="assignments" className="flex flex-col gap-4">
                  {!isEnrolled ? (
                    <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed border-border bg-card select-none">
                      <FileText className="w-10 h-10 opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-bold">Enroll in this course to view assignments.</p>
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed border-border bg-card select-none">
                      <CheckCircle2 className="w-10 h-10 opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-bold">No assignments for this course yet.</p>
                    </div>
                  ) : (
                    assignments.map((asg, asgIdx) => {
                      const sub = asg.submission;
                      const isGraded = sub?.status === 'graded';
                      const isSubmitted = !!sub;
                      return (
                        <div key={asg.id} className="border border-border bg-card rounded-xl p-5 shadow-sm space-y-4">
                          <div className="flex items-start justify-between gap-3 border-b border-border pb-3 select-none">
                            <div className="flex items-center gap-2">
                              <FileText className="text-primary w-4.5 h-4.5" />
                              <h4 className="text-xs sm:text-sm text-foreground font-bold">{asg.title}</h4>
                            </div>
                            {isGraded && <span className="px-2 py-0.5 rounded-md bg-success/15 text-success border border-success/20 text-[9px] font-bold uppercase tracking-wider">Graded</span>}
                            {isSubmitted && !isGraded && <span className="px-2 py-0.5 rounded-md bg-secondary/15 text-secondary border border-secondary/20 text-[9px] font-bold uppercase tracking-wider">Submitted</span>}
                            {!isSubmitted && <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-[9px] font-bold uppercase tracking-wider">Pending</span>}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{asg.instructions}</p>
                          
                          {isGraded && (
                            <div className="rounded-xl bg-success/5 border border-success/15 p-4">
                              <p className="text-xs font-bold text-success mb-1">Score: {sub!.score ?? '—'}/100</p>
                              {sub!.feedback && <p className="text-[11px] text-muted-foreground">{sub!.feedback}</p>}
                            </div>
                          )}
                          {isSubmitted && !isGraded && (
                            <div className="rounded-xl bg-muted/40 border border-border p-4">
                              <p className="text-[10px] font-bold text-foreground mb-2 select-none">Your submission:</p>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{sub!.answer_text}</p>
                            </div>
                          )}
                          {!isGraded && (
                            <div className="space-y-3">
                              <Textarea 
                                placeholder="Write your answer here…" 
                                value={asg.draftText} 
                                onChange={e => updateDraft(asgIdx, e.target.value)} 
                                className="min-h-[120px] bg-muted/35 text-foreground border-border focus:border-primary resize-none text-xs p-3" 
                                disabled={asg.submitting} 
                              />
                              <div className="flex items-center justify-between select-none">
                                <p className="text-[10px] text-muted-foreground">{asg.draftText.length} characters</p>
                                <button 
                                  onClick={() => submitAssignment(asgIdx)} 
                                  disabled={asg.submitting || !asg.draftText.trim()} 
                                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[36px]"
                                >
                                  {asg.submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                  {isSubmitted ? 'Resubmit' : 'Submit'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="quiz" className="flex flex-col gap-4">
                  {!isEnrolled ? (
                    <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed border-border bg-card select-none">
                      <FileQuestion className="w-10 h-10 opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-bold">Enroll to access quizzes.</p>
                    </div>
                  ) : moduleQuizzes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed border-border bg-card select-none">
                      <FileQuestion className="w-10 h-10 opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-bold">No quizzes yet.</p>
                    </div>
                  ) : (
                    moduleQuizzes.map((quiz, qIdx) => {
                      if (quiz.quizStarted && !quiz.attempt) return renderQuizInProgress(quiz, qIdx);
                      return (
                        <div key={quiz.id} className="border border-border bg-card rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <h4 className="text-xs sm:text-sm text-foreground mb-1 font-bold">{quiz.title}</h4>
                            <div className="flex gap-4 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider select-none">
                              <span>{quiz.questions.length} questions</span>
                              <span>Pass: {quiz.passing_score}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 select-none">
                            {quiz.attempt && (
                              <span className={cn(
                                "text-[10px] px-2.5 py-0.5 rounded-md border font-bold uppercase tracking-wider",
                                quiz.attempt.passed ? 'bg-success/15 text-success border-success/20' : 'bg-destructive/15 text-destructive border-destructive/20'
                              )}>
                                {quiz.attempt.passed ? 'Passed' : 'Failed'} ({Math.round((quiz.attempt.score / quiz.attempt.total) * 100)}%)
                              </span>
                            )}
                            <button 
                              onClick={() => quiz.attempt ? retakeQuiz(qIdx) : startQuiz(qIdx)} 
                              className="px-4 py-2 bg-muted/40 hover:bg-muted border border-border text-foreground hover:text-primary rounded-xl font-bold text-xs transition-all shadow-sm min-h-[36px]"
                            >
                              {quiz.attempt ? 'Retake' : 'Start'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="grandtest" className="mt-4">
                  {!isEnrolled ? (
                    <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed border-border bg-card select-none">
                      <Award className="w-10 h-10 opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-bold">Enroll in this course to access the Grand Test.</p>
                    </div>
                  ) : !allModulesCompleted ? (
                    <div className="border border-border bg-card rounded-xl p-8 text-center flex flex-col items-center select-none">
                      <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mb-5 shadow-inner">
                        <LockKeyhole className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-1">Grand Test Locked</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                        Complete all {modules.length} modules to unlock. You've completed {completedCount} so far.
                      </p>
                      <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden mb-6 shadow-inner">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${enrollment?.progress_percent ?? 0}%` }} />
                      </div>
                      <button 
                        onClick={startOrResume} 
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 min-h-[40px] shadow-sm"
                      >
                        <Play className="w-4 h-4" /> Continue Learning
                      </button>
                    </div>
                  ) : !grandTest ? (
                    <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed border-border bg-card select-none">
                      <Award className="w-10 h-10 opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-bold">Grand Test not available yet.</p>
                    </div>
                  ) : grandTest.quizStarted && !grandTest.attempt ? renderQuizInProgress(grandTest, 0, true)
                  : (
                    <div className="bg-card border border-chart-3/30 rounded-xl p-8 relative overflow-hidden shadow-sm">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-chart-3/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-chart-3/10 border border-chart-3/20 flex items-center justify-center shrink-0 shadow-inner">
                          <Award className="text-chart-3 w-10 h-10" />
                        </div>
                        <div className="flex-1 min-w-0 text-center md:text-left space-y-4">
                          <div>
                            <h3 className="text-lg font-extrabold text-foreground mb-1">{grandTest.title}</h3>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                              {grandTest.questions.length} questions · Pass requirement: {grandTest.passing_score}%
                            </p>
                          </div>
                          
                          {grandTest.attempt ? (
                            <div className="space-y-6 select-none">
                              <div className={cn(
                                "p-6 rounded-xl border",
                                grandTest.attempt.passed ? 'bg-success/5 border-success/30' : 'bg-destructive/5 border-destructive/30'
                              )}>
                                <p className={cn(
                                  "text-base font-extrabold mb-1",
                                  grandTest.attempt.passed ? 'text-success' : 'text-destructive'
                                )}>
                                  {grandTest.attempt.passed ? 'Congratulations! Passed!' : 'Not quite there yet.'}
                                </p>
                                <p className="text-xs text-muted-foreground">Score: {grandTest.attempt.score}/{grandTest.attempt.total} ({Math.round((grandTest.attempt.score / grandTest.attempt.total) * 100)}%)</p>
                                {grandTest.attempt.passed && (
                                  <p className="text-[11px] text-success mt-4 flex items-center justify-center md:justify-start gap-1.5 bg-success/15 w-fit px-3.5 py-2 rounded-lg border border-success/20 font-bold uppercase tracking-wider">
                                    <CheckCircle2 className="w-4.5 h-4.5" /> You are eligible for your certificate!
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <button 
                                  onClick={() => retakeQuiz(0, true)} 
                                  className="px-5 py-2.5 bg-muted/40 border border-border hover:bg-muted rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                  <RefreshCw className="w-4 h-4" /> Retake Test
                                </button>
                                {grandTest.attempt.passed && (
                                  <Link to="/certificates" className="px-5 py-2.5 bg-chart-3 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 hover:opacity-90 shadow-sm transition-all">
                                    <Trophy className="w-4.5 h-4.5" /> View Certificate
                                  </Link>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => startQuiz(0, true)} 
                              className="px-6 py-2.5 bg-chart-3 text-white rounded-xl font-bold text-xs flex items-center justify-center md:justify-start gap-1.5 hover:opacity-90 transition-all w-full md:w-auto min-h-[40px] shadow-sm select-none"
                            >
                              <Play className="w-4.5 h-4.5" /> Start Grand Test
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </section>

            {/* Instructor */}
            {course.instructor && (
              <section className="space-y-4 select-none">
                <h2 className="text-lg font-bold text-foreground">Your Instructor</h2>
                <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 rounded-xl object-cover border border-border shadow-sm bg-muted flex items-center justify-center shrink-0 relative overflow-hidden">
                     <span className="text-xl font-extrabold text-primary">
                        {course.instructor.split(' ').map(n => n[0]).join('').slice(0, 2)}
                     </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-sm sm:text-base text-foreground font-extrabold">{course.instructor}</h3>
                      <p className="text-xs text-primary font-bold uppercase tracking-wider">Quovexi Educator</p>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      A dedicated professional with extensive experience in the industry, passionate about sharing knowledge and empowering the next generation of engineers through comprehensive, practical coursework.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar (Desktop only for full layout, falls to bottom on mobile) */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="sticky top-[100px] bg-card border border-border rounded-xl p-6 shadow-sm select-none">
              {/* Video Preview */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border relative flex items-center justify-center group mb-6 shadow-inner">
                {previewModule?.youtube_url ? (
                  isEnrolled ? (
                    <iframe 
                      src={buildYouTubeEmbedUrl(previewModule.youtube_url ?? undefined) ?? undefined} 
                      title={previewModule.title}
                      className="w-full h-full" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen 
                    />
                  ) : (
                    <>
                      {(() => {
                        const videoId = getYouTubeVideoId(previewModule.youtube_url);
                        const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
                        return thumbUrl ? <img src={thumbUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300" /> : <PlayCircle className="w-12 h-12 text-muted-foreground opacity-40" />;
                      })()}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                      <div 
                        onClick={handleEnroll} 
                        className="w-14 h-14 bg-card/90 backdrop-blur-md rounded-full flex items-center justify-center z-10 border border-border group-hover:scale-110 transition-transform duration-300 cursor-pointer shadow-md"
                      >
                        <Play className="w-6 h-6 text-primary fill-primary ml-1" />
                      </div>
                    </>
                  )
                ) : (
                  <PlayCircle className="w-12 h-12 text-muted-foreground opacity-40" />
                )}
              </div>
              
              {!isEnrolled && (
                <div className="mb-6 pb-4 border-b border-border space-y-1">
                  <h2 className="text-3xl font-extrabold text-foreground">Free</h2>
                  <p className="text-xs text-success flex items-center gap-1 font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-success" /> Full Lifetime Access
                  </p>
                </div>
              )}
              
              {isEnrolled ? (
                <div className="flex flex-col gap-4 mb-6 border-b border-border pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground font-bold">Your Progress</span>
                    <span className="text-xs text-primary font-extrabold">{enrollment.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-primary rounded-full transition-all duration-500 relative" style={{ width: `${enrollment.progress_percent}%` }}>
                       <div className="absolute inset-0 bg-white/15" />
                    </div>
                  </div>
                  <button 
                    onClick={startOrResume} 
                    className="w-full bg-primary hover:opacity-90 text-primary-foreground text-xs py-3.5 rounded-xl transition-all duration-200 shadow-md mt-2 flex justify-center items-center gap-1.5 font-bold min-h-[44px]"
                  >
                    {isCompleted ? 'Review Course' : 'Continue Learning'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleEnroll} 
                  disabled={enrolling} 
                  className="w-full bg-primary hover:opacity-90 text-primary-foreground text-xs py-3.5 rounded-xl mb-3 transition-all duration-200 shadow-md flex justify-center items-center gap-1.5 disabled:opacity-70 disabled:pointer-events-none font-bold min-h-[44px]"
                >
                  {enrolling && <RefreshCw className="w-4.5 h-4.5 animate-spin" />}
                  <span>Enroll Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              
              <div className="mt-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-muted-foreground font-semibold text-xs">
                  <Clock className="w-4.5 h-4.5 text-primary/75" />
                  <span>{course.duration_weeks} weeks of content</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground font-semibold text-xs">
                  <BarChart className="w-4.5 h-4.5 text-primary/75" />
                  <span>{course.difficulty} Level</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground font-semibold text-xs">
                  <GraduationCap className="w-4.5 h-4.5 text-primary/75" />
                  <span>Certificate of Completion</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground font-semibold text-xs">
                  <Sparkles className="w-4.5 h-4.5 text-primary/75" />
                  <span>Full Lifetime Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom CTA */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-4 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center justify-between gap-4 select-none">
          <div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Access</div>
            <div className="text-lg font-extrabold text-foreground leading-tight">Free</div>
          </div>
          {isEnrolled ? (
            <button 
              onClick={startOrResume} 
              className="bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              {isCompleted ? 'Review' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleEnroll} 
              disabled={enrolling} 
              className="bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold px-8 py-3 rounded-xl shadow-md transition-all flex items-center gap-1.5 min-h-[44px] disabled:opacity-75"
            >
              {enrolling && <RefreshCw className="w-4 h-4 animate-spin" />}
              Enroll Now
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </main>
    </AppLayout>
  );
}
