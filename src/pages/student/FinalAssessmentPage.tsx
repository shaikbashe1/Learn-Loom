import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { db } from '@/db/firebase';
import { collection, getDocs, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { checkAndAwardCertificate } from '@/lib/progress';
import { 
  GraduationCap, 
  ListTodo, 
  Timer, 
  Flag, 
  Video, 
  VideoOff, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Home, 
  CloudLightning, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  BookOpen, 
  Loader2,
  FileText
} from 'lucide-react';

type TestStage = 'instructions' | 'camera' | 'exam' | 'submitted';

interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export default function FinalAssessmentPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!user) return;
    let active = true;
    
    const checkCooldown = async () => {
      setCheckingCooldown(true);
      try {
        const q = query(
          collection(db, 'assessment_attempts'),
          where('user_id', '==', user.id),
          where('course_id', '==', courseId),
          orderBy('created_at', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.length > 0 ? snapshot.docs[0].data() : null;

        if (data && active && data.created_at) {
          const lastAttemptTime = data.created_at?.toDate?.()?.getTime() || new Date(data.created_at).getTime();
          const elapsedSec = (Date.now() - lastAttemptTime) / 1000;
          const remainingSec = Math.ceil(3600 - elapsedSec);
          if (remainingSec > 0) {
            setCooldownTime(remainingSec);
          }
        }
      } catch (err) {
        console.error('Error checking cooldown:', err);
      } finally {
        if (active) setCheckingCooldown(false);
      }
    };

    checkCooldown();
    return () => {
      active = false;
    };
  }, [user, courseId]);

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

  useEffect(() => {
    if (stage !== 'exam') return;
    if (questions.length > 0) return;
    setLoadingQ(true);
    const q = query(
      collection(db, 'grand_test_questions'),
      where('course_id', '==', courseId),
      orderBy('sort_order', 'asc'),
      limit(30)
    );
    getDocs(q).then((snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        if (!data || data.length === 0) {
          toast.error('No assessment questions found for this course.');
          navigate(`/courses/${courseId}`);
          return;
        }
        const mapped: ExamQuestion[] = data.map(q => ({
          id: q.id,
          text: q.question,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string),
          correct: q.correct_idx,
          explanation: q.explanation ?? undefined,
        }));
        const shuffled = mapped.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 20);

        setQuestions(selected);
        setAnswers(Array(selected.length).fill(null));
        setLoadingQ(false);
      })
      .catch((err) => {
        console.error('Error loading questions:', err);
        toast.error('Error loading assessment questions.');
        navigate(`/courses/${courseId}`);
      });
  }, [stage, questions.length, courseId, navigate]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    const finalAnswers = answers;
    const scoreVal = questions.reduce((acc, q, i) => acc + (finalAnswers[i] === q.correct ? 1 : 0), 0);
    const passed = questions.length > 0 && scoreVal / questions.length >= 0.6;

    if (user && courseId) {
      const scorePercentage = Math.round((scoreVal / questions.length) * 100);
      
      const metrics = {
        type: 'mcq',
        tab_switches: tabSwitchesRef.current,
        total_questions: questions.length,
        answers_log: questions.map((q, i) => ({
          question_id: q.id,
          selected_idx: finalAnswers[i] ?? -1,
          correct: finalAnswers[i] === q.correct,
        }))
      };

      await addDoc(collection(db, 'assessment_attempts'), {
        user_id: user.id,
        course_id: courseId,
        score_percentage: scorePercentage,
        is_passed: passed,
        metrics: metrics,
        created_at: new Date().toISOString()
      });

      if (passed) {
        await checkAndAwardCertificate(user.id, courseId);
      }
    }

    setStage('submitted');
    setSubmitting(false);
  }, [answers, questions, submitting, user, courseId]);

  const handleVisibilityChange = useCallback(() => {
    if (stage !== 'exam') return;
    if (document.hidden) {
      tabSwitchesRef.current += 1;
      const next = tabSwitchesRef.current;
      setTabSwitches(next);
      if (next >= 3) {
        toast.error('Tab switch limit reached! Exam has been auto-submitted.', { duration: 6000 });
        handleSubmit();
      } else {
        toast.warning(`Tab switch detected! Warning ${next}/3. Switching again will auto-submit.`, { duration: 5000 });
      }
    }
  }, [stage, handleSubmit]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

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

  useEffect(() => {
    if (stage !== 'exam') return;
    if (timeLeft === 0) {
      toast.warning('Time is up! Your answers have been submitted automatically.');
      handleSubmit();
      return;
    }
    const t = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [stage, timeLeft, handleSubmit]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);

  if (stage === 'instructions') {
    return (
      <AppLayout title="Final Assessment">
        <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex justify-center items-center min-h-[calc(100vh-100px)] select-none">
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 max-w-2xl w-full relative overflow-hidden shadow-sm">
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-30 pointer-events-none" />
            
            <div className="text-center mb-10 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 shadow-sm">
                <GraduationCap className="h-9 w-9" />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-foreground">Final Assessment</h2>
              <p className="text-xs text-muted-foreground mt-2 font-semibold">
                Comprehensive Certification Exam
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 relative z-10">
              {[
                { label: 'Questions', value: '20', icon: ListTodo },
                { label: 'Duration', value: '30 min', icon: Timer },
                { label: 'Passing Score', value: '60%', icon: Flag },
                { label: 'Attempts', value: 'Proctored', icon: Video },
              ].map(item => {
                const StatIcon = item.icon;
                return (
                  <div key={item.label} className="p-4 rounded-2xl bg-background border border-border text-center flex flex-col items-center shadow-sm hover:-translate-y-0.5 transition-transform duration-200">
                    <StatIcon className="h-5 w-5 text-primary mb-1.5" />
                    <div className="text-base font-extrabold text-foreground mb-0.5">{item.value}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-extrabold">{item.label}</div>
                  </div>
                );
              })}
            </div>
            
            <div className="space-y-4 mb-8 relative z-10 bg-muted/30 p-6 rounded-2xl border border-border">
              <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-primary" /> Instructions
              </h4>
              {[
                'Your webcam will be monitored throughout the exam.',
                'Do not switch tabs or minimize the browser window.',
                'Each question has exactly one correct answer.',
                'You cannot go back to previous questions once answered.',
                'Submitting incomplete answers will mark them as incorrect.',
              ].map((inst, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-extrabold text-primary">{i + 1}</span>
                  </div>
                  <span className="text-xs text-muted-foreground leading-normal mt-0.5">{inst}</span>
                </div>
              ))}
            </div>
            
            <div className="relative z-10">
              {checkingCooldown ? (
                <button disabled className="w-full h-12 bg-muted text-muted-foreground rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-border shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking Status...
                </button>
              ) : cooldownTime !== null && cooldownTime > 0 ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/10 flex items-start gap-4 text-destructive shadow-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold mb-1">Cooldown Active</p>
                      <p className="text-xs text-destructive/80 leading-relaxed">
                        You must wait 1 hour between Final Assessment attempts. Please try again after the cooldown expires.
                      </p>
                    </div>
                  </div>
                  <button disabled className="w-full h-12 bg-muted text-muted-foreground rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-border shadow-sm">
                    <Timer className="h-4 w-4" /> Retry in {formatTime(cooldownTime)}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => void startCamera().then(() => setStage('camera'))} 
                  className="w-full bg-primary text-primary-foreground hover:brightness-110 h-12 rounded-xl font-bold text-xs flex justify-center items-center gap-2 shadow-md shadow-primary/10 active:scale-[0.99] transition-all"
                >
                  Proceed to Camera Setup <ArrowRight className="h-4 w-4" />
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
        <div className="max-w-container-max mx-auto px-4 md:px-8 flex justify-center items-center min-h-[calc(100vh-100px)] py-8 select-none">
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 max-w-2xl w-full relative overflow-hidden shadow-sm">
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-30 pointer-events-none" />
            
            <div className="text-center mb-8 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Video className="h-9 w-9" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Webcam Verification</h3>
              <p className="text-xs text-muted-foreground mt-2">Please enable your camera for identity verification.</p>
            </div>
            
            <div className="aspect-video rounded-2xl overflow-hidden bg-background border border-border mb-8 flex items-center justify-center relative shadow-inner z-10">
              {cameraOn ? (
                <>
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-4 border-primary/10 pointer-events-none rounded-2xl" />
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-[9px] font-extrabold text-white tracking-widest">REC</span>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <VideoOff className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground font-semibold">Camera not enabled</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4 relative z-10">
              {!cameraOn ? (
                <>
                  <button 
                    onClick={startCamera} 
                    className="w-full bg-primary text-primary-foreground hover:brightness-110 h-12 rounded-xl font-bold text-xs flex justify-center items-center gap-2 shadow-md shadow-primary/10 active:scale-[0.99] transition-all"
                  >
                    <Video className="h-4 w-4" /> Enable Camera
                  </button>
                  {cameraError && (
                    <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive flex items-start gap-3 shadow-sm">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">{cameraError}</p>
                    </div>
                  )}
                  <button 
                    onClick={() => setStage('exam')} 
                    className="w-full bg-muted text-foreground border border-border h-12 rounded-xl font-bold text-xs hover:bg-muted/85 transition-all shadow-sm"
                  >
                    Skip Camera (Demo Mode)
                  </button>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-2.5 shadow-sm mb-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-foreground">Camera active — you're ready to begin.</span>
                  </div>
                  <button 
                    onClick={() => setStage('exam')} 
                    className="w-full bg-primary text-primary-foreground hover:brightness-110 h-12 rounded-xl font-bold text-xs flex justify-center items-center gap-2 shadow-md shadow-primary/10 active:scale-[0.99] transition-all"
                  >
                    Start Assessment <ArrowRight className="h-4 w-4" />
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
        <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex justify-center items-center min-h-[calc(100vh-100px)] select-none">
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-sm text-center relative overflow-hidden">
            <div className={`absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full blur-3xl opacity-25 pointer-events-none ${
              passed ? 'bg-emerald-500' : 'bg-destructive'
            }`} />

            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-8 border-2 relative z-10 bg-background shadow-sm ${
              passed ? 'border-primary text-primary' : 'border-destructive text-destructive'
            }`}>
              {passed ? <CheckCircle2 className="h-12 w-12" /> : <XCircle className="h-12 w-12" />}
            </div>
            
            <h3 className="font-display text-2xl font-extrabold text-foreground mb-3 relative z-10">
              {passed ? 'You Passed!' : 'Not Quite Yet'}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-8 relative z-10 max-w-md mx-auto leading-relaxed">
              {passed 
                ? 'Congratulations! You have successfully completed the Final Assessment and earned your certification.' 
                : 'Keep practicing and try again when you feel ready. Review your mistakes to improve.'}
            </p>
            
            <div className="bg-background rounded-2xl border border-border p-6 mb-8 inline-block min-w-[200px] shadow-sm relative z-10">
              <div className={`text-5xl font-extrabold leading-none mb-2 font-display tracking-tight ${
                passed ? 'text-primary' : 'text-destructive'
              }`}>
                {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground font-semibold">
                {score} of {questions.length} correct answers
              </p>
            </div>
            
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-10 border border-border relative z-10 shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  passed ? 'bg-primary' : 'bg-destructive'
                }`} 
                style={{ width: `${questions.length > 0 ? (score / questions.length) * 100 : 0}%` }} 
              />
            </div>
            
            <div className="space-y-4 relative z-10">
              {passed && (
                <Link to="/student/certificates" className="block">
                  <button className="w-full bg-primary text-primary-foreground hover:brightness-110 h-12 rounded-xl font-bold text-xs flex justify-center items-center gap-2 shadow-md shadow-primary/10">
                    <Award className="h-4.5 w-4.5" /> View Your Certificate
                  </button>
                </Link>
              )}
              <button 
                onClick={() => navigate(`/courses/${courseId}`)} 
                className="w-full bg-muted text-foreground border border-border h-12 rounded-xl font-bold text-xs hover:bg-muted/85 transition-all shadow-sm flex justify-center items-center gap-2"
              >
                <Home className="h-4 w-4" /> Back to Course
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const q = questions[current];
  const progressPercent = questions.length > 0 ? ((answers.filter(a => a !== null).length) / questions.length) * 100 : 0;

  if (loadingQ || !q) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="space-y-6 w-full max-w-3xl px-6">
          <Skeleton className="h-20 w-full bg-muted rounded-2xl" />
          <Skeleton className="h-[450px] w-full bg-muted rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground h-screen w-screen overflow-hidden flex flex-col select-none">
      {/* Top Navigation (Exam Header) */}
      <header className="bg-card border-b border-border shadow-sm flex justify-between items-center w-full px-6 h-16 shrink-0 z-40 relative">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold text-foreground">Quovexi</span>
          <div className="h-6 w-px bg-border mx-2 hidden md:block" />
          <div className="hidden md:block">
            <h1 className="text-sm font-bold text-foreground">Final Assessment</h1>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium mt-0.5">
              <CloudLightning className="h-3 w-3 text-primary animate-pulse" /> Auto-saving
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">
              Progress: {answers.filter(a => a !== null).length}/{questions.length}
            </span>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden border border-border">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          
          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border ${
            timeLeft < 300 
              ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' 
              : 'bg-primary/5 text-primary border-primary/10'
          }`}>
            <Timer className="h-4 w-4" />
            <span className="tracking-wider font-mono">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Tab-switch warning overlay */}
        {tabSwitches > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-destructive text-destructive-foreground p-5 rounded-2xl border-2 border-destructive shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-8">
            <AlertTriangle className="h-8 w-8 shrink-0 text-white" />
            <div>
              <p className="font-bold text-sm mb-0.5">Tab switch warning: {tabSwitches}/3</p>
              <p className="text-xs opacity-90">{tabSwitches >= 3 ? 'Exam auto-submitted.' : 'One more switch will auto-submit your exam.'}</p>
            </div>
          </div>
        )}

        {/* Left Panel: Question Navigator */}
        <aside className="w-72 bg-card border-r border-border flex flex-col shrink-0 relative z-30 hidden lg:flex">
          <div className="p-6 border-b border-border">
            <h2 className="text-xs font-bold text-foreground mb-3">Question Navigator</h2>
            <div className="flex gap-x-4 gap-y-2 text-[10px] text-muted-foreground font-semibold flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/10" /> Answered
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-background border border-border" /> Unanswered
              </div>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto p-6 scrollbar-hide">
            <div className="grid grid-cols-4 gap-2.5">
              {questions.map((_, i) => {
                const isAnswered = answers[i] !== null;
                const isActive = current === i;
                
                let btnClass = "w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ";
                
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
        <section className="flex-grow bg-muted/10 overflow-hidden relative z-20 flex flex-col">
          <div className="flex-grow overflow-y-auto p-6 md:p-10 pb-32 scrollbar-hide">
            <div className="max-w-[700px] mx-auto w-full">
              
              <div className="mb-6 flex justify-between items-center">
                <span className="bg-card text-muted-foreground border border-border px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  Question {current + 1} of {questions.length}
                </span>
              </div>
              
              {/* Question Text */}
              <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-sm border border-border mb-6">
                <h3 className="text-base sm:text-lg leading-relaxed text-foreground font-bold whitespace-pre-wrap">
                  {q.text}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <label 
                    key={i} 
                    className={`group relative flex items-center p-4 sm:p-5 min-h-[56px] rounded-2xl border cursor-pointer transition-all duration-200 ${
                      answers[current] === i 
                        ? 'bg-primary/5 border-primary shadow-sm' 
                        : 'bg-card border-border hover:bg-muted/30'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="answer" 
                      className="peer sr-only" 
                      checked={answers[current] === i}
                      onChange={() => { const a = [...answers]; a[current] = i; setAnswers(a); }}
                    />
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 transition-colors shrink-0 ${
                      answers[current] === i 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-border group-hover:border-primary/40'
                    }`}>
                      {answers[current] === i && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1 leading-normal">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>

            </div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="bg-card/90 backdrop-blur-md border-t border-border p-4 pb-6 md:pb-4 absolute bottom-0 left-0 right-0 z-30 shadow-lg">
            <div className="max-w-[700px] mx-auto flex justify-between items-center w-full gap-3">
              <button 
                onClick={() => { if (current > 0) setCurrent(current - 1); }}
                disabled={current === 0}
                className="px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground font-bold text-xs hover:bg-muted/30 hover:text-foreground transition-all flex items-center gap-1.5 disabled:opacity-30 min-h-[40px]"
              >
                <ChevronLeft className="h-4 w-4" /> <span>Previous</span>
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    if (current < questions.length - 1) setCurrent(current + 1);
                  }}
                  disabled={current === questions.length - 1 || answers[current] === null}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[40px] ${
                    current === questions.length - 1 
                      ? 'hidden' 
                      : 'bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50'
                  }`}
                >
                  <span>Next</span> <ChevronRight className="h-4 w-4" />
                </button>

                {current === questions.length - 1 && (
                  <button 
                    onClick={handleSubmit}
                    disabled={submitting || answers.includes(null)}
                    className="px-6 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 min-h-[40px] disabled:opacity-50"
                  >
                    <span>{submitting ? 'Submitting...' : 'Submit Exam'}</span> <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
        
        {/* Right Panel: Exam Guidelines */}
        <aside className="w-64 bg-card border-l border-border flex flex-col shrink-0 z-30 hidden xl:flex">
          <div className="p-6 border-b border-border">
            <h2 className="text-xs font-bold text-foreground">Exam Info</h2>
          </div>
          
          <div className="p-6 space-y-6 flex-grow overflow-y-auto">
             <div>
                <h3 className="text-[10px] text-muted-foreground mb-3 uppercase tracking-widest font-extrabold">Guidelines</h3>
                <div className="space-y-3 text-xs text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border">
                  <p className="leading-normal">• Do not exit full screen</p>
                  <p className="leading-normal">• Answer all questions</p>
                  <p className="leading-normal">• Click submit on the last page</p>
                </div>
             </div>
          </div>
          
          <div className="p-6 border-t border-border bg-muted/10 mt-auto">
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="h-4.5 w-4.5" /> Finish Early
            </button>
          </div>
        </aside>

      </main>
    </div>
  );
}
