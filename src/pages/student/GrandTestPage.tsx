import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { completeModule } from '@/lib/progress';

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  course_id: string;
  module_id: string | null;
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

export default function GrandTestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      // Fetch enrolled course quizzes (grand-test)
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
        .eq('is_grand_test', true)
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

      if (passed && selectedQuiz.module_id) {
        // Unlock next module
        void completeModule(user.id, selectedQuiz.course_id, selectedQuiz.module_id);
      }
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
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg space-y-stack-md">
          <Skeleton className="h-12 w-48 bg-surface-container rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-4"><Skeleton className="h-20 w-full bg-surface-container rounded-xl" /><Skeleton className="h-20 w-full bg-surface-container rounded-xl" /></div>
             <Skeleton className="md:col-span-2 h-[400px] w-full bg-surface-container rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (quizzes.length === 0) {
    return (
      <AppLayout title="Quizzes">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex justify-center items-center min-h-[60vh]">
          <div className="text-center p-10 glass-panel rounded-xl card-lift">
            <span className="material-symbols-outlined text-[48px] text-text-secondary opacity-40 mb-3">quiz</span>
            <h1 className="text-3xl font-heading font-bold text-on-surface">Grand Tests</h1>
            <p className="text-on-surface-variant font-body-lg">Assess your knowledge across entire courses.</p>
            <p className="font-body-md text-body-md text-text-secondary mt-1">Enroll in a course to unlock its quizzes.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (started && !showResult) {
    const q = questions[current];
    const progressPercent = ((current + 1) / questions.length) * 100;
    
    return (
      <div className="min-h-screen flex flex-col bg-background text-text-primary overflow-hidden">
        {/* Active Quiz Header */}
        <header className="flex justify-between items-center h-16 px-6 bg-surface/70 backdrop-blur-md shadow-sm z-40 shrink-0 border-b border-border-base">
          <div className="flex items-center gap-4">
            <button 
              onClick={reset}
              className="text-text-secondary hover:text-primary transition-colors flex items-center justify-center p-2 rounded-full hover:bg-surface-container-low"
              title="Exit Quiz"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="h-6 w-px bg-border-base mx-2 hidden md:block"></div>
            <div className="hidden md:block">
              <h1 className="font-headline-md text-[18px] font-bold text-primary truncate max-w-[300px] lg:max-w-md">{selectedQuiz?.title}</h1>
              <p className="font-label-sm text-[12px] text-text-secondary">{selectedQuiz?.courses?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full border border-primary/20">
              <span className="material-symbols-outlined text-primary text-[18px]">timer</span>
              <span className="font-label-md text-label-md text-primary font-bold tracking-wider">Active</span>
            </div>
            <button onClick={() => handleFinish(answers)} className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm hidden md:block">
                Finish Early
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-surface-container-lowest border-b border-border-base shrink-0 relative">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-tertiary-container transition-all duration-500 rounded-r-full" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center pb-32 relative">
            <div className="w-full max-w-[800px] flex flex-col gap-8">
              {q && (
                <>
                  {/* Question Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-fixed text-primary font-headline-md text-headline-md shrink-0 border border-primary/20 shadow-sm">{current + 1}</span>
                      <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-text-primary mt-1 whitespace-pre-wrap">
                        {q.question}
                      </h2>
                    </div>
                  </div>

                  {/* Options Grid */}
                  <div className="flex flex-col gap-4 mt-2">
                    {q.options.map((option, i) => (
                      <label 
                        key={i} 
                        className={`group relative flex items-center p-4 sm:p-5 min-h-[56px] rounded-xl border cursor-pointer transition-all duration-200 card-lift ${selectedOpt === i ? 'bg-surface border-primary shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'bg-surface border-border-base hover:bg-surface-container-lowest'}`}
                      >
                        <input 
                          type="radio" 
                          name="answer" 
                          className="peer sr-only" 
                          checked={selectedOpt === i}
                          onChange={() => setSelectedOpt(i)}
                        />
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors shrink-0 ${selectedOpt === i ? 'border-primary bg-primary' : 'border-outline-variant group-hover:border-primary/50'}`}>
                          <span className={`material-symbols-outlined text-[16px] text-white transition-opacity ${selectedOpt === i ? 'opacity-100' : 'opacity-0'}`} style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                        </div>
                        <span className="font-body-lg text-body-lg text-text-primary flex-1">{option}</span>
                        <div className={`absolute inset-0 rounded-xl border-2 pointer-events-none transition-colors ${selectedOpt === i ? 'border-primary' : 'border-transparent'}`}></div>
                        <div className={`absolute inset-0 rounded-xl bg-primary-fixed/10 pointer-events-none transition-opacity ${selectedOpt === i ? 'opacity-100' : 'opacity-0'}`}></div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </main>
          
          {/* Right Sidebar (Questions Navigator) */}
          <aside className="w-80 bg-surface border-l border-border-base flex flex-col shrink-0 z-10 hidden lg:flex shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
            <div className="p-6 border-b border-border-base bg-surface-bright/50">
              <h3 className="font-headline-md text-[18px] font-bold text-text-primary">Questions overview</h3>
              <p className="font-body-sm text-[13px] text-text-secondary mt-1">{answers.filter(a => a !== undefined && a !== null).length} of {questions.length} answered</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-4 gap-3">
                {questions.map((_, i) => {
                  const isAnswered = answers[i] !== undefined && answers[i] !== null;
                  const isActive = current === i;
                  
                  let btnClass = "aspect-square rounded-lg flex items-center justify-center font-label-md text-label-md font-bold transition-colors relative ";
                  if (isActive) {
                    btnClass += "bg-surface border-2 border-primary text-primary shadow-[0_0_12px_rgba(37,99,235,0.2)]";
                  } else if (isAnswered) {
                    btnClass += "bg-primary text-white hover:bg-primary-container border border-primary";
                  } else {
                    btnClass += "bg-surface border border-border-base text-text-secondary hover:border-outline-variant hover:bg-surface-container-lowest";
                  }

                  return (
                    <button key={i} onClick={() => { setCurrent(i); setSelectedOpt(answers[i] ?? null); }} className={btnClass}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:right-80 bg-surface/90 backdrop-blur-md border-t border-border-base p-4 pb-6 md:pb-4 z-20 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          <div className="max-w-[800px] mx-auto flex justify-between items-center px-2 sm:px-4 gap-2">
            <button 
              onClick={() => { setCurrent(current - 1); setSelectedOpt(answers[current - 1] ?? null); }}
              disabled={current === 0 || submitting}
              className="flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-border-base bg-surface text-text-secondary font-label-md text-label-md hover:bg-surface-container-lowest hover:text-text-primary transition-colors disabled:opacity-30 shadow-sm min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="text-xs sm:text-sm">Previous</span>
            </button>
            <button 
              onClick={handleNext}
              disabled={selectedOpt === null || submitting}
              className="flex items-center justify-center gap-1.5 px-5 sm:px-8 py-2.5 sm:py-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-primary-container transition-colors shadow-md disabled:opacity-50 min-h-[44px]"
            >
              {submitting ? (
                <><span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> <span className="text-xs sm:text-sm">Saving...</span></>
              ) : (
                <>
                  <span className="text-xs sm:text-sm">{current === questions.length - 1 ? 'Submit Assessment' : 'Next Question'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showResult) {
    const score = finalScore;
    const passed = selectedQuiz ? score >= selectedQuiz.passing_score : false;
    const correct = questions.filter((q, i) => answers[i] === q.answer_index).length;
    return (
      <AppLayout title="Quiz Results">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg space-y-stack-xl relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <button 
              onClick={() => {
                if (selectedQuiz) navigate(`/courses/${selectedQuiz.course_id}`);
                else reset();
              }}
              className="flex items-center gap-1 text-text-secondary hover:text-primary transition-colors font-label-md text-label-md bg-surface px-4 py-2 rounded-lg border border-border-base shadow-sm card-lift"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Course
            </button>
          </div>
          
          <div className="glass-panel rounded-2xl p-8 md:p-12 max-w-3xl mx-auto text-center relative overflow-hidden card-lift">
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none ${passed ? 'bg-primary/10' : 'bg-error/10'}`}></div>
            
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 relative z-10 ${passed ? 'bg-surface-bright border-primary text-primary shadow-[0_0_30px_rgba(37,99,235,0.2)]' : 'bg-surface-bright border-error text-error shadow-[0_0_30px_rgba(239,68,68,0.2)]'}`}>
              <span className="material-symbols-outlined text-[48px]">{passed ? 'emoji_events' : 'sentiment_dissatisfied'}</span>
            </div>
            
            <h3 className="font-display-lg text-display-lg text-text-primary mb-2 relative z-10">{passed ? 'Congratulations!' : 'Keep Practising!'}</h3>
            <p className="font-body-lg text-body-lg text-text-secondary mb-8 relative z-10 max-w-lg mx-auto">{passed ? 'You passed the assessment with flying colors!' : "You didn't reach the passing score. Review your answers and try again."}</p>
            
            <div className="bg-surface rounded-xl border border-border-base p-6 mb-8 inline-block min-w-[200px] shadow-sm relative z-10">
              <div className="text-[64px] font-bold leading-none mb-1 font-headline-md tracking-tight" style={{ color: passed ? 'var(--primary)' : 'var(--error)' }}>
                {score}%
              </div>
              <p className="font-label-md text-[14px] text-text-secondary">{correct} of {questions.length} correct</p>
            </div>
            
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden mb-10 border border-border-base relative z-10 shadow-inner">
              <div className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-primary shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-error'}`} style={{ width: `${score}%` }}></div>
            </div>

            <div className="space-y-4 text-left mb-10 relative z-10">
              <h4 className="font-headline-md text-[20px] font-bold text-text-primary pb-3 border-b border-border-base">Detailed Review</h4>
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.answer_index;
                return (
                  <div key={i} className={`flex items-start gap-4 p-5 rounded-xl border transition-all ${isCorrect ? 'bg-surface border-primary/30 shadow-sm' : 'bg-error/5 border-error/20'}`}>
                    <span className={`material-symbols-outlined text-[24px] mt-0.5 ${isCorrect ? 'text-success' : 'text-error'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {isCorrect ? 'check_circle' : 'cancel'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md text-text-primary font-medium mb-3">{q.question}</p>
                      
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isUserSelected = answers[i] === optIdx;
                          const isActuallyCorrect = q.answer_index === optIdx;
                          let bgClass = "bg-surface border-border-base";
                          let textClass = "text-text-secondary";
                          let icon: React.ReactNode = null;

                          if (isActuallyCorrect) {
                            bgClass = "bg-success/10 border-success/30";
                            textClass = "text-success font-medium";
                            icon = <span className="material-symbols-outlined text-[16px] text-success ml-auto">check</span>;
                          } else if (isUserSelected && !isActuallyCorrect) {
                            bgClass = "bg-error/10 border-error/30";
                            textClass = "text-error";
                            icon = <span className="material-symbols-outlined text-[16px] text-error ml-auto">close</span>;
                          }

                          return (
                            <div key={optIdx} className={`px-4 py-2 rounded-lg border text-[14px] flex items-center ${bgClass} ${textClass}`}>
                              {String.fromCharCode(65 + optIdx)}. {opt}
                              {icon}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => { setAnswers(Array(questions.length).fill(null)); setStarted(true); setShowResult(false); setCurrent(0); }} 
              className="bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md px-8 py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mx-auto relative z-10"
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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg space-y-stack-xl relative z-10">
        <div className="text-center md:text-left mb-8">
          <h1 className="font-display-lg-mobile md:font-display-lg text-text-primary mb-2">Module Assessments</h1>
          <p className="font-body-lg text-text-secondary max-w-2xl">Evaluate your understanding of the course materials and earn certifications.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Quiz list */}
          <div className="space-y-3 flex flex-col">
            <h4 className="font-label-md text-[13px] text-text-secondary uppercase tracking-widest px-2 mb-2 font-bold">Available Assessments</h4>
            {quizzes.map(quiz => (
              <button
                key={quiz.id}
                onClick={() => setSelectedQuiz(quiz)}
                className={`w-full text-left p-5 rounded-xl border transition-all duration-200 glass-panel card-lift ${selectedQuiz?.id === quiz.id ? 'border-primary ring-1 ring-primary/20 shadow-md scale-[1.02]' : 'border-border-base hover:border-primary/40'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className={`font-headline-md text-[16px] font-bold pr-2 ${selectedQuiz?.id === quiz.id ? 'text-primary' : 'text-text-primary'}`}>{quiz.title}</p>
                  <span className={`material-symbols-outlined text-[20px] ${selectedQuiz?.id === quiz.id ? 'text-primary' : 'text-text-secondary'}`}>chevron_right</span>
                </div>
                <p className="font-body-sm text-[13px] text-text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">book</span> {quiz.courses?.title}
                </p>
              </button>
            ))}
          </div>

          {/* Quiz detail */}
          <div className="lg:col-span-2">
            {selectedQuiz && (
              <div className="glass-panel border border-border-base rounded-2xl p-8 md:p-10 shadow-lg relative overflow-hidden card-lift">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary-container/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                
                {loadingQuestions ? (
                  <div className="space-y-6">
                    <Skeleton className="h-12 w-2/3 bg-surface-container rounded-lg mx-auto" />
                    <Skeleton className="h-32 w-full bg-surface-container rounded-xl" />
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-10 relative z-10">
                      <div className="w-20 h-20 rounded-2xl bg-surface border-2 border-primary/20 shadow-sm flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-primary/5 rounded-2xl"></div>
                        <span className="material-symbols-outlined text-[40px] text-primary relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
                      </div>
                      <h3 className="font-headline-lg text-[28px] font-bold text-text-primary text-balance mb-3">{selectedQuiz.title}</h3>
                      <p className="font-body-md text-text-secondary inline-flex items-center gap-2 bg-surface-container px-3 py-1 rounded-full text-sm">
                        <span className="material-symbols-outlined text-[16px]">school</span> {selectedQuiz.courses?.title}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10 relative z-10">
                      {[
                        { label: 'Questions', value: questions.length, icon: 'format_list_bulleted' },
                        { label: 'Pass Score', value: `${selectedQuiz.passing_score}%`, icon: 'flag' },
                        { label: 'Best Score', value: pastAttempt ? `${Math.round((pastAttempt.score / pastAttempt.total) * 100)}%` : '—', icon: 'military_tech' },
                      ].map(item => (
                        <div key={item.label} className="text-center p-3 sm:p-5 rounded-xl bg-surface border border-border-base flex flex-col items-center shadow-sm hover:-translate-y-1 transition-transform">
                          <span className="material-symbols-outlined text-primary mb-1 sm:mb-2 text-[20px] sm:text-[24px]">{item.icon}</span>
                          <div className="font-headline-md text-lg sm:text-[24px] font-bold text-text-primary mb-0.5 sm:mb-1">{item.value}</div>
                          <div className="font-label-sm text-[9px] sm:text-[11px] text-text-secondary uppercase tracking-widest font-bold">{item.label}</div>
                        </div>
                      ))}
                    </div>

                    {pastAttempt && (
                      <div className={`flex items-center gap-4 p-5 rounded-xl mb-10 border relative z-10 shadow-sm ${pastAttempt.passed ? 'bg-success/5 border-success/30' : 'bg-surface border-border-base'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${pastAttempt.passed ? 'bg-success text-white' : 'bg-surface-container text-text-secondary'}`}>
                          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {pastAttempt.passed ? 'verified' : 'history'}
                          </span>
                        </div>
                        <div>
                          <p className={`font-headline-md text-[18px] font-bold ${pastAttempt.passed ? 'text-success' : 'text-text-primary'}`}>
                            {pastAttempt.passed ? 'Assessment Passed' : 'Assessment Attempted'}
                          </p>
                          <p className="font-body-sm text-[14px] text-text-secondary mt-1">
                            Your highest score is <strong className="text-text-primary">{Math.round((pastAttempt.score / pastAttempt.total) * 100)}%</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center relative z-10">
                      <button
                        onClick={() => { setAnswers(Array(questions.length).fill(null)); setStarted(true); }}
                        disabled={questions.length === 0}
                        className="w-full sm:w-auto min-w-[250px] bg-primary text-on-primary font-label-md text-[16px] font-bold py-4 px-8 rounded-xl hover:bg-primary-container hover:shadow-lg transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[24px]">{pastAttempt ? 'replay' : 'play_arrow'}</span>
                        {pastAttempt ? 'Retake Assessment' : 'Start Assessment'}
                      </button>
                    </div>
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
