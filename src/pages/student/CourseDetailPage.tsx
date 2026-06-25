import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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

const getDifficultyColor = (diff: string) => {
  if (diff === 'Beginner') return 'text-secondary-fixed-dim';
  if (diff === 'Intermediate') return 'text-primary-fixed-dim';
  return 'text-tertiary-fixed-dim';
};

const getDifficultyIcon = (diff: string) => {
  if (diff === 'Beginner') return 'speed';
  if (diff === 'Intermediate') return 'trending_up';
  return 'workspace_premium';
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
    <AppLayout title="Loading Course...">
      <div className="max-w-container-max mx-auto p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-6 w-32 bg-surface-container rounded shimmer mb-4" />
        <div className="h-64 w-full bg-surface border border-border-base rounded-2xl shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-24 w-full bg-surface border border-border-base rounded-xl shimmer" />
            <div className="h-48 w-full bg-surface border border-border-base rounded-xl shimmer" />
          </div>
          <div className="lg:col-span-4 h-80 bg-surface border border-border-base rounded-xl shimmer" />
        </div>
      </div>
    </AppLayout>
  );

  if (!course) return (
    <AppLayout title="Not Found">
      <div className="max-w-[1440px] mx-auto text-center py-16 flex flex-col items-center">
        <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">menu_book</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Course not found</h2>
        <Link to="/courses" className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md">Browse Courses</Link>
      </div>
    </AppLayout>
  );

  const isEnrolled = !!enrollment;
  const isCompleted = !!enrollment?.completed_at;
  const completedCount = modules.filter(m => m.status === 'completed').length;
  const allModulesCompleted = modules.length > 0 && completedCount === modules.length;

  const renderQuizInProgress = (quiz: QuizWithState, quizIdx: number, isGT = false) => (
    <div key={quiz.id} className={`bg-surface-container rounded-xl border p-md ${isGT ? 'border-amber-500/50' : 'border-outline-variant/40'}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-label-md text-label-md font-bold text-on-surface">{quiz.title}</h4>
        <span className="font-label-sm text-label-sm px-2 py-1 rounded bg-primary/10 text-primary">{quiz.questions.length} Questions</span>
      </div>
      <div className="space-y-6">
        {quiz.questions.map((q, qiIdx) => (
          <div key={q.id} className="space-y-3">
            <p className="font-body-md text-body-md text-on-surface">{qiIdx + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, optIdx) => (
                <button key={optIdx} onClick={() => selectAnswer(quizIdx, qiIdx, optIdx, isGT)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${quiz.selectedAnswers[qiIdx] === optIdx ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-outline-variant/60 text-on-surface hover:border-primary/40 hover:bg-surface-container-high'}`}>
                  <span className="font-bold mr-3">{String.fromCharCode(65 + optIdx)}.</span>{opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-4 mt-6 border-t border-outline-variant/30">
        <p className="text-sm text-on-surface-variant">{quiz.selectedAnswers.filter(a => a >= 0).length}/{quiz.questions.length} answered</p>
        <button onClick={() => submitQuiz(quizIdx, isGT)} disabled={quiz.submitting || quiz.selectedAnswers.includes(-1)} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 min-h-[44px]">
          {quiz.submitting ? <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
          Submit Quiz
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout title={course.title} noPadding>
      <main className="max-w-container-max mx-auto pt-0 md:pt-stack-xl px-margin-mobile md:px-margin-desktop w-full pb-24 lg:pb-0">
        {/* Link back */}
        <Link to="/courses" className="inline-flex items-center gap-2 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors w-fit mb-6 mt-6 md:mt-0 min-h-[44px]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Catalog
        </Link>
        
        {/* Hero Section */}
        <section className="rounded-xl overflow-hidden relative shadow-[0_4px_20px_rgba(0,0,0,0.04)] mb-8 flex flex-col md:block border border-border-base bg-surface">
          <div className="h-[200px] sm:h-[250px] md:h-[350px] w-full bg-surface-container-low relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-tertiary/30 mix-blend-multiply z-10 pointer-events-none"></div>
            {course.thumbnail_url ? (
               <img src={course.thumbnail_url} alt="Course Hero" className="w-full h-full object-cover opacity-90" />
            ) : (
               <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-[80px] text-outline-variant opacity-30">code_blocks</span>
               </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 hidden md:block"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/20 z-10 md:hidden"></div>
          </div>
          
          {/* Desktop Overlay Content */}
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 text-white z-20 hidden md:block">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-primary/80 text-on-primary font-label-sm text-label-sm px-3 py-1 rounded-full backdrop-blur-sm border border-primary/20">{course.category}</span>
              <span className="bg-tertiary/80 text-on-tertiary font-label-sm text-label-sm px-3 py-1 rounded-full backdrop-blur-sm border border-tertiary/20 flex items-center gap-1">
                 <span className={`material-symbols-outlined text-[14px]`}>{getDifficultyIcon(course.difficulty)}</span>
                 {course.difficulty}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 tracking-tight">{course.title}</h1>
            <div className="flex items-center gap-4 flex-wrap mt-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-warning fill" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="font-label-md text-label-md text-white font-bold">{course.rating.toFixed(1)}</span>
              </div>
              <span className="text-white/50">•</span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white/80">group</span>
                <span className="font-label-md text-label-md text-white/90">{course.student_count.toLocaleString()} already enrolled</span>
              </div>
            </div>
          </div>

          {/* Mobile Details Content (Stacked below image) */}
          <div className="p-5 md:hidden text-text-primary flex flex-col gap-3 bg-surface">
            <div className="flex flex-wrap gap-2">
              <span className="bg-primary/10 text-primary font-label-sm text-xs px-2.5 py-1 rounded-md border border-primary/25 font-bold uppercase tracking-wider">{course.category}</span>
              <span className="bg-tertiary/10 text-tertiary font-label-sm text-xs px-2.5 py-1 rounded-md border border-tertiary/25 flex items-center gap-1 font-bold uppercase tracking-wider">
                 <span className={`material-symbols-outlined text-[14px]`}>{getDifficultyIcon(course.difficulty)}</span>
                 {course.difficulty}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight leading-tight">{course.title}</h1>
            <div className="flex items-center gap-4 flex-wrap mt-1 text-sm text-text-secondary">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-warning text-sm fill">star</span>
                <span className="font-bold text-text-primary">{course.rating.toFixed(1)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">group</span>
                <span>{course.student_count.toLocaleString()} enrolled</span>
              </div>
            </div>
          </div>
        </section>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 flex flex-col gap-12">
            {/* Overview */}
            <section>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4 font-bold">Course Overview</h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-6">
                {course.description}
              </p>
              
              {course.topics && course.topics.length > 0 && (
                <>
                  <h3 className="font-headline-md text-headline-md text-on-surface mt-8 mb-3 font-semibold">Skills You'll Master</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.topics.map(topic => (
                      <span key={topic} className="bg-surface-container text-on-surface border border-border-base font-label-md text-label-md px-4 py-2 rounded-full hover:bg-surface-container-high transition-colors cursor-default">
                        {topic}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Curriculum */}
            <section>
              <div className="flex justify-between items-end mb-6 border-b border-border-base pb-4">
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Curriculum & Tasks</h2>
                <span className="font-label-md text-label-md text-on-surface-variant">{modules.length} Modules</span>
              </div>
              
              <Tabs defaultValue="modules" className="w-full">
                <TabsList className="w-full justify-start bg-transparent overflow-x-auto whitespace-nowrap rounded-none p-0 h-auto gap-2 mb-6 scrollbar-hide scroll-touch snap-x">
                  <TabsTrigger value="modules" className="snap-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-full px-4 py-2 text-on-surface-variant font-label-md">Modules</TabsTrigger>
                  <TabsTrigger value="assignments" className="snap-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-full px-4 py-2 text-on-surface-variant font-label-md">Assignments</TabsTrigger>
                  <TabsTrigger value="quiz" className="snap-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-full px-4 py-2 text-on-surface-variant font-label-md">Quizzes</TabsTrigger>
                  <TabsTrigger value="grandtest" className="snap-center data-[state=active]:bg-tertiary/10 data-[state=active]:text-tertiary border border-transparent data-[state=active]:border-tertiary/20 rounded-full px-4 py-2 text-on-surface-variant font-label-md flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                    Grand Test
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="modules" className="flex flex-col gap-3">
                  {modules.map((mod, idx) => {
                    const accessible = mod.status !== 'locked';
                    return (
                      <div key={mod.id} className={`glass-panel border rounded-xl overflow-hidden transition-all duration-300 ${accessible || isEnrolled ? 'border-border-base hover:border-primary/40 hover:shadow-md' : 'border-outline-variant/30 opacity-70'}`}>
                        <div 
                          onClick={() => {
                            setPreviewModule(mod);
                            if (accessible && isEnrolled) navigate(`/courses/${courseId}/learn/${mod.id}`);
                          }}
                          className={`p-4 sm:p-5 flex justify-between items-center transition-colors ${accessible || isEnrolled ? 'cursor-pointer hover:bg-surface-bright' : 'bg-surface-container-lowest'}`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                              ${mod.status === 'completed' ? 'bg-success/20 text-success' : 
                                mod.status === 'unlocked' || isEnrolled ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                              {mod.status === 'completed' ? <span className="material-symbols-outlined">check</span> : mod.status === 'locked' && !isEnrolled ? <span className="material-symbols-outlined">lock</span> : <span className="font-label-md font-bold">{idx + 1}</span>}
                            </div>
                            <div className="min-w-0">
                              <h4 className={`font-headline-md text-[16px] sm:text-[18px] mb-1 font-bold truncate ${mod.status === 'completed' ? 'text-primary' : 'text-on-surface'}`}>{mod.title}</h4>
                              <p className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">{mod.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-body-sm text-body-sm text-on-surface-variant hidden sm:block">{mod.duration_minutes} min</span>
                            <span className={`material-symbols-outlined transition-colors ${(accessible || isEnrolled) ? 'text-primary' : 'text-on-surface-variant'}`}>play_circle</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="assignments" className="flex flex-col gap-4">
                  {!isEnrolled ? (
                    <div className="glass-panel text-center py-10 text-on-surface-variant rounded-xl border border-border-base bg-surface">
                      <span className="material-symbols-outlined text-[48px] opacity-40 mb-3">assignment</span>
                      <p className="font-body-md font-medium">Enroll in this course to view assignments.</p>
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="glass-panel text-center py-10 text-on-surface-variant rounded-xl border border-border-base bg-surface">
                      <span className="material-symbols-outlined text-[48px] opacity-40 mb-3">assignment_turned_in</span>
                      <p className="font-body-md font-medium">No assignments for this course yet.</p>
                    </div>
                  ) : (
                    assignments.map((asg, asgIdx) => {
                      const sub = asg.submission;
                      const isGraded = sub?.status === 'graded';
                      const isSubmitted = !!sub;
                      return (
                        <div key={asg.id} className="glass-panel border border-border-base rounded-xl p-5 shadow-sm bg-surface">
                          <div className="flex items-start justify-between gap-3 mb-2 border-b border-border-base pb-3">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                              <h4 className="font-headline-md text-[18px] text-on-surface font-bold">{asg.title}</h4>
                            </div>
                            {isGraded && <span className="px-2.5 py-1 rounded bg-success/10 text-success border border-success/20 font-label-sm text-[12px] font-bold">Graded</span>}
                            {isSubmitted && !isGraded && <span className="px-2.5 py-1 rounded bg-secondary/10 text-secondary border border-secondary/20 font-label-sm text-[12px] font-bold">Submitted</span>}
                            {!isSubmitted && <span className="px-2.5 py-1 rounded bg-surface-variant text-on-surface-variant font-label-sm text-[12px] font-bold">Pending</span>}
                          </div>
                          <p className="font-body-md text-body-md text-on-surface-variant mb-4 mt-4 leading-relaxed">{asg.instructions}</p>
                          
                          {isGraded && (
                            <div className="rounded-lg bg-success/5 border border-success/20 p-4 mb-4">
                              <p className="font-label-sm text-label-sm font-bold text-success mb-1">Score: {sub!.score ?? '—'}/100</p>
                              {sub!.feedback && <p className="font-body-sm text-body-sm text-on-surface-variant">{sub!.feedback}</p>}
                            </div>
                          )}
                          {isSubmitted && !isGraded && (
                            <div className="rounded-lg bg-surface-container-low border border-border-base p-4 mb-4">
                              <p className="font-label-sm text-label-sm font-bold text-on-surface mb-2">Your submission:</p>
                              <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">{sub!.answer_text}</p>
                            </div>
                          )}
                          {!isGraded && (
                            <div className="space-y-3">
                              <Textarea placeholder="Write your answer here…" value={asg.draftText} onChange={e => updateDraft(asgIdx, e.target.value)} className="min-h-[120px] bg-surface text-on-surface border-border-base focus:border-primary resize-none font-body-sm text-body-sm p-3 focus:ring-2 focus:ring-primary/20" disabled={asg.submitting} />
                              <div className="flex items-center justify-between">
                                <p className="text-[12px] text-on-surface-variant">{asg.draftText.length} characters</p>
                                <button onClick={() => submitAssignment(asgIdx)} disabled={asg.submitting || !asg.draftText.trim()} className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold flex items-center gap-2 hover:bg-primary-container disabled:opacity-50 transition-colors min-h-[38px] active:scale-95">
                                  {asg.submitting ? <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
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
                    <div className="glass-panel text-center py-10 text-on-surface-variant rounded-xl border border-border-base bg-surface"><span className="material-symbols-outlined text-[48px] opacity-40 mb-3">quiz</span><p className="font-body-md font-medium">Enroll to access quizzes.</p></div>
                  ) : moduleQuizzes.length === 0 ? (
                    <div className="glass-panel text-center py-10 text-on-surface-variant rounded-xl border border-border-base bg-surface"><span className="material-symbols-outlined text-[48px] opacity-40 mb-3">quiz</span><p className="font-body-md font-medium">No quizzes yet.</p></div>
                  ) : (
                    moduleQuizzes.map((quiz, qIdx) => {
                      if (quiz.quizStarted && !quiz.attempt) return renderQuizInProgress(quiz, qIdx);
                      return (
                        <div key={quiz.id} className="glass-panel border border-border-base rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 flex-wrap bg-surface">
                          <div>
                            <h4 className="font-headline-md text-[18px] text-on-surface mb-1 font-bold">{quiz.title}</h4>
                            <div className="flex gap-4 text-sm text-on-surface-variant font-medium">
                              <span>{quiz.questions.length} questions</span>
                              <span>Pass: {quiz.passing_score}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {quiz.attempt && (
                              <span className={`font-label-sm text-label-sm px-3 py-1 rounded-full border font-bold ${quiz.attempt.passed ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'}`}>
                                {quiz.attempt.passed ? 'Passed' : 'Failed'} ({Math.round((quiz.attempt.score / quiz.attempt.total) * 100)}%)
                              </span>
                            )}
                            <button onClick={() => quiz.attempt ? retakeQuiz(qIdx) : startQuiz(qIdx)} className="px-5 py-2.5 bg-surface hover:bg-surface-container-low border border-border-base text-on-surface hover:text-primary hover:border-primary/50 rounded-lg font-label-md font-bold transition-all shadow-sm active:scale-95 min-h-[38px] flex items-center">
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
                    <div className="glass-panel text-center py-10 text-on-surface-variant rounded-xl border border-border-base bg-surface"><span className="material-symbols-outlined text-[48px] opacity-40 mb-3">workspace_premium</span><p className="font-body-md font-medium">Enroll in this course to access the Grand Test.</p></div>
                  ) : !allModulesCompleted ? (
                    <div className="glass-panel border border-border-base rounded-xl p-8 text-center flex flex-col items-center bg-surface">
                      <div className="w-20 h-20 rounded-full bg-surface-container border border-border-base flex items-center justify-center mb-6 shadow-sm"><span className="material-symbols-outlined text-[40px] text-on-surface-variant">lock</span></div>
                      <h3 className="font-headline-md text-[24px] font-bold text-on-surface mb-2">Grand Test Locked</h3>
                      <p className="font-body-md text-on-surface-variant max-w-sm mb-8 leading-relaxed">Complete all {modules.length} modules to unlock. You've completed {completedCount} so far.</p>
                      <div className="w-full max-w-md h-3 bg-surface-container-high rounded-full overflow-hidden mb-8 shadow-inner">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${enrollment?.progress_percent ?? 0}%` }}></div>
                      </div>
                      <button onClick={startOrResume} className="px-8 py-3 bg-primary text-on-primary rounded-xl font-label-md font-bold hover:bg-primary-container transition-colors shadow-md flex items-center gap-2 min-h-[44px] active:scale-95">
                        <span className="material-symbols-outlined text-[20px]">play_arrow</span> Continue Learning
                      </button>
                    </div>
                  ) : !grandTest ? (
                    <div className="glass-panel text-center py-10 text-on-surface-variant rounded-xl border border-border-base bg-surface"><span className="material-symbols-outlined text-[48px] opacity-40 mb-3">pending</span><p className="font-body-md font-medium">Grand Test not available yet.</p></div>
                  ) : grandTest.quizStarted && !grandTest.attempt ? renderQuizInProgress(grandTest, 0, true)
                  : (
                    <div className="bg-surface border-2 border-tertiary/40 rounded-xl p-8 relative overflow-hidden shadow-lg">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                        <div className="w-24 h-24 rounded-full bg-tertiary/10 border-2 border-tertiary/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(99,46,205,0.2)]">
                          <span className="material-symbols-outlined text-tertiary text-[48px]">workspace_premium</span>
                        </div>
                        <div className="flex-1 min-w-0 text-center md:text-left">
                          <h3 className="font-headline-md text-[28px] font-bold text-on-surface mb-2">{grandTest.title}</h3>
                          <p className="font-body-md text-on-surface-variant mb-6 font-semibold">{grandTest.questions.length} questions · Pass requirement: {grandTest.passing_score}%</p>
                          
                          {grandTest.attempt ? (
                            <div className="space-y-6">
                              <div className={`p-6 rounded-xl border ${grandTest.attempt.passed ? 'bg-success/5 border-success/30' : 'bg-error/5 border-error/30'}`}>
                                <p className={`font-bold text-[24px] mb-2 ${grandTest.attempt.passed ? 'text-success' : 'text-error'}`}>{grandTest.attempt.passed ? 'Congratulations! Passed!' : 'Not quite there yet.'}</p>
                                <p className="font-body-lg text-on-surface-variant">Score: {grandTest.attempt.score}/{grandTest.attempt.total} ({Math.round((grandTest.attempt.score / grandTest.attempt.total) * 100)}%)</p>
                                {grandTest.attempt.passed && <p className="font-label-md text-success mt-4 flex items-center justify-center md:justify-start gap-2 bg-success/10 w-fit px-4 py-2 rounded-lg border border-success/20 font-bold"><span className="material-symbols-outlined text-[20px]">check_circle</span> You are eligible for your certificate!</p>}
                              </div>
                              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <button onClick={() => retakeQuiz(0, true)} className="px-6 py-3 bg-surface text-on-surface border border-border-base hover:bg-surface-container-low rounded-xl font-label-md font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 min-h-[44px]">
                                  <span className="material-symbols-outlined text-[20px]">refresh</span> Retake Test
                                </button>
                                {grandTest.attempt.passed && (
                                  <Link to="/certificates" className="px-6 py-3 bg-tertiary text-on-tertiary rounded-xl font-label-md font-bold flex items-center gap-2 hover:bg-tertiary/90 shadow-[0_0_15px_rgba(99,46,205,0.4)] transition-all active:scale-95 min-h-[44px]">
                                    <span className="material-symbols-outlined text-[20px]">military_tech</span> View Certificate
                                  </Link>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => startQuiz(0, true)} className="px-8 py-3 bg-tertiary text-on-tertiary rounded-xl font-label-md font-bold flex items-center justify-center md:justify-start gap-2 hover:bg-tertiary/90 shadow-[0_0_15px_rgba(99,46,205,0.3)] transition-all active:scale-95 w-full md:w-auto min-h-[44px]">
                              <span className="material-symbols-outlined text-[24px]">play_arrow</span> Start Grand Test
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
              <section>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-6 font-bold">Your Instructor</h2>
                <div className="glass-panel border border-border-base rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start hover:shadow-md transition-shadow bg-surface">
                  <div className="w-20 h-20 rounded-full object-cover border-2 border-surface shadow-sm bg-surface-container flex items-center justify-center shrink-0 relative overflow-hidden">
                     <span className="font-display text-3xl font-extrabold text-primary">
                        {course.instructor.split(' ').map(n => n[0]).join('').slice(0, 2)}
                     </span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold">{course.instructor}</h3>
                    <p className="font-body-md text-body-md text-primary font-semibold mb-2">LearnLoom Educator</p>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                      A dedicated professional with extensive experience in the industry, passionate about sharing knowledge and empowering the next generation of engineers through comprehensive, practical coursework.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar (Desktop only for full layout, falls to bottom on mobile) */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="sticky top-[100px] glass-panel border border-border-base rounded-xl p-6 shadow-sm bg-surface">
              {/* Video Preview */}
              <div className="aspect-video bg-surface-container-highest rounded-lg overflow-hidden border border-border-base relative flex items-center justify-center group mb-6 shadow-inner">
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
                        return thumbUrl ? <img src={thumbUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" /> : <span className="material-symbols-outlined text-[48px] text-outline-variant">smart_display</span>;
                      })()}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                      <div onClick={handleEnroll} className="w-16 h-16 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center z-10 border border-border-base group-hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg">
                        <span className="material-symbols-outlined text-[36px] text-primary fill pl-1">play_arrow</span>
                      </div>
                    </>
                  )
                ) : (
                  <span className="material-symbols-outlined text-[48px] text-outline-variant">smart_display</span>
                )}
              </div>
              
              {!isEnrolled && (
                <div className="mb-6 pb-4 border-b border-border-base">
                  <h2 className="font-display text-4xl font-extrabold text-on-surface mb-1">Free</h2>
                  <p className="font-body-md text-body-md text-success flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[18px]">bolt</span> Full Lifetime Access
                  </p>
                </div>
              )}
              
              {isEnrolled ? (
                <div className="flex flex-col gap-4 mb-6 border-b border-border-base pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-md text-on-surface font-semibold">Your Progress</span>
                    <span className="font-label-md text-primary font-extrabold">{enrollment.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-primary rounded-full transition-all duration-500 relative" style={{ width: `${enrollment.progress_percent}%` }}>
                       <div className="absolute inset-0 bg-white/20"></div>
                    </div>
                  </div>
                  <button onClick={startOrResume} className="w-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-3.5 rounded-xl transition-all duration-200 active:scale-95 shadow-[0_4px_14px_rgba(37,99,235,0.3)] mt-2 flex justify-center items-center gap-2 font-bold min-h-[44px]">
                    {isCompleted ? 'Review Course' : 'Continue Learning'}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              ) : (
                <button onClick={handleEnroll} disabled={enrolling} className="w-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-3.5 rounded-xl mb-3 transition-all duration-200 active:scale-95 shadow-[0_4px_14px_rgba(37,99,235,0.3)] flex justify-center items-center gap-2 disabled:opacity-70 disabled:pointer-events-none font-bold min-h-[44px]">
                  {enrolling ? <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span> : null}
                  <span>Enroll Now</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}
              
              <div className="mt-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary/70">schedule</span>
                  <span className="font-body-md text-body-md">{course.duration_weeks} weeks of content</span>
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary/70">signal_cellular_alt</span>
                  <span className="font-body-md text-body-md">{course.difficulty} Level</span>
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary/70">workspace_premium</span>
                  <span className="font-body-md text-body-md">Certificate of Completion</span>
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary/70">all_inclusive</span>
                  <span className="font-body-md text-body-md">Full Lifetime Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom CTA */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border-base p-4 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Access</div>
            <div className="text-xl font-extrabold text-on-surface leading-tight">Free</div>
          </div>
          {isEnrolled ? (
            <button onClick={startOrResume} className="bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 min-h-[44px]">
              {isCompleted ? 'Review' : 'Continue'}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <button onClick={handleEnroll} disabled={enrolling} className="bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-bold px-8 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 min-h-[44px] disabled:opacity-75">
              {enrolling && <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>}
              Enroll Now
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
        </div>

      </main>
    </AppLayout>
  );
}
