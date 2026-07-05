'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../../../services/api';
import { SubnetSimulator } from '../../../../../../components/course/SubnetSimulator';
import { 
  BookOpen, 
  CheckCircle, 
  Lock, 
  Menu, 
  Bot, 
  ChevronRight, 
  MessageSquare, 
  Loader2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();

  const courseId = params.slug as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation sidebar collapse states
  const [syllabusOpen, setSyllabusOpen] = useState(true);
  const [aiMentorOpen, setAiMentorOpen] = useState(false);

  // AI chat state
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: 'Hello! I am Loomie, your NetAcad AI study assistant. Ask me anything about this lesson.' },
  ]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!courseId || !lessonId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        // Load Course syllabus structure
        const courseRes = await api.get(`/courses/${courseId}`);
        setCourse(courseRes.data);

        // Load active lesson
        const lessonRes = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
        setLesson(lessonRes.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load lesson content.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, lessonId]);

  const handleComplete = async () => {
    try {
      const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
      const { nextLessonId } = response.data;

      if (nextLessonId) {
        router.push(`/courses/${courseId}/learn/${nextLessonId}`);
      } else {
        router.push(`/courses/${courseId}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark lesson complete.');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsgs = [...messages, { sender: 'user', text: chatInput } as const];
    setMessages(newMsgs);
    setChatInput('');

    // Simulate AI response trigger
    setTimeout(() => {
      setMessages([
        ...newMsgs,
        { 
          sender: 'ai', 
          text: `Got your question about "${lesson?.title || 'this topic'}". To calculate host bits correctly, we subtract net bits from 32.` 
        },
      ]);
    }, 1000);
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
        <Link href="/dashboard" className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold hover:bg-slate-850 transition">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans select-none text-slate-100">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSyllabusOpen(!syllabusOpen)}
            className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-xs tracking-wide text-indigo-400">{course?.title}</span>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <span className="text-xs text-slate-400 font-semibold">{lesson?.title}</span>
        </div>

        <button 
          onClick={() => setAiMentorOpen(!aiMentorOpen)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
            aiMentorOpen 
              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' 
              : 'border-slate-850 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Bot className="w-4 h-4" />
          Ask Loomie
        </button>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Left Syllabus Navigation Sidebar */}
        {syllabusOpen && (
          <aside className="w-72 border-r border-slate-800/40 bg-slate-950 overflow-y-auto p-4 shrink-0 hidden md:block">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Course Curriculum</h3>
            <div className="space-y-4">
              {course?.modules.map((mod: any) => (
                <div key={mod.id} className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 block">
                    Mod {mod.order}: {mod.title}
                  </span>
                  
                  <div className="pl-2 space-y-1 border-l border-slate-850">
                    {mod.chapters.flatMap((ch: any) => ch.lessons).map((les: any) => {
                      const isActive = les.id === lessonId;
                      return (
                        <Link 
                          key={les.id}
                          href={`/courses/${courseId}/learn/${les.id}`}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs transition ${
                            isActive 
                              ? 'bg-indigo-500/10 text-indigo-400 font-bold' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          <span className="truncate pr-3">{les.title}</span>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Center Textbook Content Canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-950/20">
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{lesson?.title}</h1>
            
            {/* Textbook Reading View Content */}
            <article className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-4">
              <p>
                Welcome to this NetAcad conceptual curriculum module. This text outlines packet architectures and routing principles.
              </p>
              
              {/* If the lesson content is about subnetting, render the simulator */}
              {lesson?.title.toLowerCase().includes('subnet') && (
                <SubnetSimulator />
              )}

              <p className="mt-4">
                To design classless subnet schemas correctly, verify network boundary criteria. Review real-world scenarios before locking completion checks.
              </p>
            </article>

            {/* Bottom Lesson Navigation bar */}
            <div className="flex items-center justify-between border-t border-slate-850 pt-8 mt-12">
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-900 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              
              <button 
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:brightness-110 active:scale-[0.99] transition"
              >
                Complete & Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        {/* Right AI Mentor Panel */}
        {aiMentorOpen && (
          <aside className="w-80 border-l border-slate-800/40 bg-slate-950 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-850 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" /> Loomie Assistant
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    m.sender === 'ai' 
                      ? 'bg-slate-900 text-slate-300 mr-auto' 
                      : 'bg-indigo-500 text-white ml-auto'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-850 flex gap-2">
              <input
                type="text"
                placeholder="Ask a question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
              />
              <button 
                type="submit"
                className="bg-indigo-500 text-white p-2 rounded-xl hover:brightness-110 transition"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </form>
          </aside>
        )}

      </div>
    </div>
  );
}
