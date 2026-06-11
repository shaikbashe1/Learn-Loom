import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Clock, Trophy, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
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

  const q = questions[current];
  const pct = questions.length > 0 ? Math.round((answers.filter((a, i) => a === questions[i]?.answer_index).length / questions.length) * 100) : 0;

  if (loading) {
    return (
      <AppLayout title="Quizzes">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48 bg-muted" />
          <Skeleton className="h-64 w-full bg-muted rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (quizzes.length === 0) {
    return (
      <AppLayout title="Quizzes">
        <div className="max-w-2xl mx-auto text-center py-20">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-semibold text-foreground">No quizzes available</p>
          <p className="text-sm text-muted-foreground mt-1">Enroll in a course to unlock its quizzes</p>
        </div>
      </AppLayout>
    );
  }

  if (!started && !showResult) {
    return (
      <AppLayout title="Quizzes">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-foreground text-balance">Quizzes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quiz list */}
            <div className="space-y-2">
              {quizzes.map(quiz => (
                <button
                  key={quiz.id}
                  onClick={() => setSelectedQuiz(quiz)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selectedQuiz?.id === quiz.id ? 'border-primary/50 bg-primary/10' : 'border-border bg-card hover:border-primary/20'}`}
                >
                  <p className="text-sm font-medium text-foreground text-balance">{quiz.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{quiz.courses?.title}</p>
                </button>
              ))}
            </div>

            {/* Quiz detail */}
            <div className="md:col-span-2">
              {selectedQuiz && (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    {loadingQuestions ? (
                      <div className="space-y-3"><Skeleton className="h-8 w-3/4 bg-muted" /><Skeleton className="h-24 w-full bg-muted" /></div>
                    ) : (
                      <>
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
                            <Trophy className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-xl font-bold text-foreground text-balance">{selectedQuiz.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{selectedQuiz.courses?.title}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          {[
                            { label: 'Questions', value: questions.length },
                            { label: 'Pass Score', value: `${selectedQuiz.passing_score}%` },
                            { label: 'Best Score', value: pastAttempt ? `${Math.round((pastAttempt.score / pastAttempt.total) * 100)}%` : '—' },
                          ].map(item => (
                            <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                              <div className="text-xl font-bold text-primary">{item.value}</div>
                              <div className="text-xs text-muted-foreground">{item.label}</div>
                            </div>
                          ))}
                        </div>
                        {pastAttempt && (
                          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${pastAttempt.passed ? 'bg-chart-3/10 border border-chart-3/30' : 'bg-muted border border-border'}`}>
                            {pastAttempt.passed ? <CheckCircle className="w-4 h-4 text-chart-3 shrink-0" /> : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
                            <p className="text-sm text-foreground">
                              {pastAttempt.passed ? 'Previously passed' : 'Not yet passed'} — last score: {Math.round((pastAttempt.score / pastAttempt.total) * 100)}%
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={() => { setAnswers(Array(questions.length).fill(null)); setStarted(true); }}
                          disabled={questions.length === 0}
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                        >
                          {pastAttempt ? 'Retry Quiz' : 'Start Quiz'} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (showResult) {
    const score = finalScore;
    const passed = selectedQuiz ? score >= selectedQuiz.passing_score : false;
    const correct = questions.filter((q, i) => answers[i] === q.answer_index).length;
    return (
      <AppLayout title="Quiz Results">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-chart-3/20' : 'bg-destructive/20'}`}>
                {passed ? <Trophy className="w-12 h-12 text-chart-3" /> : <XCircle className="w-12 h-12 text-destructive" />}
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">{passed ? 'Congratulations!' : 'Keep Practising!'}</h3>
              <p className="text-muted-foreground text-sm mb-6">{passed ? 'You passed the quiz!' : "You didn't reach the passing score. Review and try again."}</p>
              <div className="text-5xl font-bold gradient-text mb-2">{score}%</div>
              <p className="text-muted-foreground text-sm">{correct} of {questions.length} correct</p>
              <Progress value={score} className="h-3 mt-4 mb-6" />
              <div className="space-y-3 mb-6 text-left">
                {questions.map((q, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${answers[i] === q.answer_index ? 'bg-chart-3/10 border-chart-3/30' : 'bg-destructive/10 border-destructive/30'}`}>
                    {answers[i] === q.answer_index
                      ? <CheckCircle className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{q.question}</p>
                      {answers[i] !== q.answer_index && (
                        <p className="text-xs text-muted-foreground mt-1">Correct: <span className="text-chart-3">{q.options[q.answer_index]}</span></p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={reset} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <RotateCcw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quiz">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Question {current + 1} of {questions.length}</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{selectedQuiz?.title}</span>
          </div>
        </div>
        <Progress value={((current + 1) / questions.length) * 100} className="h-2" />

        {q && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <Badge className="w-fit mb-3 bg-primary/15 text-primary border-primary/30 text-xs">Question {current + 1}</Badge>
              <CardTitle className="text-lg text-foreground font-semibold text-balance leading-relaxed">{q.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              {q.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOpt(i)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${selectedOpt === i ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:border-primary/40 hover:bg-muted/30 text-foreground'}`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${selectedOpt === i ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm">{option}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button
            onClick={() => { setCurrent(current - 1); setSelectedOpt(answers[current - 1] ?? null); }}
            disabled={current === 0}
            variant="ghost"
            className="border border-border text-foreground hover:bg-accent disabled:opacity-40"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={selectedOpt === null || submitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              : current === questions.length - 1
                ? 'Submit Quiz'
                : 'Next'
            }
            {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

