import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle, Lock, Clock, BookOpen, FileText, Award,
  ChevronLeft, PlayCircle, Loader2, Trophy,
  ClipboardList, FlaskConical, Send, RotateCcw, AlertCircle,
  Users, Star, Play,
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { enrollInCourse, getEnrollment, getCourseModuleProgress } from '@/lib/progress';
import { toast } from 'sonner';
import { getYouTubeVideoId, buildYouTubeEmbedUrl } from '@/lib/youtube';
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

// Difficulty color
const difficultyColor: Record<string, string> = {
  Beginner:     'bg-amber-100 text-amber-700 border-amber-200',
  Intermediate: 'bg-sky-100 text-sky-700 border-sky-200',
  Advanced:     'bg-rose-100 text-rose-700 border-rose-200',
};

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

    let subMap = new Map<string, DBAssignmentSubmission>();
    if (asgIds.length > 0) {
      const { data: subs } = await supabase.from('assignment_submissions').select('*').eq('user_id', user.id).in('assignment_id', asgIds);
      (subs ?? []).forEach((s: DBAssignmentSubmission) => subMap.set(s.assignment_id, s));
    }

    setAssignments(asgList.map(a => ({ ...a, submission: subMap.get(a.id) ?? null, draftText: subMap.get(a.id)?.answer_text ?? '', submitting: false })));

    const { data: qzs } = await supabase.from('quizzes').select('*').eq('course_id', courseId).order('is_grand_test', { ascending: true });
    const qzList: DBQuiz[] = qzs ?? [];
    const qzIds = qzList.map(q => q.id);

    let questionsMap = new Map<string, DBQuizQuestion[]>();
    if (qzIds.length > 0) {
      const { data: allQ } = await supabase.from('quiz_questions').select('*').in('quiz_id', qzIds).order('sort_order', { ascending: true });
      (allQ ?? []).forEach((q: DBQuizQuestion) => {
        if (!questionsMap.has(q.quiz_id)) questionsMap.set(q.quiz_id, []);
        questionsMap.get(q.quiz_id)!.push(q);
      });
    }

    let attemptMap = new Map<string, DBQuizAttempt>();
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

    // Preview = first module (or first unlocked for enrolled)
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
    // Navigate to last visited module, or first module
    const targetModuleId = enrollment.last_module_id
      ?? modules.find(m => m.status === 'unlocked')?.id
      ?? modules[0]?.id;
    if (targetModuleId) {
      navigate(`/courses/${courseId}/learn/${targetModuleId}`);
    } else {
      navigate(`/courses/${courseId}`);
    }
  };

  // Assignment submission
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

  // Quiz actions
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

  // Loading skeleton
  if (loading) return (
    <AppLayout title="Course">
      <div className="max-w-7xl mx-auto space-y-5">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-video rounded-xl" />
            <div className="flex gap-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /></div>
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        </div>
      </div>
    </AppLayout>
  );

  if (!course) return (
    <AppLayout title="Not Found">
      <div className="max-w-7xl mx-auto text-center py-16">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Course not found</h2>
        <Link to="/courses"><Button className="bg-primary text-primary-foreground">Browse Courses</Button></Link>
      </div>
    </AppLayout>
  );

  const isEnrolled = !!enrollment;
  const isCompleted = !!enrollment?.completed_at;
  const completedCount = modules.filter(m => m.status === 'completed').length;
  const allModulesCompleted = modules.length > 0 && completedCount === modules.length;

  const statusBadge = (attempt: DBQuizAttempt | null) => {
    if (!attempt) return <Badge className="text-[10px] bg-muted text-muted-foreground border-border">Not Attempted</Badge>;
    if (attempt.passed) return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Passed</Badge>;
    return <Badge className="text-[10px] bg-rose-100 text-rose-700 border-rose-200">Failed</Badge>;
  };

  // Quiz MCQ renderer (shared between module quizzes and grand test)
  const renderQuizInProgress = (quiz: QuizWithState, quizIdx: number, isGT = false) => (
    <Card key={quiz.id} className={`bg-card ${isGT ? 'border-2 border-amber-300' : 'border-border'}`}>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground text-sm">{quiz.title}</h4>
          <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">{quiz.questions.length} Questions</Badge>
        </div>
        <div className="space-y-5">
          {quiz.questions.map((q, qiIdx) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium text-foreground">{qiIdx + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt, optIdx) => (
                  <button key={optIdx} onClick={() => selectAnswer(quizIdx, qiIdx, optIdx, isGT)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${quiz.selectedAnswers[qiIdx] === optIdx ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-foreground hover:border-primary/40 hover:bg-primary/5'}`}>
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + optIdx)}.</span>{opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">{quiz.selectedAnswers.filter(a => a >= 0).length}/{quiz.questions.length} answered</p>
          <Button size="sm" onClick={() => submitQuiz(quizIdx, isGT)} disabled={quiz.submitting || quiz.selectedAnswers.includes(-1)} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
            {quiz.submitting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Send className="w-3 h-3 mr-1.5" />}
            Submit Quiz
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout title={course.title}>
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Back */}
        <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Courses
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─────────── LEFT: Video + Tabs ─────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Video player area */}
            <div className="rounded-xl overflow-hidden border border-border bg-black">
              {/* Module label bar */}
              {previewModule && (
                <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">{previewModule.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {previewModule.duration_minutes} min
                  </span>
                </div>
              )}
              <div className="aspect-video w-full relative">
                {previewModule?.youtube_url ? (() => {
                  const embedUrl = buildYouTubeEmbedUrl(previewModule.youtube_url);
                  if (isEnrolled && embedUrl) {
                    return (
                      <iframe key={embedUrl} src={embedUrl} title={previewModule.title}
                        className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen referrerPolicy="strict-origin-when-cross-origin" loading="lazy"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-presentation" />
                    );
                  }
                  // Not enrolled - show YouTube thumbnail with play overlay
                  const videoId = getYouTubeVideoId(previewModule.youtube_url);
                  const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
                  return (
                    <div className="relative w-full h-full">
                      {thumbUrl
                        ? <img src={thumbUrl} alt={previewModule.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-muted flex items-center justify-center"><BookOpen className="w-16 h-16 text-muted-foreground" /></div>}
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-4">
                        {!isEnrolled && (
                          <>
                            <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/60 flex items-center justify-center">
                              <Lock className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-white font-semibold text-sm">Enroll to access all videos</p>
                            <Button onClick={handleEnroll} disabled={enrolling} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9">
                              {enrolling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling…</> : 'Enroll Now — Free'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <BookOpen className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Tabs ── */}
            <Tabs defaultValue="modules" className="w-full">
              <TabsList className="w-full justify-start bg-card border border-border overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="modules" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Modules</TabsTrigger>
                <TabsTrigger value="assignments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Assignments</TabsTrigger>
                <TabsTrigger value="quiz" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Quizzes</TabsTrigger>
                <TabsTrigger value="grandtest" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Grand Test</TabsTrigger>
              </TabsList>

              {/* MODULES tab */}
              <TabsContent value="modules" className="mt-3">
                <div className="space-y-2">
                  {modules.map((mod, idx) => {
                    const isActive = mod.id === previewModule?.id;
                    const accessible = mod.status !== 'locked';
                    return (
                      <button
                        key={mod.id}
                        onClick={() => {
                          setPreviewModule(mod);
                          if (accessible && isEnrolled) navigate(`/courses/${courseId}/learn/${mod.id}`);
                        }}
                        disabled={!accessible && !isEnrolled}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all group
                          ${isActive ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-muted/40'}
                          ${!accessible && !isEnrolled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {/* Number circle */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors
                          ${mod.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            mod.status === 'unlocked' || (isEnrolled) ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {mod.status === 'completed'
                            ? <CheckCircle className="w-4 h-4" />
                            : mod.status === 'locked' && !isEnrolled
                              ? <Lock className="w-3.5 h-3.5" />
                              : <span>{idx + 1}</span>
                          }
                        </div>

                        {/* Title + description */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{mod.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{mod.description}</p>
                        </div>

                        {/* Duration + play icon */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:block">{mod.duration_minutes} min</span>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors
                            ${accessible || isEnrolled ? 'text-primary group-hover:bg-primary/15' : 'text-muted-foreground'}`}>
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ASSIGNMENTS tab */}
              <TabsContent value="assignments" className="mt-3">
                {!isEnrolled ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Enroll in this course to view assignments.</p>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No assignments for this course yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((asg, asgIdx) => {
                      const sub = asg.submission;
                      const isGraded = sub?.status === 'graded';
                      const isSubmitted = !!sub;
                      return (
                        <Card key={asg.id} className="bg-card border-border">
                          <CardContent className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <h4 className="font-semibold text-foreground text-sm truncate">{asg.title}</h4>
                              </div>
                              <div className="shrink-0">
                                {isGraded && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Graded</Badge>}
                                {isSubmitted && !isGraded && <Badge className="text-[10px] bg-sky-100 text-sky-700 border-sky-200">Submitted</Badge>}
                                {!isSubmitted && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-pretty">{asg.instructions ?? ''}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Due within {asg.due_days} days of enrollment</p>
                            {isGraded && (
                              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                                <p className="text-xs font-semibold text-emerald-700 mb-1">Score: {sub!.score ?? '—'}/100</p>
                                {sub!.feedback && <p className="text-xs text-muted-foreground">{sub!.feedback}</p>}
                              </div>
                            )}
                            {isSubmitted && !isGraded && (
                              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                                <p className="text-[11px] font-medium text-primary mb-1">Your submission:</p>
                                <p className="text-xs text-muted-foreground">{sub!.answer_text}</p>
                              </div>
                            )}
                            {!isGraded && (
                              <div className="space-y-2">
                                <Textarea placeholder="Write your answer here…" value={asg.draftText} onChange={e => updateDraft(asgIdx, e.target.value)}
                                  className="min-h-[100px] text-sm resize-none" disabled={asg.submitting} />
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] text-muted-foreground">{asg.draftText.length} characters</p>
                                  <Button size="sm" onClick={() => submitAssignment(asgIdx)} disabled={asg.submitting || !asg.draftText.trim()}
                                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                    {asg.submitting ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Submitting…</> : <><Send className="w-3 h-3 mr-1.5" />{isSubmitted ? 'Resubmit' : 'Submit'}</>}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* QUIZZES tab */}
              <TabsContent value="quiz" className="mt-3">
                {!isEnrolled ? (
                  <div className="text-center py-10 text-muted-foreground"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Enroll to access quizzes.</p></div>
                ) : moduleQuizzes.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No quizzes yet.</p></div>
                ) : (
                  <div className="space-y-4">
                    {moduleQuizzes.map((quiz, qIdx) => {
                      if (quiz.quizStarted && !quiz.attempt) return renderQuizInProgress(quiz, qIdx);
                      return (
                        <Card key={quiz.id} className="bg-card border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="min-w-0">
                                <h4 className="font-semibold text-foreground text-sm mb-1">{quiz.title}</h4>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span>{quiz.questions.length} questions</span>
                                  <span>Pass: {quiz.passing_score}%</span>
                                  {quiz.attempt && <span>Score: {Math.round((quiz.attempt.score / quiz.attempt.total) * 100)}%</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {statusBadge(quiz.attempt)}
                                {quiz.attempt
                                  ? <Button size="sm" onClick={() => retakeQuiz(qIdx)} className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"><RotateCcw className="w-3 h-3 mr-1" />Retake</Button>
                                  : <Button size="sm" onClick={() => startQuiz(qIdx)} className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90">Start Quiz</Button>}
                              </div>
                            </div>
                            {quiz.attempt && (
                              <div className="mt-3 pt-3 border-t border-border space-y-2">
                                {quiz.questions.map((q, i) => {
                                  const userAns = quiz.attempt!.answers[i]; const correct = q.answer_index === userAns;
                                  return (
                                    <div key={q.id} className="text-xs">
                                      <p className={`font-medium ${correct ? 'text-emerald-600' : 'text-rose-600'}`}>{correct ? '✓' : '✗'} Q{i + 1}: {q.question}</p>
                                      <p className="text-muted-foreground ml-4">Correct: <span className="text-foreground">{q.options[q.answer_index]}</span>{!correct && <> | Your answer: <span className="text-rose-600">{q.options[userAns] ?? '—'}</span></>}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* GRAND TEST tab */}
              <TabsContent value="grandtest" className="mt-3">
                {!isEnrolled ? (
                  <div className="text-center py-10 text-muted-foreground"><FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Enroll in this course to access the Grand Test.</p></div>
                ) : !allModulesCompleted ? (
                  <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto"><Lock className="w-8 h-8 text-amber-600" /></div>
                    <div>
                      <h3 className="font-bold text-foreground text-balance mb-2">Grand Test Locked</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">Complete all {modules.length} modules to unlock. You've completed {completedCount} so far.</p>
                    </div>
                    <Progress value={enrollment ? enrollment.progress_percent : 0} className="h-2 max-w-xs mx-auto" />
                    <Button onClick={startOrResume} className="bg-primary text-primary-foreground hover:bg-primary/90"><PlayCircle className="w-4 h-4 mr-2" />Continue Learning</Button>
                  </div>
                ) : !grandTest ? (
                  <div className="text-center py-10 text-muted-foreground"><AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Grand Test not available yet.</p></div>
                ) : grandTest.quizStarted && !grandTest.attempt ? renderQuizInProgress(grandTest, 0, true)
                : (
                  <Card className="bg-card border-2 border-amber-200">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0"><Trophy className="w-7 h-7 text-amber-600" /></div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-balance mb-1">{grandTest.title}</h3>
                          <p className="text-xs text-muted-foreground">{grandTest.questions.length} questions · Pass: {grandTest.passing_score}%</p>
                          {grandTest.attempt ? (
                            <div className="mt-3 space-y-3">
                              <div className={`rounded-lg p-4 border ${grandTest.attempt.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                <p className={`font-bold text-lg ${grandTest.attempt.passed ? 'text-emerald-700' : 'text-rose-700'}`}>{grandTest.attempt.passed ? '🎉 Passed!' : '❌ Failed'}</p>
                                <p className="text-sm text-muted-foreground mt-1">Score: {grandTest.attempt.score}/{grandTest.attempt.total} ({Math.round((grandTest.attempt.score / grandTest.attempt.total) * 100)}%)</p>
                                {grandTest.attempt.passed && <p className="text-xs text-emerald-600 mt-1">You are eligible for your certificate!</p>}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => retakeQuiz(0, true)} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"><RotateCcw className="w-3 h-3 mr-1.5" />Retake</Button>
                                {grandTest.attempt.passed && <Link to="/certificates"><Button size="sm" className="h-8 text-xs bg-amber-500 text-white hover:bg-amber-600"><Award className="w-3 h-3 mr-1.5" />View Certificate</Button></Link>}
                              </div>
                            </div>
                          ) : (
                            <Button onClick={() => startQuiz(0, true)} className="mt-3 bg-amber-500 text-white hover:bg-amber-600"><Trophy className="w-4 h-4 mr-2" />Start Grand Test</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* ─────────── RIGHT: Info Sidebar ─────────── */}
          <div className="space-y-4">
            {/* Enrolled / Enroll button */}
            {isEnrolled ? (
              <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 ${isCompleted ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  {isCompleted ? <Trophy className={`w-5 h-5 text-amber-600`} /> : <CheckCircle className="w-5 h-5 text-emerald-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isCompleted ? 'text-amber-700' : 'text-emerald-700'}`}>{isCompleted ? 'Completed' : 'Enrolled'}</p>
                  {!isCompleted && <p className="text-xs text-emerald-600">{enrollment.progress_percent}% complete</p>}
                </div>
                <Button size="sm" onClick={startOrResume} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                  {isCompleted ? 'Review' : 'Continue'}
                </Button>
              </div>
            ) : (
              <Button onClick={handleEnroll} disabled={enrolling} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                {enrolling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling…</> : 'Enroll Now — Free'}
              </Button>
            )}

            {/* Course details card */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="divide-y divide-border">
                {[
                  { label: 'Instructor', value: course.instructor, icon: <Users className="w-3.5 h-3.5" /> },
                  { label: 'Duration', value: `${course.duration_weeks} weeks`, icon: <Clock className="w-3.5 h-3.5" /> },
                  { label: 'Modules', value: `${modules.length} lessons`, icon: <BookOpen className="w-3.5 h-3.5" /> },
                  { label: 'Difficulty', value: course.difficulty, icon: null },
                  { label: 'Certificate', value: 'Included on completion', icon: <Award className="w-3.5 h-3.5" /> },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">{row.icon}{row.label}</span>
                    {row.label === 'Difficulty'
                      ? <span className={`text-xs font-medium px-2 py-0.5 rounded border ${difficultyColor[course.difficulty] ?? 'bg-muted text-foreground border-border'}`}>{row.value}</span>
                      : <span className="text-xs font-medium text-foreground text-right max-w-[55%] truncate">{row.value}</span>}
                  </div>
                ))}
                {/* Rating row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Star className="w-3.5 h-3.5" />Rating</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {course.rating.toFixed(1)} · {course.student_count.toLocaleString()} students
                  </span>
                </div>
              </div>
            </div>

            {/* Topics Covered */}
            {course.topics && course.topics.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Topics Covered</h4>
                <div className="flex flex-wrap gap-2">
                  {course.topics.map(topic => (
                    <span key={topic} className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">{topic}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Earn a Certificate */}
            <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Earn a Certificate</p>
                <p className="text-xs text-muted-foreground mt-0.5 text-pretty">Complete all modules and pass the grand test</p>
              </div>
            </div>

            {/* Progress bar for enrolled */}
            {isEnrolled && !isCompleted && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Your Progress</span>
                  <span className="text-xs font-semibold text-primary">{enrollment.progress_percent}%</span>
                </div>
                <Progress value={enrollment.progress_percent} className="h-2" />
                <p className="text-[11px] text-muted-foreground">{completedCount} of {modules.length} modules completed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
