'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../services/api';
import { 
  Loader2, 
  Clock, 
  HelpCircle, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle,
  Flag,
  AlertCircle
} from 'lucide-react';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();

  const quizId = params.quizId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizData, setQuizData] = useState<any>(null);
  
  // Active state
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins default
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!quizId) return;

    const startAttempt = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await api.post(`/quizzes/${quizId}/start`);
        setQuizData(res.data);

        // Calculate time left from expiresAt
        const expiresAt = new Date(res.data.expiresAt).getTime();
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setTimeLeft(diff);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to start quiz attempt.');
      } finally {
        setLoading(false);
      }
    };

    startAttempt();
  }, [quizId]);

  // Timer loop
  useEffect(() => {
    if (loading || error || result) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, error, result]);

  const handleAutoSubmit = () => {
    // Triggers submission immediately
    submitAnswers();
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers({
      ...answers,
      [questionId]: optionId,
    });
  };

  const toggleFlag = (questionId: string) => {
    setFlagged({
      ...flagged,
      [questionId]: !flagged[questionId],
    });
  };

  const submitAnswers = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setError('');

      // Format payload
      const payloadAnswers = Object.entries(answers).map(([qId, val]) => ({
        questionId: qId,
        selectedAnswer: val,
      }));

      const res = await api.post(`/quizzes/${quizId}/submit`, {
        answers: payloadAnswers,
      });

      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <p className="text-rose-400 text-sm font-semibold mb-4">{error}</p>
        <button onClick={() => router.back()} className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold hover:bg-slate-850 transition">
          Go Back
        </button>
      </div>
    );
  }

  // Render scorecard if results exist
  if (result) {
    const passed = result.passed;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6 sm:p-12 font-sans select-none">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              passed ? 'bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400' : 'bg-rose-500/10 border-2 border-rose-500 text-rose-400'
            }`}>
              {passed ? <CheckCircle className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">{passed ? 'Assessment Passed! 🎉' : 'Assessment Failed'}</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              {passed 
                ? 'Excellent! You have successfully mastered these concepts.' 
                : 'Study the curriculum and try again to unlock subsequent sections.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-850">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Final Score</span>
              <span className="text-slate-200 font-mono text-lg font-bold">{result.scorePercent}%</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Correct Answers</span>
              <span className="text-slate-200 font-mono text-lg font-bold">{result.correctCount}/{result.totalQuestions}</span>
            </div>
          </div>

          <button
            onClick={() => router.back()}
            className="w-full py-3.5 bg-slate-850 hover:bg-slate-800 transition text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2"
          >
            Return to Lesson
          </button>
        </div>
      </div>
    );
  }

  const activeQuestion = quizData.questions[activeIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans select-none text-slate-100">
      
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-xs text-white">{quizData.quizTitle}</span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-md">
            {answeredCount}/{quizData.questions.length} Answered
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 text-slate-200 text-xs font-bold font-mono">
          <Clock className="w-4 h-4 text-indigo-400" />
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Left Side Navigation Table */}
        <aside className="w-64 border-r border-slate-800/40 bg-slate-950 p-4 shrink-0 hidden md:block overflow-y-auto">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Question List</h3>
          <div className="grid grid-cols-4 gap-2">
            {quizData.questions.map((q: any, idx: number) => {
              const isSelected = idx === activeIdx;
              const isAnswered = !!answers[q.id];
              const isFlagged = !!flagged[q.id];

              let bgClasses = 'bg-slate-900 text-slate-400 border border-slate-850';
              if (isAnswered) bgClasses = 'bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold';
              if (isFlagged) bgClasses = 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold';
              if (isSelected) bgClasses = 'bg-indigo-500 text-white font-bold ring-2 ring-indigo-500/20';

              return (
                <button
                  key={q.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`h-10 rounded-xl flex items-center justify-center text-xs transition active:scale-[0.98] ${bgClasses}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col justify-between">
          <div className="max-w-xl mx-auto w-full space-y-6">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>QUESTION {activeIdx + 1} OF {quizData.questions.length}</span>
              <span>POINTS: {activeQuestion.points}</span>
            </div>

            {/* Question Text */}
            <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
              {activeQuestion.text}
            </h2>

            {/* Dynamic Options list */}
            <div className="space-y-3 pt-2">
              {activeQuestion.answers.map((opt: any) => {
                const isSelected = answers[activeQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(activeQuestion.id, opt.id)}
                    className={`w-full text-left p-4 rounded-2xl border text-xs leading-relaxed transition flex items-center gap-3 font-medium ${
                      isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' 
                        : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-700'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions footer */}
          <div className="max-w-xl mx-auto w-full border-t border-slate-850 pt-6 mt-8 flex items-center justify-between">
            <button
              onClick={() => toggleFlag(activeQuestion.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                flagged[activeQuestion.id]
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                  : 'border-slate-850 text-slate-500 hover:text-white'
              }`}
            >
              <Flag className="w-4 h-4" /> Flag
            </button>

            <div className="flex gap-2">
              <button
                disabled={activeIdx === 0}
                onClick={() => setActiveIdx(activeIdx - 1)}
                className="p-2.5 rounded-xl border border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {activeIdx < quizData.questions.length - 1 ? (
                <button
                  onClick={() => setActiveIdx(activeIdx + 1)}
                  className="p-2.5 rounded-xl border border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-white transition"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={submitAnswers}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-500 hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finish Exam'}
                </button>
              )}
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
