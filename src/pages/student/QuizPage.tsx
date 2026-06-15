import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  course_id: string;
  is_grand_test: boolean;
  courses?: { title: string };
}

interface Question {
  id: string;
  question: string;
  options: string[];
  answer_index: number;
}

interface Attempt {
  score: number;
  total: number;
  passed: boolean;
  completed_at: string;
}

export default function QuizPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pastAttempt, setPastAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // Fetch enrolled course quizzes (non-grand-test)
      const { data: enrollments } = await supabase
        .from('user_course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);
      const courseIds = (enrollments ?? []).map(e => e.course_id);
      if (courseIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from('quizzes')
        .select('*, courses!quizzes_course_id_fkey(title)')
        .in('course_id', courseIds)
        .eq('is_grand_test', false)
        .order('created_at', { ascending: true });
      setQuizzes(data ?? []);
      if (data && data.length > 0) setSelectedQuiz(data[0]);
      setLoading(false);
    })();
  }, [user]);

  const loadQuizData = useCallback(async (quiz: Quiz) => {
    if (!user) return;
    setLoadingQuestions(true);
    const [qRes, aRes] = await Promise.all([
      supabase.from('quiz_questions').select('*').eq('quiz_id', quiz.id).order('sort_order', { ascending: true }),
      supabase.from('quiz_attempts').select('score,total,passed,completed_at').eq('user_id', user.id).eq('quiz_id', quiz.id).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setQuestions(qRes.data ?? []);
    setPastAttempt(aRes.data ?? null);
    setLoadingQuestions(false);
  }, [user]);

  useEffect(() => {
    if (selectedQuiz) {
      setStarted(false); setShowResult(false); setCurrent(0); setSelectedOpt(null); setAnswers([]);
      loadQuizData(selectedQuiz);
    }
  }, [selectedQuiz, loadQuizData]);

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[current] = selectedOpt;
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelectedOpt(newAnswers[current + 1] ?? null);
    } else {
      handleFinish(newAnswers);
    }
  };

  const handleFinish = async (finalAnswers: (number | null)[]) => {
    if (!user || !selectedQuiz) return;
    setSubmitting(true);
    const correct = finalAnswers.filter((a, i) => a === questions[i]?.answer_index).length;
    const total = questions.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= selectedQuiz.passing_score;
    setFinalScore(score);

    const { error } = await supabase.from('quiz_attempts').upsert(
      { user_id: user.id, quiz_id: selectedQuiz.id, answers: finalAnswers, score: correct, total, passed },
      { onConflict: 'user_id,quiz_id' }
    );
    if (error) toast.error('Failed to save result', { description: error.message });
    else {
      setPastAttempt({ score: correct, total, passed, completed_at: new Date().toISOString() });
      toast[passed ? 'success' : 'info'](passed ? `Passed! Score: ${score}%` : `Score: ${score}% — Keep practising!`);
      // Log activity for streak tracking (fire-and-forget)
      void supabase.rpc('log_activity', { p_user_id: user.id, p_type: 'quiz', p_value: 1 }).then(() => {});
    }
    setSubmitting(false);
    setShowResult(true);
  };

  const reset = () => {
    setStarted(false); setCurrent(0); setSelectedOpt(null);
    setAnswers([]); setShowResult(false);
  };

  if (loading) {
    return (
      <AppLayout title="Quizzes">
        <div className="max-w-[1440px] mx-auto space-y-md">
          <Skeleton className="h-12 w-48 bg-surface-container rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
             <div className="space-y-sm"><Skeleton className="h-16 w-full bg-surface-container rounded-xl" /><Skeleton className="h-16 w-full bg-surface-container rounded-xl" /></div>
             <Skeleton className="md:col-span-2 h-[400px] w-full bg-surface-container rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (quizzes.length === 0) {
    return (
      <AppLayout title="Quizzes">
        <div className="max-w-[1440px] mx-auto flex justify-center items-center h-[calc(100vh-12rem)]">
          <div className="text-center p-xl bg-surface-container rounded-xl border border-outline-variant/60">
            <span className="material-symbols-outlined text-[48px] text-outline opacity-40 mb-3">quiz</span>
            <p className="font-headline-md text-headline-md text-on-surface">No quizzes available</p>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Enroll in a course to unlock its quizzes.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (started && !showResult) {
    const q = questions[current];
    return (
      <div className="min-h-screen flex flex-col font-body-md bg-background text-on-background">
        {/* Active Quiz Header */}
        <header className="bg-surface/80 backdrop-blur-md border-b border-outline-variant/60 fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16">
          <div className="flex items-center gap-md">
            <button 
              onClick={reset}
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-variant/50"
              title="Exit Quiz"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>close</span>
            </button>
            <span className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight truncate max-w-[200px] md:max-w-none">
              {selectedQuiz?.title}
            </span>
          </div>
          <div className="flex items-center gap-xl">
            {/* Progress Stepper */}
            <div className="hidden md:flex items-center gap-sm">
              {questions.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-8 h-2 rounded-full ${i <= current ? 'bg-primary shadow-[0_0_8px_rgba(192,193,255,0.4)]' : 'bg-surface-variant'}`}
                />
              ))}
              <span className="font-label-sm text-label-sm text-on-surface-variant ml-sm">{current + 1}/{questions.length}</span>
            </div>
            {/* Timer placeholder */}
            <div className="flex items-center gap-xs font-label-md text-label-md text-primary bg-primary/10 px-md py-sm rounded-full border border-primary/20">
              <span className="material-symbols-outlined text-[18px]">timer</span>
              <span className="text-shadow-[0_0_10px_rgba(192,193,255,0.5)]">15:00</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex justify-center items-start pt-[104px] pb-xl px-md md:px-lg overflow-y-auto">
          <div className="w-full max-w-3xl flex flex-col gap-xl">
            {q && (
              <>
                <section className="flex flex-col gap-md">
                  <div className="flex justify-between items-start gap-md">
                    <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface whitespace-pre-wrap leading-tight">
                      {q.question}
                    </h1>
                    <button className="shrink-0 flex items-center gap-xs font-label-sm text-label-sm text-secondary bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 px-md py-sm rounded-full transition-colors">
                      <span className="material-symbols-outlined text-[16px]">psychology</span> AI Hint
                    </button>
                  </div>
                </section>

                <section className="flex flex-col gap-sm mt-md">
                  {q.options.map((option, i) => (
                    <label 
                      key={i} 
                      className={`group relative flex items-center p-md rounded-lg border transition-all cursor-pointer ${selectedOpt === i ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(192,193,255,0.05)]' : 'bg-surface-container-low border-outline-variant/60 hover:border-primary/50 hover:bg-surface-container'}`}
                    >
                      <input 
                        type="radio" 
                        name="answer" 
                        className="sr-only peer" 
                        checked={selectedOpt === i}
                        onChange={() => setSelectedOpt(i)}
                      />
                      <div className={`flex items-center justify-center w-6 h-6 rounded border mr-md transition-colors ${selectedOpt === i ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                        <span className={`material-symbols-outlined text-[16px] ${selectedOpt === i ? 'text-on-primary' : 'opacity-0'}`}>check</span>
                      </div>
                      <div className={`flex-1 font-body-md text-body-md transition-colors ${selectedOpt === i ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                        {option}
                      </div>
                      <div className={`font-label-sm text-label-sm px-sm py-xs border rounded ml-md ${selectedOpt === i ? 'text-primary border-primary/50 bg-primary/10' : 'text-outline border-outline/30 bg-surface-container-lowest'}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                    </label>
                  ))}
                </section>

                <div className="flex justify-between items-center mt-xl pt-md border-t border-outline-variant/30">
                  <button 
                    onClick={() => { setCurrent(current - 1); setSelectedOpt(answers[current - 1] ?? null); }}
                    disabled={current === 0 || submitting}
                    className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface px-xl py-sm transition-colors disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={handleNext}
                    disabled={selectedOpt === null || submitting}
                    className="font-label-md text-label-md bg-primary text-on-primary-container px-2xl py-md rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] flex items-center gap-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <><span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving...</>
                    ) : (
                      <>
                        {current === questions.length - 1 ? 'Submit Answers' : 'Next Question'}
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (showResult) {
    const score = finalScore;
    const passed = selectedQuiz ? score >= selectedQuiz.passing_score : false;
    const correct = questions.filter((q, i) => answers[i] === q.answer_index).length;
    return (
      <AppLayout title="Quiz Results">
        <div className="max-w-[1440px] mx-auto space-y-xl">
          <div className="flex items-center gap-2 mb-md">
            <button 
              onClick={reset}
              className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/60"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Quizzes
            </button>
          </div>
          
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-xl max-w-3xl mx-auto text-center shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-md border-2 ${passed ? 'bg-primary/10 border-primary text-primary' : 'bg-error/10 border-error text-error'}`}>
              <span className="material-symbols-outlined text-[48px]">{passed ? 'emoji_events' : 'sentiment_dissatisfied'}</span>
            </div>
            <h3 className="font-display text-display text-on-surface mb-2">{passed ? 'Congratulations!' : 'Keep Practising!'}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-xl">{passed ? 'You passed the quiz!' : "You didn't reach the passing score. Review your answers and try again."}</p>
            
            <div className="text-[64px] font-bold leading-none mb-2" style={{ color: passed ? 'var(--primary)' : 'var(--error)', textShadow: passed ? '0 0 20px rgba(192,193,255,0.3)' : 'none' }}>
              {score}%
            </div>
            <p className="font-label-md text-label-md text-outline mb-xl">{correct} of {questions.length} correct</p>
            
            <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden mb-xl border border-outline-variant/40">
              <div className={`h-full rounded-full ${passed ? 'bg-primary shadow-[0_0_10px_var(--primary)]' : 'bg-error'}`} style={{ width: `${score}%` }}></div>
            </div>

            <div className="space-y-md text-left mb-xl">
              <h4 className="font-headline-sm text-headline-sm text-on-surface border-b border-outline-variant/40 pb-2">Question Review</h4>
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.answer_index;
                return (
                  <div key={i} className={`flex items-start gap-md p-md rounded-lg border ${isCorrect ? 'bg-primary/5 border-primary/30' : 'bg-error/5 border-error/30'}`}>
                    <span className={`material-symbols-outlined text-[20px] mt-0.5 ${isCorrect ? 'text-primary' : 'text-error'}`}>
                      {isCorrect ? 'check_circle' : 'cancel'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md text-on-surface">{q.question}</p>
                      {!isCorrect && (
                        <div className="mt-2 p-2 bg-surface rounded border border-outline-variant/40">
                          <p className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">Correct Answer</p>
                          <p className="font-body-sm text-body-sm text-primary">{q.options[q.answer_index]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => { setAnswers(Array(questions.length).fill(null)); setStarted(true); setShowResult(false); setCurrent(0); }} 
              className="bg-surface text-on-surface border border-outline-variant hover:bg-surface-variant font-label-md text-label-md px-xl py-md rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span> Try Again
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Pre-quiz / Listing state
  return (
    <AppLayout title="Quizzes">
      <div className="max-w-[1440px] mx-auto space-y-xl">
        <div>
          <h1 className="font-display text-display text-on-surface mb-xs">Module Quizzes</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Test your knowledge on course modules.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-xl items-start">
          {/* Quiz list */}
          <div className="space-y-sm flex flex-col gap-2">
            <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider px-2">Available Quizzes</h4>
            {quizzes.map(quiz => (
              <button
                key={quiz.id}
                onClick={() => setSelectedQuiz(quiz)}
                className={`w-full text-left p-md rounded-xl border transition-all ${selectedQuiz?.id === quiz.id ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(192,193,255,0.1)]' : 'border-outline-variant/60 bg-surface-container-low hover:border-primary/40'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-headline-sm text-headline-sm text-on-surface text-balance pr-2">{quiz.title}</p>
                  <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{quiz.courses?.title}</p>
              </button>
            ))}
          </div>

          {/* Quiz detail */}
          <div className="md:col-span-2">
            {selectedQuiz && (
              <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                
                {loadingQuestions ? (
                  <div className="space-y-md">
                    <Skeleton className="h-12 w-3/4 bg-surface-container-high rounded-lg mx-auto" />
                    <Skeleton className="h-32 w-full bg-surface-container-high rounded-xl" />
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-xl">
                      <div className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-md">
                        <span className="material-symbols-outlined text-[40px] text-primary">quiz</span>
                      </div>
                      <h3 className="font-headline-lg text-headline-lg text-on-surface text-balance mb-2">{selectedQuiz.title}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">{selectedQuiz.courses?.title}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-md mb-xl">
                      {[
                        { label: 'Questions', value: questions.length, icon: 'format_list_bulleted' },
                        { label: 'Pass Score', value: `${selectedQuiz.passing_score}%`, icon: 'flag' },
                        { label: 'Best Score', value: pastAttempt ? `${Math.round((pastAttempt.score / pastAttempt.total) * 100)}%` : '—', icon: 'military_tech' },
                      ].map(item => (
                        <div key={item.label} className="text-center p-md rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col items-center">
                          <span className="material-symbols-outlined text-outline mb-2 text-[20px]">{item.icon}</span>
                          <div className="font-headline-md text-headline-md text-primary mb-1">{item.value}</div>
                          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{item.label}</div>
                        </div>
                      ))}
                    </div>

                    {pastAttempt && (
                      <div className={`flex items-center gap-3 p-md rounded-xl mb-xl border ${pastAttempt.passed ? 'bg-primary/10 border-primary/40' : 'bg-surface-container-low border-outline-variant/60'}`}>
                        <span className={`material-symbols-outlined text-[24px] shrink-0 ${pastAttempt.passed ? 'text-primary' : 'text-outline'}`}>
                          {pastAttempt.passed ? 'verified' : 'info'}
                        </span>
                        <div>
                          <p className="font-headline-sm text-headline-sm text-on-surface">
                            {pastAttempt.passed ? 'Previously Passed' : 'Not Yet Passed'}
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                            Last attempt score: {Math.round((pastAttempt.score / pastAttempt.total) * 100)}%
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => { setAnswers(Array(questions.length).fill(null)); setStarted(true); }}
                      disabled={questions.length === 0}
                      className="w-full bg-primary text-on-primary-container hover:brightness-110 font-label-md text-label-md py-4 rounded-lg transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">{pastAttempt ? 'replay' : 'play_arrow'}</span>
                      {pastAttempt ? 'Retry Quiz' : 'Start Quiz'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

