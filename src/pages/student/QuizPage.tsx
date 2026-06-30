import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  BookOpen, 
  Trophy, 
  Target, 
  ListTodo, 
  History, 
  Timer, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  Award, 
  Frown,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

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

export default function QuizPage() {
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
        <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 space-y-6">
          <Skeleton className="h-10 w-48 bg-muted rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="space-y-4">
               <Skeleton className="h-20 w-full bg-muted rounded-2xl" />
               <Skeleton className="h-20 w-full bg-muted rounded-2xl" />
             </div>
             <Skeleton className="lg:col-span-2 h-[450px] w-full bg-muted rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (quizzes.length === 0) {
    return (
      <AppLayout title="Quizzes">
        <div className="max-w-container-max mx-auto px-4 md:px-8 py-12 flex justify-center items-center min-h-[60vh]">
          <div className="text-center p-10 bg-card border border-border rounded-3xl max-w-sm shadow-sm">
            <AlertCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-sm font-bold text-foreground">No quizzes available</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Enroll in a course to unlock its module quizzes.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (started && !showResult) {
    const q = questions[current];
    const progressPercent = ((current + 1) / questions.length) * 100;
    
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden select-none">
        {/* Active Quiz Header */}
        <header className="flex justify-between items-center h-16 px-6 bg-card border-b border-border shadow-sm z-40 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={reset}
              className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors flex items-center justify-center min-w-[40px] min-h-[40px]"
              title="Exit Quiz"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="h-6 w-px bg-border mx-2 hidden md:block" />
            <div className="hidden md:block">
              <h1 className="text-sm font-bold text-foreground truncate max-w-[280px] lg:max-w-md">
                {selectedQuiz?.title}
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {selectedQuiz?.courses?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 px-3.5 py-1.5 rounded-full text-primary">
              <Timer className="h-4 w-4 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Active</span>
            </div>
            <button 
              onClick={() => void handleFinish(answers)} 
              className="bg-muted text-foreground border border-border px-5 py-2 rounded-xl text-xs font-bold hover:bg-muted/80 transition-all shadow-sm hidden md:block"
            >
              Finish Early
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-muted shrink-0 relative">
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 rounded-r-full" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center pb-32 relative">
            <div className="w-full max-w-[700px] flex flex-col gap-6">
              {q && (
                <>
                  {/* Question Header */}
                  <div className="flex items-start gap-4">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary text-sm font-bold shrink-0 border border-primary/10 shadow-sm">
                      {current + 1}
                    </span>
                    <h2 className="text-base font-bold text-foreground leading-snug pt-1.5 whitespace-pre-wrap">
                      {q.question}
                    </h2>
                  </div>

                  {/* Options Grid */}
                  <div className="flex flex-col gap-3 mt-4">
                    {q.options.map((option, i) => (
                      <label 
                        key={i} 
                        className={`group relative flex items-center p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                          selectedOpt === i 
                            ? 'bg-primary/5 border-primary shadow-sm' 
                            : 'bg-card border-border hover:bg-muted/30'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="answer" 
                          className="peer sr-only" 
                          checked={selectedOpt === i}
                          onChange={() => setSelectedOpt(i)}
                        />
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 transition-colors shrink-0 ${
                          selectedOpt === i 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : 'border-border group-hover:border-primary/40'
                        }`}>
                          {selectedOpt === i && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-medium text-foreground flex-1 leading-normal">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </main>
          
          {/* Right Sidebar (Questions Navigator) */}
          <aside className="w-72 bg-card border-l border-border flex flex-col shrink-0 z-10 hidden lg:flex shadow-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-xs font-bold text-foreground">Questions Overview</h3>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {answers.filter(a => a !== null).length + (selectedOpt !== null && answers[current] === null ? 1 : 0)} of {questions.length} answered
              </p>
            </div>
            <div className="flex-grow overflow-y-auto p-6 scrollbar-hide">
              <div className="grid grid-cols-4 gap-2.5">
                {questions.map((_, i) => {
                  const isAnswered = answers[i] !== null;
                  const isActive = current === i;
                  
                  let btnClass = "aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ";
                  if (isActive) {
                    btnClass += "bg-primary text-primary-foreground shadow-md shadow-primary/10";
                  } else if (isAnswered) {
                    btnClass += "bg-primary/10 text-primary border border-primary/20";
                  } else {
                    btnClass += "bg-background border border-border text-muted-foreground hover:border-border/80 hover:text-foreground";
                  }

                  return (
                    <button 
                      key={i} 
                      onClick={() => { 
                        const newAnswers = [...answers];
                        newAnswers[current] = selectedOpt;
                        setAnswers(newAnswers);
                        setCurrent(i); 
                        setSelectedOpt(newAnswers[i] ?? null); 
                      }} 
                      className={btnClass}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:right-72 bg-card/90 backdrop-blur-md border-t border-border p-4 pb-6 md:pb-4 z-20 shadow-lg">
          <div className="max-w-[700px] mx-auto flex justify-between items-center gap-3">
            <button 
              onClick={() => { 
                const newAnswers = [...answers];
                newAnswers[current] = selectedOpt;
                setAnswers(newAnswers);
                setCurrent(current - 1); 
                setSelectedOpt(newAnswers[current - 1] ?? null); 
              }}
              disabled={current === 0 || submitting}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground font-bold text-xs hover:bg-muted/30 hover:text-foreground transition-all disabled:opacity-30 min-h-[40px]"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            
            <button 
              onClick={handleNext}
              disabled={selectedOpt === null || submitting}
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 min-h-[40px]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>{current === questions.length - 1 ? 'Submit Assessment' : 'Next Question'}</span>
                  <ChevronRight className="h-4 w-4" />
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
        <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 space-y-8 relative z-10">
          
          {/* Back Action */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (selectedQuiz) navigate(`/courses/${selectedQuiz.course_id}`);
                else reset();
              }}
              className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors bg-card px-4 py-2.5 rounded-xl border border-border shadow-sm hover:border-border/80"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Course
            </button>
          </div>
          
          {/* Score Card Panel */}
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 max-w-2xl mx-auto text-center relative overflow-hidden shadow-sm">
            <div className={`absolute top-[-10%] right-[-10%] w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
              passed ? 'bg-emerald-500' : 'bg-destructive'
            }`} />
            
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 relative z-10 ${
              passed 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-sm' 
                : 'bg-destructive/10 border-destructive/20 text-destructive shadow-sm'
            }`}>
              {passed ? <Award className="h-10 w-10" /> : <Frown className="h-10 w-10" />}
            </div>
            
            <h3 className="font-display text-2xl font-extrabold text-foreground mb-2 relative z-10">
              {passed ? 'Congratulations!' : 'Keep Practising!'}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-8 relative z-10 max-w-md mx-auto leading-relaxed">
              {passed 
                ? 'You have successfully passed the module assessment and verified your concept mastery!' 
                : "You didn't reach the required passing score. Review the details below and try again."}
            </p>
            
            {/* Score Ring / Display */}
            <div className="bg-background rounded-2xl border border-border p-6 mb-8 inline-block min-w-[200px] shadow-sm relative z-10">
              <div className={`text-5xl font-extrabold leading-none mb-2 font-display tracking-tight ${
                passed ? 'text-primary' : 'text-destructive'
              }`}>
                {score}%
              </div>
              <p className="text-xs text-muted-foreground font-semibold">
                {correct} of {questions.length} correct answers
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-10 border border-border relative z-10 shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  passed ? 'bg-primary' : 'bg-destructive'
                }`} 
                style={{ width: `${score}%` }} 
              />
            </div>

            {/* Detailed Review */}
            <div className="space-y-4 text-left mb-10 relative z-10">
              <h4 className="text-sm font-bold text-foreground pb-3 border-b border-border">
                Detailed Review
              </h4>
              
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.answer_index;
                return (
                  <div 
                    key={i} 
                    className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${
                      isCorrect 
                        ? 'bg-background border-border/80 shadow-sm' 
                        : 'bg-destructive/5 border-destructive/10'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <X className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <p className="text-sm text-foreground font-bold mb-3 leading-relaxed">
                        {q.question}
                      </p>
                      
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isUserSelected = answers[i] === optIdx;
                          const isActuallyCorrect = q.answer_index === optIdx;
                          let bgClass = "bg-card border-border";
                          let textClass = "text-muted-foreground";
                          let icon: React.ReactNode = null;

                          if (isActuallyCorrect) {
                            bgClass = "bg-emerald-500/10 border-emerald-500/20";
                            textClass = "text-emerald-500 font-bold";
                            icon = <Check className="h-4 w-4 text-emerald-500 ml-auto stroke-[3]" />;
                          } else if (isUserSelected && !isActuallyCorrect) {
                            bgClass = "bg-destructive/10 border-destructive/20";
                            textClass = "text-destructive font-bold";
                            icon = <X className="h-4 w-4 text-destructive ml-auto" />;
                          }

                          return (
                            <div 
                              key={optIdx} 
                              className={`px-4 py-2.5 rounded-xl border text-xs flex items-center gap-2 ${bgClass} ${textClass}`}
                            >
                              <span className="font-semibold">{String.fromCharCode(65 + optIdx)}.</span>
                              <span className="flex-grow leading-normal">{opt}</span>
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
              onClick={() => { 
                setAnswers(Array(questions.length).fill(null)); 
                setStarted(true); 
                setShowResult(false); 
                setCurrent(0); 
                setSelectedOpt(null);
              }} 
              className="bg-primary text-primary-foreground font-bold text-xs px-8 py-3 rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mx-auto relative z-10"
            >
              <RotateCcw className="h-4 w-4" /> Try Again
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quizzes">
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 space-y-8 relative z-10 select-none">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Module Assessments</h1>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Evaluate your understanding of the course materials and earn certifications.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Quiz list */}
          <div className="space-y-3 flex flex-col">
            <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold px-1.5 mb-1">
              Available Assessments
            </h4>
            {quizzes.map(quiz => (
              <button
                key={quiz.id}
                onClick={() => setSelectedQuiz(quiz)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 ${
                  selectedQuiz?.id === quiz.id 
                    ? 'bg-primary/5 border-primary shadow-sm' 
                    : 'bg-card border-border hover:border-border/80 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className={`text-sm font-bold leading-snug pr-2 ${
                    selectedQuiz?.id === quiz.id ? 'text-primary' : 'text-foreground'
                  }`}>
                    {quiz.title}
                  </p>
                  <ChevronRight className={`h-4 w-4 shrink-0 mt-0.5 ${
                    selectedQuiz?.id === quiz.id ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" /> 
                  <span className="truncate">{quiz.courses?.title}</span>
                </p>
              </button>
            ))}
          </div>

          {/* Quiz detail */}
          <div className="lg:col-span-2">
            {selectedQuiz && (
              <div className="bg-card border border-border rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-30 pointer-events-none" />
                
                {loadingQuestions ? (
                  <div className="space-y-6 py-8">
                    <Skeleton className="h-8 w-1/2 bg-muted rounded-xl mx-auto" />
                    <Skeleton className="h-28 w-full bg-muted rounded-2xl" />
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-10 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <ListTodo className="h-8 w-8" />
                      </div>
                      <h3 className="font-display text-xl font-bold text-foreground mb-3 px-4">
                        {selectedQuiz.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full font-semibold">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground/80" /> 
                        {selectedQuiz.courses?.title}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-8 relative z-10">
                      {[
                        { label: 'Questions', value: questions.length, icon: ListTodo },
                        { label: 'Pass Score', value: `${selectedQuiz.passing_score}%`, icon: Target },
                        { label: 'Best Score', value: pastAttempt ? `${Math.round((pastAttempt.score / pastAttempt.total) * 100)}%` : '—', icon: Trophy },
                      ].map(item => {
                        const StatIcon = item.icon;
                        return (
                          <div key={item.label} className="text-center p-4 rounded-2xl bg-background border border-border flex flex-col items-center shadow-sm hover:-translate-y-0.5 transition-transform duration-200">
                            <StatIcon className="h-5 w-5 text-primary mb-1.5" />
                            <div className="text-lg font-extrabold text-foreground mb-0.5">{item.value}</div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-extrabold">{item.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Past Attempt Summary */}
                    {pastAttempt && (
                      <div className={`flex items-center gap-4 p-5 rounded-2xl mb-8 border relative z-10 shadow-sm ${
                        pastAttempt.passed ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-background border-border'
                      }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          pastAttempt.passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                        }`}>
                          {pastAttempt.passed ? <CheckCircle2 className="h-5 w-5" /> : <History className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${pastAttempt.passed ? 'text-emerald-500' : 'text-foreground'}`}>
                            {pastAttempt.passed ? 'Assessment Passed' : 'Assessment Attempted'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                            Your highest score is <strong className="text-foreground">{Math.round((pastAttempt.score / pastAttempt.total) * 100)}%</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center relative z-10">
                      <button
                        onClick={() => { setAnswers(Array(questions.length).fill(null)); setStarted(true); }}
                        disabled={questions.length === 0}
                        className="w-full sm:w-auto min-w-[220px] bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 text-xs"
                      >
                        {pastAttempt ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
