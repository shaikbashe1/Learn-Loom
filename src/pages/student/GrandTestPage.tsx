import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GraduationCap, Camera, CameraOff, CheckCircle, AlertTriangle,
  Clock, ArrowRight, Shield, AlertOctagon
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

type TestStage = 'instructions' | 'camera' | 'exam' | 'submitted';

interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export default function GrandTestPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState<TestStage>('instructions');
  const [cameraOn, setCameraOn] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tabSwitchesRef = useRef(0);

  const [cooldownTime, setCooldownTime] = useState<number | null>(null);
  const [checkingCooldown, setCheckingCooldown] = useState(true);

  // Check cooldown on mount/user change
  useEffect(() => {
    if (!user) return;
    let active = true;
    
    const checkCooldown = async () => {
      setCheckingCooldown(true);
      try {
        const { data, error } = await supabase
          .from('grand_test_attempts')
          .select('submitted_at')
          .eq('user_id', user.id)
          .is('course_id', null)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error checking cooldown:', error);
        } else if (data && active) {
          const lastAttemptTime = new Date(data.submitted_at).getTime();
          const elapsedSec = (Date.now() - lastAttemptTime) / 1000;
          const remainingSec = Math.ceil(3600 - elapsedSec);
          if (remainingSec > 0) {
            setCooldownTime(remainingSec);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setCheckingCooldown(false);
      }
    };

    checkCooldown();
    return () => {
      active = false;
    };
  }, [user]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownTime === null || cooldownTime <= 0) return;
    const interval = setInterval(() => {
      setCooldownTime(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTime]);

  // Load questions from DB when entering exam stage
  useEffect(() => {
    if (stage !== 'exam') return;
    if (questions.length > 0) return; // already loaded
    setLoadingQ(true);
    supabase
      .from('grand_test_questions')
      .select('id, question, options, correct_idx, explanation')
      .is('course_id', null)
      .order('sort_order', { ascending: true })
      .limit(10)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          toast.error('Failed to load exam questions');
          setStage('instructions');
          return;
        }
        const mapped: ExamQuestion[] = data.map(q => ({
          id: q.id,
          text: q.question,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string),
          correct: q.correct_idx,
          explanation: q.explanation ?? undefined,
        }));
        setQuestions(mapped);
        setAnswers(Array(mapped.length).fill(null));
        setLoadingQ(false);
      });
  }, [stage, questions.length]);

  // Timer
  useEffect(() => {
    if (stage !== 'exam') return;
    if (timeLeft === 0) {
      toast.warning('Time is up! Your answers have been submitted automatically.');
      handleSubmit();
      return;
    }
    const t = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timeLeft]);

  // Tab switch detection
  const handleVisibilityChange = useCallback(() => {
    if (stage !== 'exam') return;
    if (document.hidden) {
      tabSwitchesRef.current += 1;
      const next = tabSwitchesRef.current;
      setTabSwitches(next);
      if (next >= 3) {
        toast.error('⚠️ Tab switch limit reached! Exam has been auto-submitted.', { duration: 6000 });
        handleSubmit();
      } else {
        toast.warning(`Tab switch detected! Warning ${next}/3. Switching again will auto-submit.`, { duration: 5000 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  // Camera cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (stage === 'submitted' || stage === 'instructions') {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraOn(false);
    }
  }, [stage]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera access was denied or is unavailable. You can proceed in demo mode without camera.');
    }
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    const finalAnswers = answers;
    const scoreVal = questions.reduce((acc, q, i) => acc + (finalAnswers[i] === q.correct ? 1 : 0), 0);
    const passed = questions.length > 0 && scoreVal / questions.length >= 0.6;

    // Persist attempt to DB
    if (user) {
      const answerLog = questions.map((q, i) => ({
        question_id: q.id,
        selected_idx: finalAnswers[i] ?? -1,
        correct: finalAnswers[i] === q.correct,
      }));
      await supabase.from('grand_test_attempts').insert({
        user_id: user.id,
        score: scoreVal,
        total: questions.length,
        passed,
        tab_switches: tabSwitchesRef.current,
        answers: answerLog,
      });

      // Award credits if passed
      if (passed) {
        try { await supabase.rpc('increment_credits', { p_user_id: user.id, p_amount: 50 }); } catch { /* best-effort */ }
      }
    }

    setStage('submitted');
    setSubmitting(false);
  }, [answers, questions, submitting, user]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const passed = questions.length > 0 && score / questions.length >= 0.6;

  if (stage === 'instructions') {
    return (
      <AppLayout title="Grand Test">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground text-balance">LearnLoom Grand Test</h2>
                <p className="text-muted-foreground text-sm mt-2">Full Stack Development — Certification Exam</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: 'Questions', value: '10' },
                  { label: 'Duration', value: '30 min' },
                  { label: 'Passing Score', value: '60%' },
                  { label: 'Attempts', value: '1 (Proctored)' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-lg font-bold text-primary">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 mb-8">
                <h4 className="font-semibold text-foreground text-sm">Instructions</h4>
                {[
                  'Your webcam will be monitored throughout the exam',
                  'Do not switch tabs or minimize the browser window',
                  'Each question has exactly one correct answer',
                  'You cannot go back to previous questions once answered',
                  'Submitting incomplete answers will mark them as incorrect',
                ].map((inst, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{inst}</span>
                  </div>
                ))}
              </div>
              {checkingCooldown ? (
                <Button disabled className="w-full h-11 bg-primary/50 text-primary-foreground/50">
                  Checking Cooldown...
                </Button>
              ) : cooldownTime !== null && cooldownTime > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3 text-destructive">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Cooldown Active</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You must wait 1 hour between Grand Test attempts. Please try again after the cooldown expires.
                      </p>
                    </div>
                  </div>
                  <Button disabled className="w-full h-11 opacity-60">
                    <Clock className="w-4 h-4 mr-2" /> Retry in {formatTime(cooldownTime)}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setStage('camera')} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 glow-cyan">
                  Proceed to Camera Setup <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (stage === 'camera') {
    return (
      <AppLayout title="Camera Setup">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="text-xl font-bold text-foreground text-balance">Webcam Verification</h3>
                <p className="text-muted-foreground text-sm mt-1">Please enable your camera for identity verification</p>
              </div>
              <div className="aspect-video rounded-xl overflow-hidden bg-muted mb-6 flex items-center justify-center">
                {cameraOn ? (
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <CameraOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Camera not enabled</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {!cameraOn ? (
                  <>
                    <Button onClick={startCamera} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                      <Camera className="w-4 h-4 mr-2" /> Enable Camera
                    </Button>
                    {cameraError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2">
                        <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                        {cameraError}
                      </div>
                    )}
                    <Button onClick={() => setStage('exam')} variant="ghost" className="w-full border border-border text-muted-foreground hover:bg-accent text-sm h-9">
                      Skip Camera (Demo Mode)
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-lg bg-chart-3/10 border border-chart-3/30 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-chart-3 shrink-0" />
                      <span className="text-sm text-chart-3">Camera active — you're ready to begin</span>
                    </div>
                    <Button onClick={() => setStage('exam')} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                      Start Exam <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (stage === 'submitted') {
    const passed = score >= 3;
    return (
      <AppLayout title="Exam Results">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-chart-3/20' : 'bg-destructive/20'}`}>
                {passed ? <CheckCircle className="w-12 h-12 text-chart-3" /> : <AlertTriangle className="w-12 h-12 text-destructive" />}
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">{passed ? 'You Passed!' : 'Not Quite Yet'}</h3>
              <p className="text-muted-foreground text-sm mb-6">
                {passed ? 'Congratulations! You have successfully completed the Grand Test.' : 'Keep practicing and try again when you feel ready.'}
              </p>
              <div className="text-6xl font-bold gradient-text mb-2">{questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%</div>
              <p className="text-muted-foreground">{score} of {questions.length} correct</p>
              <Progress value={questions.length > 0 ? (score / questions.length) * 100 : 0} className="h-3 mt-4 mb-8" />
              {passed && (
                <Link to="/certificates">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan mb-3 w-full">
                    <GraduationCap className="w-4 h-4 mr-2" /> View Your Certificate
                  </Button>
                </Link>
              )}
              <Button onClick={() => { setStage('instructions'); setAnswers(Array(questions.length).fill(null)); setQuestions([]); setCurrent(0); }} variant="ghost" className="border border-border text-foreground hover:bg-accent w-full">
                Back to Instructions
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const q = questions[current];
  if (stage === 'exam' && (loadingQ || !q)) {
    return (
      <AppLayout title="Grand Test">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-2 w-full bg-muted" />
          <Skeleton className="h-48 w-full bg-muted rounded-xl" />
          <Skeleton className="h-14 w-full bg-muted rounded-xl" />
          <Skeleton className="h-14 w-full bg-muted rounded-xl" />
          <Skeleton className="h-14 w-full bg-muted rounded-xl" />
          <Skeleton className="h-14 w-full bg-muted rounded-xl" />
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout title="Grand Test — In Progress">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Tab-switch warning */}
        {tabSwitches > 0 && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-center gap-3">
            <AlertOctagon className="w-5 h-5 text-destructive shrink-0" />
            <span className="text-sm text-destructive font-medium">
              Tab switch warning: {tabSwitches}/3. {tabSwitches >= 3 ? 'Exam auto-submitted.' : 'One more switch will auto-submit your exam.'}
            </span>
          </div>
        )}

        {/* Exam Header */}
        <div className="flex items-center justify-between">
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs flex items-center gap-1">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" /> Proctored
          </Badge>
          <div className={`flex items-center gap-2 text-sm font-semibold ${timeLeft < 300 ? 'text-destructive' : 'text-foreground'}`}>
            <Clock className="w-4 h-4" />{formatTime(timeLeft)}
          </div>
        </div>

        <Progress value={questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0} className="h-2" />

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Question {current + 1} of {questions.length}</Badge>
            </div>
            <CardTitle className="text-lg text-foreground font-semibold leading-relaxed text-balance">{q.text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => { const a = [...answers]; a[current] = i; setAnswers(a); }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${answers[current] === i ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${answers[current] === i ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="text-sm text-foreground">{opt}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (current < questions.length - 1) setCurrent(current + 1);
              else handleSubmit();
            }}
            disabled={answers[current] === null}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {current === questions.length - 1 ? 'Submit Exam' : 'Next Question'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
