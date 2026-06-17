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
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex justify-center items-center min-h-[calc(100vh-100px)]">
          <div className="glass-panel rounded-2xl p-8 md:p-12 max-w-2xl w-full relative overflow-hidden shadow-lg card-lift">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            <div className="text-center mb-10 relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-surface border-2 border-primary/20 shadow-sm flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl"></div>
                <span className="material-symbols-outlined text-[40px] text-primary relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-text-primary">LearnLoom Grand Test</h2>
              <p className="font-body-lg text-body-lg text-text-secondary mt-2">Full Stack Development — Certification Exam</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
              {[
                { label: 'Questions', value: '10', icon: 'format_list_bulleted' },
                { label: 'Duration', value: '30 min', icon: 'timer' },
                { label: 'Passing Score', value: '60%', icon: 'flag' },
                { label: 'Attempts', value: '1 (Proctored)', icon: 'videocam' },
              ].map(item => (
                <div key={item.label} className="p-5 rounded-xl bg-surface border border-border-base text-center flex flex-col items-center shadow-sm">
                  <span className="material-symbols-outlined text-primary mb-2 text-[24px]">{item.icon}</span>
                  <div className="font-headline-md text-[24px] font-bold text-text-primary mb-1">{item.value}</div>
                  <div className="font-label-sm text-[11px] text-text-secondary uppercase tracking-widest font-bold">{item.label}</div>
                </div>
              ))}
            </div>
            
            <div className="space-y-4 mb-10 relative z-10 bg-surface/50 p-6 rounded-xl border border-border-base">
              <h4 className="font-headline-md text-[20px] font-bold text-text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">rule</span> Instructions
              </h4>
              {[
                'Your webcam will be monitored throughout the exam.',
                'Do not switch tabs or minimize the browser window.',
                'Each question has exactly one correct answer.',
                'You cannot go back to previous questions once answered.',
                'Submitting incomplete answers will mark them as incorrect.',
              ].map((inst, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="font-label-sm text-[12px] text-primary">{i + 1}</span>
                  </div>
                  <span className="font-body-sm text-[14px] text-text-secondary mt-0.5">{inst}</span>
                </div>
              ))}
            </div>
            
            <div className="relative z-10">
              {checkingCooldown ? (
                <button disabled className="w-full h-14 bg-surface text-text-secondary rounded-xl font-label-md flex items-center justify-center gap-2 border border-border-base shadow-sm">
                  <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span> Checking Status...
                </button>
              ) : cooldownTime !== null && cooldownTime > 0 ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-error/5 border border-error/20 flex items-start gap-4 text-error shadow-sm">
                    <span className="material-symbols-outlined text-[24px] mt-0.5">warning</span>
                    <div>
                      <p className="font-headline-md text-[18px] font-bold mb-1">Cooldown Active</p>
                      <p className="font-body-sm text-[14px] text-error/80">
                        You must wait 1 hour between Grand Test attempts. Please try again after the cooldown expires.
                      </p>
                    </div>
                  </div>
                  <button disabled className="w-full h-14 bg-surface text-text-secondary rounded-xl font-label-md flex items-center justify-center gap-2 cursor-not-allowed border border-border-base shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">schedule</span> Retry in {formatTime(cooldownTime)}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setStage('camera')} 
                  className="w-full bg-primary text-on-primary hover:bg-primary-container h-14 rounded-xl font-headline-md text-[16px] font-bold flex justify-center items-center gap-3 shadow-md transition-all card-lift active:scale-[0.98]"
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
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-center items-center min-h-[calc(100vh-100px)] py-stack-lg">
          <div className="glass-panel rounded-2xl p-8 md:p-12 max-w-2xl w-full relative overflow-hidden shadow-lg card-lift ai-gradient-border">
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
            
            <div className="text-center mb-8 relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-surface border-2 border-primary/20 shadow-sm flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl"></div>
                <span className="material-symbols-outlined text-[40px] text-primary relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              </div>
              <h3 className="font-headline-lg text-[28px] font-bold text-text-primary">Webcam Verification</h3>
              <p className="font-body-md text-text-secondary mt-2">Please enable your camera for identity verification.</p>
            </div>
            
            <div className="aspect-video rounded-xl overflow-hidden bg-surface border border-border-base mb-8 flex items-center justify-center relative shadow-inner z-10">
              {cameraOn ? (
                <>
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-4 border-primary/20 pointer-events-none rounded-xl"></div>
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
                    <span className="font-label-sm text-[11px] font-bold text-white tracking-widest">REC</span>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <span className="material-symbols-outlined text-[48px] text-text-secondary opacity-30 mb-3">videocam_off</span>
                  <p className="font-body-md text-text-secondary">Camera not enabled</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4 relative z-10">
              {!cameraOn ? (
                <>
                  <button 
                    onClick={startCamera} 
                    className="w-full bg-primary text-on-primary hover:bg-primary-container h-14 rounded-xl font-headline-md text-[16px] font-bold flex justify-center items-center gap-3 shadow-md transition-all card-lift"
                  >
                    <span className="material-symbols-outlined text-[24px]">videocam</span> Enable Camera
                  </button>
                  {cameraError && (
                    <div className="p-4 rounded-xl bg-error/5 border border-error/20 text-error flex items-start gap-3 shadow-sm">
                      <span className="material-symbols-outlined text-[20px] mt-0.5">error</span>
                      <p className="font-body-sm text-[14px]">{cameraError}</p>
                    </div>
                  )}
                  <button 
                    onClick={() => setStage('exam')} 
                    className="w-full bg-surface text-text-secondary hover:text-text-primary border border-border-base h-14 rounded-xl font-label-md transition-colors shadow-sm card-lift"
                  >
                    Skip Camera (Demo Mode)
                  </button>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-success/5 border border-success/30 flex items-center gap-3 shadow-sm mb-4">
                    <span className="material-symbols-outlined text-[24px] text-success" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-[15px] font-medium text-text-primary">Camera active — you're ready to begin.</span>
                  </div>
                  <button 
                    onClick={() => setStage('exam')} 
                    className="w-full bg-primary text-on-primary hover:bg-primary-container h-14 rounded-xl font-headline-md text-[16px] font-bold flex justify-center items-center gap-3 shadow-md transition-all card-lift active:scale-[0.98]"
                  >
                    Start Assessment <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
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
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex justify-center items-center min-h-[calc(100vh-100px)]">
          <div className="glass-panel rounded-2xl p-8 md:p-12 max-w-2xl w-full border border-border-base shadow-lg text-center relative overflow-hidden card-lift">
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none ${passed ? 'bg-primary/10' : 'bg-error/10'}`}></div>

            <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 border-4 relative z-10 bg-surface shadow-sm ${passed ? 'border-primary text-primary' : 'border-error text-error'}`}>
              <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>{passed ? 'verified' : 'gpp_bad'}</span>
            </div>
            
            <h3 className="font-display-lg text-[40px] font-bold text-text-primary mb-3 relative z-10">{passed ? 'You Passed!' : 'Not Quite Yet'}</h3>
            <p className="font-body-lg text-[16px] text-text-secondary mb-8 relative z-10 max-w-lg mx-auto leading-relaxed">
              {passed ? 'Congratulations! You have successfully completed the Grand Test and earned your certification.' : 'Keep practicing and try again when you feel ready. Review your mistakes to improve.'}
            </p>
            
            <div className="bg-surface rounded-xl border border-border-base p-6 mb-8 inline-block min-w-[200px] shadow-sm relative z-10">
              <div className="text-[64px] font-bold leading-none mb-1 font-headline-md tracking-tight" style={{ color: passed ? 'var(--primary)' : 'var(--error)' }}>
                {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%
              </div>
              <p className="font-label-md text-[14px] text-text-secondary">{score} of {questions.length} correct</p>
            </div>
            
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden mb-10 border border-border-base relative z-10 shadow-inner">
              <div className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-primary shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-error'}`} style={{ width: `${questions.length > 0 ? (score / questions.length) * 100 : 0}%` }}></div>
            </div>
            
            <div className="space-y-4 relative z-10">
              {passed && (
                <Link to="/student/certificates" className="block">
                  <button className="w-full bg-primary text-on-primary hover:bg-primary-container h-14 rounded-xl font-headline-md text-[16px] font-bold flex justify-center items-center gap-3 shadow-md transition-all card-lift">
                    <span className="material-symbols-outlined text-[24px]">workspace_premium</span> View Your Certificate
                  </button>
                </Link>
              )}
              <button 
                onClick={() => { setStage('instructions'); setAnswers(Array(questions.length).fill(null)); setQuestions([]); setCurrent(0); }} 
                className="w-full bg-surface text-text-secondary hover:text-text-primary border border-border-base h-14 rounded-xl font-label-md text-[16px] transition-colors flex justify-center items-center gap-3 shadow-sm card-lift"
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
  const progressPercent = questions.length > 0 ? ((answers.filter(a => a !== null).length) / questions.length) * 100 : 0;

  if (loadingQ || !q) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="space-y-6 w-full max-w-3xl px-6">
          <Skeleton className="h-20 w-full bg-surface rounded-xl" />
          <Skeleton className="h-[500px] w-full bg-surface rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-text-primary font-body-md h-screen w-screen overflow-hidden flex flex-col">
      {/* Top Navigation (Exam Header) */}
      <header className="bg-surface/70 backdrop-blur-xl border-b border-border-base shadow-sm flex justify-between items-center w-full px-6 md:px-10 h-20 shrink-0 z-40 relative">
        <div className="flex items-center gap-4">
          <span className="font-headline-md text-[24px] font-bold text-primary">LearnLoom</span>
          <div className="h-6 w-px bg-border-base mx-2 hidden md:block"></div>
          <div className="hidden md:block">
            <h1 className="font-headline-md text-[18px] font-bold text-text-primary">Certification Grand Test</h1>
            <p className="font-label-sm text-[12px] text-text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">cloud_done</span> Auto-saving
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Progress */}
          <div className="hidden md:flex items-center gap-3">
            <span className="font-label-md text-[14px] font-bold text-text-secondary">Progress: {answers.filter(a => a !== null).length}/{questions.length}</span>
            <div className="w-32 h-2.5 bg-surface-container rounded-full overflow-hidden shadow-inner border border-border-base">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-[15px] shadow-sm border ${timeLeft < 300 ? 'bg-error/10 text-error border-error/30 animate-pulse' : 'bg-primary/5 text-primary border-primary/20'}`}>
            <span className="material-symbols-outlined text-[20px]">timer</span>
            <span className="font-bold tracking-wider">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Tab-switch warning overlay */}
        {tabSwitches > 0 && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-error/95 backdrop-blur-md text-white p-5 rounded-2xl border-2 border-error shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-8">
            <span className="material-symbols-outlined text-[36px]">warning</span>
            <div>
              <p className="font-bold text-[18px] mb-1">Tab switch warning: {tabSwitches}/3</p>
              <p className="text-[14px] opacity-90">{tabSwitches >= 3 ? 'Exam auto-submitted.' : 'One more switch will auto-submit your exam.'}</p>
            </div>
          </div>
        )}

        {/* Left Panel: Question Navigator */}
        <aside className="w-72 bg-surface border-r border-border-base flex flex-col shrink-0 relative z-30 hidden lg:flex shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
          <div className="p-5 border-b border-border-base bg-surface-bright/50">
            <h2 className="font-headline-md text-[18px] font-bold text-text-primary mb-3">Question Navigator</h2>
            <div className="flex gap-x-4 gap-y-2 font-label-sm text-[12px] flex-wrap">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_5px_rgba(37,99,235,0.4)]"></div> Answered</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-surface border border-border-base"></div> Unanswered</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            <div className="grid grid-cols-4 gap-2.5">
              {questions.map((_, i) => {
                const isAnswered = answers[i] !== null;
                const isActive = current === i;
                
                let btnClass = "w-full aspect-square rounded-lg flex items-center justify-center font-label-md text-[14px] font-bold transition-all duration-200 card-lift ring-0 ";
                
                if (isActive) {
                  btnClass += "bg-surface border-2 border-primary text-primary shadow-[0_0_12px_rgba(37,99,235,0.2)]";
                } else if (isAnswered) {
                  btnClass += "bg-primary text-white hover:bg-primary-container border border-primary";
                } else {
                  btnClass += "bg-surface border border-border-base text-text-secondary hover:border-primary/50 hover:bg-surface-container/50";
                }

                return (
                  <button 
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={btnClass}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center Panel: Question Area */}
        <section className="flex-1 bg-surface-bright overflow-hidden relative z-20 flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32">
            <div className="max-w-[800px] mx-auto w-full">
              
              <div className="mb-6 flex justify-between items-center">
                <span className="bg-surface text-text-secondary border border-border-base px-3 py-1.5 rounded-lg font-label-sm text-[12px] font-bold uppercase tracking-wider shadow-sm">
                  Question {current + 1} of {questions.length}
                </span>
              </div>
              
              {/* Question Text */}
              <div className="bg-surface rounded-2xl p-8 shadow-sm border border-border-base mb-8 card-lift">
                <h3 className="font-body-lg text-[20px] leading-relaxed text-text-primary font-bold whitespace-pre-wrap">
                  {q.text}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-4">
                {q.options.map((opt, i) => (
                  <label 
                    key={i} 
                    className={`group relative flex items-center p-5 rounded-xl border cursor-pointer transition-all duration-200 card-lift ${answers[current] === i ? 'bg-surface border-primary shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'bg-surface border-border-base hover:bg-surface-container-lowest'}`}
                  >
                    <input 
                      type="radio" 
                      name="answer" 
                      className="peer sr-only" 
                      checked={answers[current] === i}
                      onChange={() => { const a = [...answers]; a[current] = i; setAnswers(a); }}
                    />
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors shrink-0 ${answers[current] === i ? 'border-primary bg-primary' : 'border-outline-variant group-hover:border-primary/50'}`}>
                      <span className={`material-symbols-outlined text-[16px] text-white transition-opacity ${answers[current] === i ? 'opacity-100' : 'opacity-0'}`} style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                    <span className="font-body-lg text-[16px] text-text-primary flex-1">{opt}</span>
                    <div className={`absolute inset-0 rounded-xl border-2 pointer-events-none transition-colors ${answers[current] === i ? 'border-primary' : 'border-transparent'}`}></div>
                    <div className={`absolute inset-0 rounded-xl bg-primary-fixed/5 pointer-events-none transition-opacity ${answers[current] === i ? 'opacity-100' : 'opacity-0'}`}></div>
                  </label>
                ))}
              </div>

            </div>
          </div>

          {/* Bottom Navigation Bar (Exam Actions) */}
          <div className="bg-surface/90 backdrop-blur-md border-t border-border-base p-4 absolute bottom-0 left-0 right-0 z-30 shadow-[0_-4px_15px_rgba(0,0,0,0.03)]">
            <div className="max-w-[800px] mx-auto flex justify-between items-center px-4 w-full">
              <button 
                onClick={() => { if (current > 0) setCurrent(current - 1); }}
                disabled={current === 0}
                className="px-6 py-3 rounded-xl border border-border-base bg-surface text-text-secondary font-label-md text-[14px] font-bold hover:bg-surface-container-lowest hover:text-text-primary transition-colors flex items-center gap-2 disabled:opacity-30 shadow-sm card-lift"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span> Previous
              </button>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    if (current < questions.length - 1) setCurrent(current + 1);
                  }}
                  disabled={current === questions.length - 1 || answers[current] === null}
                  className={`px-8 py-3 rounded-xl font-label-md text-[15px] font-bold transition-all shadow-md flex items-center gap-2 card-lift ${current === questions.length - 1 ? 'hidden' : 'bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50'}`}
                >
                  Next <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>

                {current === questions.length - 1 && (
                  <button 
                    onClick={handleSubmit}
                    disabled={submitting || answers.includes(null)}
                    className="px-8 py-3 rounded-xl bg-error text-white font-label-md text-[15px] font-bold hover:bg-error/90 transition-all shadow-md flex items-center gap-2 card-lift disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Exam'} <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
        
        {/* Right Panel: Tools / Info (Optional, keeping it simple as per original design but matching new theme) */}
        <aside className="w-64 bg-surface border-l border-border-base flex flex-col shrink-0 z-30 hidden xl:flex shadow-[4px_0_15px_rgba(0,0,0,0.02)]">
          <div className="p-5 border-b border-border-base bg-surface-bright/50">
            <h2 className="font-headline-md text-[18px] font-bold text-text-primary">Exam Info</h2>
          </div>
          <div className="p-5 space-y-6 flex-1 overflow-y-auto">
             <div>
                <h3 className="font-label-md text-[12px] text-text-secondary mb-3 uppercase tracking-widest font-bold">Guidelines</h3>
                <div className="space-y-3 font-body-sm text-[13px] text-text-secondary bg-surface-container/30 p-4 rounded-xl border border-border-base">
                  <p>• Do not exit full screen</p>
                  <p>• Answer all questions</p>
                  <p>• Click submit on the last page</p>
                </div>
             </div>
          </div>
          <div className="p-5 border-t border-border-base bg-surface-bright/50 mt-auto">
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-6 py-3.5 rounded-xl bg-error text-white font-label-md text-[14px] font-bold hover:bg-error/90 transition-all shadow-md flex items-center justify-center gap-2 card-lift disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span> Finish Early
            </button>
          </div>
        </aside>

      </main>
    </div>
  );
}
