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
  if (diff === 'Beginner') return 'text-secondary';
  if (diff === 'Intermediate') return 'text-primary';
  return 'text-gold-tier';
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
      <div className="max-w-[1440px] mx-auto p-xl flex justify-center items-center h-64">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">autorenew</span>
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
        <button onClick={() => submitQuiz(quizIdx, isGT)} disabled={quiz.submitting || quiz.selectedAnswers.includes(-1)} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50">
          {quiz.submitting ? <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
          Submit Quiz
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout title={course.title}>
      <div className="max-w-[1440px] mx-auto w-full relative">
        <div className="absolute top-0 left-1/4 w-1/2 h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="p-md sm:p-xl lg:p-2xl relative z-10 grid gap-2xl">
          <Link to="/courses" className="inline-flex items-center gap-2 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors w-fit">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Catalog
          </Link>

          <section className="grid lg:grid-cols-[1fr_400px] gap-xl items-start">
            <div className="flex flex-col gap-lg">
              <div className="flex flex-wrap gap-sm items-center">
                <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-md py-xs rounded-full border border-outline-variant/60 flex items-center gap-xs">
                  <span className="material-symbols-outlined text-xs text-secondary">code</span>
                  {course.category}
                </span>
                <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-md py-xs rounded-full border border-outline-variant/60 flex items-center gap-xs">
                  <span className={`material-symbols-outlined text-xs ${getDifficultyColor(course.difficulty)}`}>{getDifficultyIcon(course.difficulty)}</span>
                  {course.difficulty}
                </span>
              </div>
              
              <h1 className="font-display text-display font-bold text-on-surface tracking-tight leading-tight hidden md:block">
                {course.title.split(':').map((part, i, arr) => (
                  <span key={i}>
                    {i === 0 && arr.length > 1 ? <>{part}:<br/><span className="text-gradient">{arr.slice(1).join(':')}</span></> : part}
                  </span>
                ))}
              </h1>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface md:hidden">
                {course.title}
              </h1>
              
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                {course.description}
              </p>

              <div className="flex items-center gap-lg border-y border-outline-variant/30 py-md mt-sm">
                <div className="flex items-center gap-sm">
                  <div className="flex text-gold-tier">
                    <span className="material-symbols-outlined fill text-[18px]">star</span>
                    <span className="font-body-md text-body-md font-bold text-on-surface ml-1">{course.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="w-px h-6 bg-outline-variant/60 hidden sm:block"></div>
                <div className="flex items-center gap-sm hidden sm:flex">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">group</span>
                  <span className="font-label-md text-label-md text-on-surface">{course.student_count.toLocaleString()} Students</span>
                </div>
              </div>

              {course.topics && course.topics.length > 0 && (
                <div className="mt-xl">
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-md">Topics Covered</h2>
                  <div className="flex flex-wrap gap-md">
                    {course.topics.map((topic, i) => {
                      const colors = ['text-primary', 'text-[#3178c6]', 'text-secondary'];
                      return (
                        <span key={topic} className={`bg-surface-container px-sm py-xs rounded border border-outline-variant/40 font-label-sm text-label-sm flex items-center gap-xs ${colors[i % colors.length]}`}>
                          {topic}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-xl">
                <div className="flex items-center justify-between mb-md">
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Curriculum & Tasks</h2>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{modules.length} Modules</span>
                </div>
                
                <Tabs defaultValue="modules" className="w-full">
                  <TabsList className="w-full justify-start bg-transparent border-b border-outline-variant/30 overflow-x-auto whitespace-nowrap rounded-none p-0 h-auto gap-4">
                    <TabsTrigger value="modules" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-on-surface-variant">Modules</TabsTrigger>
                    <TabsTrigger value="assignments" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-on-surface-variant">Assignments</TabsTrigger>
                    <TabsTrigger value="quiz" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-on-surface-variant">Quizzes</TabsTrigger>
                    <TabsTrigger value="grandtest" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-on-surface-variant">Grand Test</TabsTrigger>
                  </TabsList>

                  <TabsContent value="modules" className="mt-4 flex flex-col gap-sm">
                    {modules.map((mod, idx) => {
                      const accessible = mod.status !== 'locked';
                      return (
                        <div key={mod.id} className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg overflow-hidden group">
                          <div 
                            onClick={() => {
                              setPreviewModule(mod);
                              if (accessible && isEnrolled) navigate(`/courses/${courseId}/learn/${mod.id}`);
                            }}
                            className={`p-md flex items-center justify-between transition-colors ${accessible || isEnrolled ? 'cursor-pointer hover:bg-surface-container bg-surface-container-low' : 'bg-surface-lowest opacity-60'}`}
                          >
                            <div className="flex items-center gap-md min-w-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm text-label-sm shrink-0
                                ${mod.status === 'completed' ? 'bg-primary/20 text-primary border border-primary/30' : 
                                  mod.status === 'unlocked' || isEnrolled ? 'bg-surface-variant text-on-surface' : 'bg-surface-variant/50 text-on-surface-variant'}`}>
                                {mod.status === 'completed' ? <span className="material-symbols-outlined text-[16px]">check</span> : mod.status === 'locked' && !isEnrolled ? <span className="material-symbols-outlined text-[16px]">lock</span> : idx + 1}
                              </div>
                              <div className="min-w-0">
                                <h3 className={`font-label-md text-label-md font-bold truncate ${mod.status === 'completed' ? 'text-primary' : 'text-on-surface'}`}>{mod.title}</h3>
                                <p className="text-[12px] text-on-surface-variant truncate mt-0.5">{mod.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant shrink-0 ml-4">
                              <span className="hidden sm:inline">{mod.duration_minutes} min</span>
                              <span className={`material-symbols-outlined text-[18px] ml-sm transition-transform duration-200 ${(accessible || isEnrolled) ? 'group-hover:translate-x-1 group-hover:text-primary' : ''}`}>play_circle</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="assignments" className="mt-4 flex flex-col gap-sm">
                    {!isEnrolled ? (
                      <div className="text-center py-10 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[48px] opacity-40 mb-3">assignment</span>
                        <p className="font-body-md">Enroll in this course to view assignments.</p>
                      </div>
                    ) : assignments.length === 0 ? (
                      <div className="text-center py-10 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[48px] opacity-40 mb-3">assignment_turned_in</span>
                        <p className="font-body-md">No assignments for this course yet.</p>
                      </div>
                    ) : (
                      assignments.map((asg, asgIdx) => {
                        const sub = asg.submission;
                        const isGraded = sub?.status === 'graded';
                        const isSubmitted = !!sub;
                        return (
                          <div key={asg.id} className="bg-surface-container border border-outline-variant/40 rounded-xl p-md">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                                <h4 className="font-label-md text-label-md font-bold text-on-surface">{asg.title}</h4>
                              </div>
                              {isGraded && <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-label-sm text-[10px]">Graded</span>}
                              {isSubmitted && !isGraded && <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 font-label-sm text-[10px]">Submitted</span>}
                              {!isSubmitted && <span className="px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant font-label-sm text-[10px]">Pending</span>}
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">{asg.instructions}</p>
                            
                            {isGraded && (
                              <div className="rounded-lg bg-primary/5 border border-primary/20 p-sm mb-4">
                                <p className="font-label-sm text-label-sm font-bold text-primary mb-1">Score: {sub!.score ?? '—'}/100</p>
                                {sub!.feedback && <p className="font-body-sm text-body-sm text-on-surface-variant">{sub!.feedback}</p>}
                              </div>
                            )}
                            {isSubmitted && !isGraded && (
                              <div className="rounded-lg bg-surface-container-high border border-outline-variant/40 p-sm mb-4">
                                <p className="font-label-sm text-label-sm font-bold text-on-surface mb-1">Your submission:</p>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">{sub!.answer_text}</p>
                              </div>
                            )}
                            {!isGraded && (
                              <div className="space-y-2">
                                <Textarea placeholder="Write your answer here…" value={asg.draftText} onChange={e => updateDraft(asgIdx, e.target.value)} className="min-h-[100px] bg-surface text-on-surface border-outline-variant/50 focus:border-primary resize-none font-body-sm text-body-sm" disabled={asg.submitting} />
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] text-on-surface-variant">{asg.draftText.length} characters</p>
                                  <button onClick={() => submitAssignment(asgIdx)} disabled={asg.submitting || !asg.draftText.trim()} className="px-4 py-1.5 bg-primary text-on-primary rounded font-label-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50">
                                    {asg.submitting ? <span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[16px]">send</span>}
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

                  <TabsContent value="quiz" className="mt-4 flex flex-col gap-sm">
                    {!isEnrolled ? (
                      <div className="text-center py-10 text-on-surface-variant"><span className="material-symbols-outlined text-[48px] opacity-40 mb-3">quiz</span><p className="font-body-md">Enroll to access quizzes.</p></div>
                    ) : moduleQuizzes.length === 0 ? (
                      <div className="text-center py-10 text-on-surface-variant"><span className="material-symbols-outlined text-[48px] opacity-40 mb-3">quiz</span><p className="font-body-md">No quizzes yet.</p></div>
                    ) : (
                      moduleQuizzes.map((quiz, qIdx) => {
                        if (quiz.quizStarted && !quiz.attempt) return renderQuizInProgress(quiz, qIdx);
                        return (
                          <div key={quiz.id} className="bg-surface-container border border-outline-variant/40 rounded-xl p-md flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <h4 className="font-label-md text-label-md font-bold text-on-surface mb-1">{quiz.title}</h4>
                              <div className="flex gap-4 text-xs text-on-surface-variant">
                                <span>{quiz.questions.length} questions</span>
                                <span>Pass: {quiz.passing_score}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {quiz.attempt && (
                                <span className={`font-label-sm text-label-sm px-2 py-1 rounded border ${quiz.attempt.passed ? 'bg-primary/10 text-primary border-primary/20' : 'bg-error/10 text-error border-error/20'}`}>
                                  {quiz.attempt.passed ? 'Passed' : 'Failed'} ({Math.round((quiz.attempt.score / quiz.attempt.total) * 100)}%)
                                </span>
                              )}
                              <button onClick={() => quiz.attempt ? retakeQuiz(qIdx) : startQuiz(qIdx)} className="px-4 py-1.5 bg-surface-container-high border border-outline-variant/60 text-on-surface hover:text-primary hover:border-primary/50 rounded font-label-sm transition-colors">
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
                      <div className="text-center py-10 text-on-surface-variant"><span className="material-symbols-outlined text-[48px] opacity-40 mb-3">workspace_premium</span><p className="font-body-md">Enroll in this course to access the Grand Test.</p></div>
                    ) : !allModulesCompleted ? (
                      <div className="bg-surface-container border border-outline-variant/40 rounded-xl p-xl text-center flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant/60 flex items-center justify-center mb-4"><span className="material-symbols-outlined text-[32px] text-on-surface-variant">lock</span></div>
                        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">Grand Test Locked</h3>
                        <p className="font-body-md text-on-surface-variant max-w-sm mb-6">Complete all {modules.length} modules to unlock. You've completed {completedCount} so far.</p>
                        <div className="w-full max-w-xs h-2 bg-surface-container-highest rounded-full overflow-hidden mb-6">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${enrollment?.progress_percent ?? 0}%` }}></div>
                        </div>
                        <button onClick={startOrResume} className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">play_arrow</span> Continue Learning
                        </button>
                      </div>
                    ) : !grandTest ? (
                      <div className="text-center py-10 text-on-surface-variant"><span className="material-symbols-outlined text-[48px] opacity-40 mb-3">pending</span><p className="font-body-md">Grand Test not available yet.</p></div>
                    ) : grandTest.quizStarted && !grandTest.attempt ? renderQuizInProgress(grandTest, 0, true)
                    : (
                      <div className="bg-surface-container border-2 border-gold-tier/50 rounded-xl p-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-tier/10 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="flex items-start gap-4 relative z-10">
                          <div className="w-14 h-14 rounded-full bg-gold-tier/20 border border-gold-tier/40 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-gold-tier text-[28px]">workspace_premium</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">{grandTest.title}</h3>
                            <p className="font-body-sm text-on-surface-variant mb-4">{grandTest.questions.length} questions · Pass: {grandTest.passing_score}%</p>
                            
                            {grandTest.attempt ? (
                              <div className="space-y-4">
                                <div className={`p-4 rounded-lg border ${grandTest.attempt.passed ? 'bg-primary/10 border-primary/30' : 'bg-error/10 border-error/30'}`}>
                                  <p className={`font-bold text-lg ${grandTest.attempt.passed ? 'text-primary' : 'text-error'}`}>{grandTest.attempt.passed ? '🎉 Passed!' : '❌ Failed'}</p>
                                  <p className="font-body-sm text-on-surface-variant mt-1">Score: {grandTest.attempt.score}/{grandTest.attempt.total} ({Math.round((grandTest.attempt.score / grandTest.attempt.total) * 100)}%)</p>
                                  {grandTest.attempt.passed && <p className="font-label-sm text-primary mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> You are eligible for your certificate!</p>}
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => retakeQuiz(0, true)} className="px-4 py-2 bg-surface-container-high text-on-surface border border-outline-variant/60 hover:bg-surface-container-highest rounded-lg font-label-md flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">refresh</span> Retake
                                  </button>
                                  {grandTest.attempt.passed && (
                                    <Link to="/certificates" className="px-4 py-2 bg-gold-tier text-on-tertiary-fixed rounded-lg font-label-md font-bold flex items-center gap-2 hover:bg-gold-tier/90">
                                      <span className="material-symbols-outlined text-[18px]">military_tech</span> View Certificate
                                    </Link>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => startQuiz(0, true)} className="px-6 py-2 bg-gold-tier text-on-tertiary-fixed rounded-lg font-label-md font-bold flex items-center gap-2 hover:bg-gold-tier/90">
                                <span className="material-symbols-outlined text-[20px]">workspace_premium</span> Start Grand Test
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {course.instructor && (
                <section className="mt-xl pt-xl border-t border-outline-variant/30">
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-lg">Your Instructor</h2>
                  <div className="flex flex-col sm:flex-row gap-lg items-start">
                    <div className="w-32 h-32 rounded-xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[48px] text-on-surface-variant">person</span>
                    </div>
                    <div className="flex flex-col gap-sm">
                      <div>
                        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{course.instructor}</h3>
                        <p className="font-label-md text-label-md text-primary mt-xs">LearnLoom Educator</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-lg flex flex-col gap-md sticky top-24 glow-indigo shadow-xl">
              <div className="aspect-video bg-surface-container-highest rounded-lg overflow-hidden border border-outline-variant/30 relative flex items-center justify-center group">
                {previewModule?.youtube_url ? (
                  isEnrolled ? (
                    <iframe 
                      src={buildYouTubeEmbedUrl(previewModule.youtube_url)} 
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
                        return thumbUrl ? <img src={thumbUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300" /> : <span className="material-symbols-outlined text-[48px] text-outline-variant">smart_display</span>;
                      })()}
                      <div onClick={handleEnroll} className="w-16 h-16 bg-surface/80 backdrop-blur-sm rounded-full flex items-center justify-center z-10 border border-outline-variant/60 group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                        <span className="material-symbols-outlined text-display text-primary fill">play_arrow</span>
                      </div>
                    </>
                  )
                ) : (
                  <span className="material-symbols-outlined text-[48px] text-outline-variant">smart_display</span>
                )}
              </div>
              
              {!isEnrolled && (
                <div className="flex items-baseline gap-sm">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">Free</span>
                </div>
              )}
              
              {isEnrolled ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-on-surface">Your Progress</span>
                    <span className="font-label-md text-primary">{enrollment.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${enrollment.progress_percent}%` }}></div>
                  </div>
                  <button onClick={startOrResume} className="w-full bg-primary text-on-primary font-label-md text-label-md font-bold py-md rounded-lg hover:bg-primary/90 transition-colors duration-200 active:scale-[0.98] shadow-[0_0_12px_rgba(192,193,255,0.3)] mt-2">
                    {isCompleted ? 'Review Course' : 'Continue Learning'}
                  </button>
                </div>
              ) : (
                <button onClick={handleEnroll} disabled={enrolling} className="w-full bg-primary text-on-primary font-label-md text-label-md font-bold py-md rounded-lg hover:bg-primary/90 transition-colors duration-200 active:scale-[0.98] shadow-[0_0_12px_rgba(192,193,255,0.3)] flex justify-center items-center gap-2">
                  {enrolling ? <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span> : null}
                  Enroll Now
                </button>
              )}
              
              <div className="flex flex-col gap-sm font-label-sm text-label-sm text-on-surface-variant mt-sm">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {course.duration_weeks} weeks of content
                </div>
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-sm">menu_book</span>
                  {modules.length} interactive modules
                </div>
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-sm">workspace_premium</span>
                  Certificate of completion
                </div>
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-sm">all_inclusive</span>
                  Lifetime access
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
