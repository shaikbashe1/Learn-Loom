import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
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

  if (stage === 'instructions') {
    return (
      <AppLayout title="Grand Test">
        <div className="max-w-[1440px] mx-auto flex justify-center items-center py-xl">
          <div className="glass-card rounded-xl p-xl max-w-2xl w-full relative overflow-hidden border border-outline-variant/60 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            <div className="text-center mb-xl relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(192,193,255,0.2)]">
                <span className="material-symbols-outlined text-[40px] text-primary">school</span>
              </div>
              <h2 className="font-display text-display text-on-surface">LearnLoom Grand Test</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">Full Stack Development — Certification Exam</p>
            </div>
            
            <div className="grid grid-cols-2 gap-md mb-xl relative z-10">
              {[
                { label: 'Questions', value: '10', icon: 'format_list_bulleted' },
                { label: 'Duration', value: '30 min', icon: 'timer' },
                { label: 'Passing Score', value: '60%', icon: 'flag' },
                { label: 'Attempts', value: '1 (Proctored)', icon: 'videocam' },
              ].map(item => (
                <div key={item.label} className="p-md rounded-xl bg-surface-container-low border border-outline-variant/40 text-center flex flex-col items-center">
                  <span className="material-symbols-outlined text-outline mb-2">{item.icon}</span>
                  <div className="font-headline-md text-headline-md text-primary mb-1">{item.value}</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{item.label}</div>
                </div>
              ))}
            </div>
            
            <div className="space-y-sm mb-xl relative z-10 bg-surface-container-lowest p-md rounded-lg border border-outline-variant/30">
              <h4 className="font-headline-sm text-headline-sm text-on-surface mb-md flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">rule</span> Instructions
              </h4>
              {[
                'Your webcam will be monitored throughout the exam.',
                'Do not switch tabs or minimize the browser window.',
                'Each question has exactly one correct answer.',
                'You cannot go back to previous questions once answered.',
                'Submitting incomplete answers will mark them as incorrect.',
              ].map((inst, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="font-label-sm text-[12px] text-primary">{i + 1}</span>
                  </div>
                  <span className="font-body-md text-body-md text-on-surface-variant mt-0.5">{inst}</span>
                </div>
              ))}
            </div>
            
            <div className="relative z-10">
              {checkingCooldown ? (
                <button disabled className="w-full h-12 bg-surface-variant text-on-surface-variant rounded-lg font-label-md flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span> Checking Status...
                </button>
              ) : cooldownTime !== null && cooldownTime > 0 ? (
                <div className="space-y-4">
                  <div className="p-md rounded-lg bg-error/10 border border-error/30 flex items-start gap-3 text-error">
                    <span className="material-symbols-outlined text-[20px] mt-0.5">warning</span>
                    <div>
                      <p className="font-headline-sm text-headline-sm mb-1">Cooldown Active</p>
                      <p className="font-body-md text-body-md text-error/80">
                        You must wait 1 hour between Grand Test attempts. Please try again after the cooldown expires.
                      </p>
                    </div>
                  </div>
                  <button disabled className="w-full h-12 bg-surface-variant text-on-surface-variant rounded-lg font-label-md flex items-center justify-center gap-2 cursor-not-allowed border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[20px]">schedule</span> Retry in {formatTime(cooldownTime)}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setStage('camera')} 
                  className="w-full bg-primary text-on-primary-container hover:brightness-110 h-12 rounded-lg font-label-md text-label-md flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.2)] transition-all"
                >
                  Proceed to Camera Setup <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (stage === 'camera') {
    return (
      <AppLayout title="Camera Setup">
        <div className="max-w-[1440px] mx-auto flex justify-center items-center py-xl">
          <div className="glass-card rounded-xl p-xl max-w-2xl w-full relative overflow-hidden border border-outline-variant/60 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <div className="text-center mb-xl">
              <span className="material-symbols-outlined text-[48px] text-primary mb-3 text-shadow-[0_0_15px_rgba(192,193,255,0.4)]">shield_person</span>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Webcam Verification</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">Please enable your camera for identity verification.</p>
            </div>
            
            <div className="aspect-video rounded-xl overflow-hidden bg-surface-lowest border border-outline-variant/40 mb-xl flex items-center justify-center relative shadow-inner">
              {cameraOn ? (
                <>
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-4 border-primary/20 pointer-events-none rounded-xl"></div>
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                    <span className="font-label-sm text-[12px] text-white">REC</span>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline mb-3 opacity-50">videocam_off</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">Camera not enabled</p>
                </div>
              )}
            </div>
            
            <div className="space-y-md">
              {!cameraOn ? (
                <>
                  <button 
                    onClick={startCamera} 
                    className="w-full bg-primary text-on-primary-container hover:brightness-110 h-12 rounded-lg font-label-md text-label-md flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.2)] transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">videocam</span> Enable Camera
                  </button>
                  {cameraError && (
                    <div className="p-md rounded-lg bg-error/10 border border-error/30 text-error flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] mt-0.5">error</span>
                      <p className="font-body-sm text-[14px]">{cameraError}</p>
                    </div>
                  )}
                  <button 
                    onClick={() => setStage('exam')} 
                    className="w-full border border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface h-12 rounded-lg font-label-md transition-colors"
                  >
                    Skip Camera (Demo Mode)
                  </button>
                </>
              ) : (
                <>
                  <div className="p-md rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[24px] text-primary">check_circle</span>
                    <span className="font-body-md text-body-md text-on-surface">Camera active — you're ready to begin.</span>
                  </div>
                  <button 
                    onClick={() => setStage('exam')} 
                    className="w-full bg-primary text-on-primary-container hover:brightness-110 h-12 rounded-lg font-label-md text-label-md flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.2)] transition-all"
                  >
                    Start Exam <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (stage === 'submitted') {
    const passed = questions.length > 0 && score / questions.length >= 0.6;
    return (
      <AppLayout title="Exam Results">
        <div className="max-w-[1440px] mx-auto flex justify-center items-center py-xl">
          <div className="glass-card rounded-xl p-xl max-w-2xl w-full border border-outline-variant/60 shadow-[0_0_20px_rgba(0,0,0,0.2)] text-center">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-xl border-4 ${passed ? 'bg-primary/10 border-primary text-primary' : 'bg-error/10 border-error text-error'}`}>
              <span className="material-symbols-outlined text-[64px]">{passed ? 'verified' : 'gpp_bad'}</span>
            </div>
            
            <h3 className="font-display text-display text-on-surface mb-2">{passed ? 'You Passed!' : 'Not Quite Yet'}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
              {passed ? 'Congratulations! You have successfully completed the Grand Test and earned your certification.' : 'Keep practicing and try again when you feel ready.'}
            </p>
            
            <div className="text-[80px] font-bold leading-none mb-4" style={{ color: passed ? 'var(--primary)' : 'var(--error)', textShadow: passed ? '0 0 20px rgba(192,193,255,0.3)' : 'none' }}>
              {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%
            </div>
            <p className="font-headline-sm text-headline-sm text-outline mb-xl">{score} of {questions.length} correct</p>
            
            <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden mb-xl border border-outline-variant/40">
              <div className={`h-full rounded-full ${passed ? 'bg-primary shadow-[0_0_10px_var(--primary)]' : 'bg-error'}`} style={{ width: `${questions.length > 0 ? (score / questions.length) * 100 : 0}%` }}></div>
            </div>
            
            <div className="space-y-md">
              {passed && (
                <Link to="/certificates" className="block">
                  <button className="w-full bg-primary text-on-primary-container hover:brightness-110 h-14 rounded-lg font-label-md text-label-md flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all">
                    <span className="material-symbols-outlined text-[24px]">workspace_premium</span> View Your Certificate
                  </button>
                </Link>
              )}
              <button 
                onClick={() => { setStage('instructions'); setAnswers(Array(questions.length).fill(null)); setQuestions([]); setCurrent(0); }} 
                className="w-full border border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface h-12 rounded-lg font-label-md transition-colors flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">home</span> Back to Instructions
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // EXAM STATE (Lockdown Environment)
  const q = questions[current];
  if (loadingQ || !q) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-xl">
          <Skeleton className="h-16 w-full bg-surface-container rounded-xl" />
          <Skeleton className="h-[400px] w-full bg-surface-container rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-md h-screen w-screen overflow-hidden flex flex-col">
      {/* Grand Test Header (Intentional suppression of standard global nav for test lockdown) */}
      <header className="bg-surface-container-lowest border-b border-outline-variant/60 px-lg h-16 flex justify-between items-center shrink-0 z-50">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined text-primary text-[28px]">school</span>
          <div className="font-headline-md text-headline-md text-on-surface">LearnLoom <span className="text-on-surface-variant font-label-md text-label-md ml-sm hidden md:inline">Grand Exam</span></div>
        </div>
        
        {/* Timer & Proctoring Status */}
        <div className="flex items-center gap-md md:gap-xl bg-surface-container rounded-full px-md md:px-lg py-sm border border-outline-variant/30">
          <div className="flex items-center gap-xs text-error">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
            </span>
            <span className="font-label-md text-label-md uppercase tracking-wider ml-xs hidden sm:inline">Proctoring Active</span>
          </div>
          <div className="w-[1px] h-4 bg-outline-variant/60"></div>
          <div className={`flex items-center gap-sm font-label-md text-label-md font-bold ${timeLeft < 300 ? 'text-error animate-pulse' : 'text-primary'}`}>
            <span className="material-symbols-outlined">timer</span>
            {formatTime(timeLeft)}
          </div>
        </div>
        
        <div className="flex items-center gap-md">
          <button 
            onClick={handleSubmit}
            className="bg-primary text-on-primary-container font-label-md text-label-md px-md py-sm rounded hover:brightness-110 transition-colors shadow-[0_0_10px_rgba(192,193,255,0.2)]"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden flex-col md:flex-row">
        
        {/* Tab-switch warning overlay (absolute) */}
        {tabSwitches > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-error/90 backdrop-blur text-white p-4 rounded-xl border border-error shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
            <span className="material-symbols-outlined text-[32px]">warning</span>
            <div>
              <p className="font-bold text-[16px]">Tab switch warning: {tabSwitches}/3</p>
              <p className="text-sm opacity-90">{tabSwitches >= 3 ? 'Exam auto-submitted.' : 'One more switch will auto-submit your exam.'}</p>
            </div>
          </div>
        )}

        {/* Left Panel: Question Description */}
        <aside className="w-full md:w-[45%] bg-surface border-r border-outline-variant/60 flex flex-col h-1/2 md:h-full overflow-y-auto">
          <div className="p-xl border-b border-outline-variant/30 bg-surface-container-low sticky top-0 z-10 flex justify-between items-center">
            <span className="bg-primary/20 text-primary font-label-sm text-label-sm px-sm py-xs rounded uppercase tracking-wide border border-primary/30">Question {current + 1} of {questions.length}</span>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${answers[i] !== null ? 'bg-primary' : i === current ? 'bg-primary/40 border border-primary' : 'bg-outline-variant/40'}`} />
              ))}
            </div>
          </div>
          <div className="p-xl prose prose-invert max-w-none text-on-surface font-body-lg leading-relaxed whitespace-pre-wrap">
            {q.text}
          </div>
        </aside>

        {/* Right Panel: Options & Navigation */}
        <section className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest relative h-1/2 md:h-full">
          <div className="flex-1 overflow-y-auto p-xl flex flex-col gap-md bg-surface-lowest relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20"></div>
            
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md relative z-10 flex items-center gap-2">
              <span className="material-symbols-outlined text-outline">fact_check</span> Select your answer:
            </h3>

            <div className="space-y-md relative z-10">
              {q.options.map((opt, i) => (
                <label 
                  key={i} 
                  className={`group relative flex items-center p-lg rounded-lg border transition-all cursor-pointer shadow-sm ${answers[current] === i ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(192,193,255,0.1)]' : 'bg-surface-container border-outline-variant/60 hover:border-primary/50 hover:bg-surface-container-high'}`}
                >
                  <input 
                    type="radio" 
                    name="answer" 
                    className="sr-only peer" 
                    checked={answers[current] === i}
                    onChange={() => { const a = [...answers]; a[current] = i; setAnswers(a); }}
                  />
                  <div className={`flex items-center justify-center w-8 h-8 rounded border mr-md transition-colors shrink-0 ${answers[current] === i ? 'bg-primary border-primary' : 'border-outline-variant bg-surface'}`}>
                    <span className={`material-symbols-outlined text-[20px] ${answers[current] === i ? 'text-on-primary' : 'opacity-0'}`}>check</span>
                  </div>
                  <div className={`flex-1 font-body-md text-[16px] transition-colors ${answers[current] === i ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                    {opt}
                  </div>
                  <div className={`font-label-md text-label-md px-sm py-xs border rounded ml-md shrink-0 ${answers[current] === i ? 'text-primary border-primary/50 bg-surface' : 'text-outline border-outline/30 bg-surface-lowest'}`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Bottom Navigation Area */}
          <div className="h-20 bg-surface-container flex items-center justify-between px-xl shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.2)] z-20 border-t border-outline-variant/60">
             <button 
                onClick={() => { if (current > 0) setCurrent(current - 1); }}
                disabled={current === 0}
                className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface px-xl py-sm transition-colors disabled:opacity-30 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Previous
              </button>
              
              <button 
                onClick={() => {
                  if (current < questions.length - 1) setCurrent(current + 1);
                  else handleSubmit();
                }}
                disabled={answers[current] === null || submitting}
                className="bg-primary text-on-primary-container font-label-md text-[16px] px-xl py-3 rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] disabled:opacity-50 flex items-center gap-2"
              >
                {current === questions.length - 1 ? 'Finish & Submit' : 'Next Question'}
                {current !== questions.length - 1 && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>
          </div>
        </section>
      </main>
    </div>
  );
}
