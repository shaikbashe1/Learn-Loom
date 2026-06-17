import { useState, useRef, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createParser } from 'eventsource-parser';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ChatMessage } from '@/types/types';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 10; // last N turns sent to LLM

const SUGGESTED_PROMPTS = [
  'Explain dynamic programming with a real example',
  'How to prepare for system design interviews?',
  'Create a 7-day revision plan for React',
  'Help me understand Big O notation',
  'Difference between SQL and NoSQL databases',
  'Best approach for learning DSA from scratch',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "👋 Hi! I'm your AI Learning Mentor powered by **Gemini 2.5 Flash**.\n\nI know which courses you're enrolled in and can tailor my answers to your current learning context. I can help with:\n\n• **Doubt Solving** — Ask any technical question\n• **Study Plans** — Personalized revision schedules\n• **Interview Prep** — DSA, system design, behavioural rounds\n• **Code Review** — Paste your code and I'll explain it\n• **Concept Deep-Dives** — Any topic, any depth\n\nWhat would you like to explore today?",
  timestamp: new Date().toISOString(),
};

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function MarkdownMessage({ content }: { content: string }) {
  if (!content) return <TypingIndicator />;

  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div key={i} className="my-4 rounded-xl overflow-hidden border border-on-surface-variant/20 shadow-sm bg-inverse-surface">
          {lang && (
            <div className="flex justify-between items-center px-4 py-2 border-b border-on-surface-variant/40 bg-inverse-surface text-inverse-on-surface">
              <span className="font-label-sm text-label-sm">{lang}</span>
              <button onClick={() => navigator.clipboard.writeText(codeLines.join('\n'))} className="text-surface-variant hover:text-white transition-colors flex items-center gap-1 font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px]">content_copy</span> Copy
              </button>
            </div>
          )}
          <div className="p-4 overflow-x-auto">
            <pre className="font-label-md text-label-md text-inverse-on-surface whitespace-pre" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {codeLines.join('\n')}
            </pre>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      nodes.push(
        <p key={i} className="font-headline-sm text-headline-sm font-semibold text-text-primary mt-4 mb-2">
          {renderInline(headingMatch[2])}
        </p>
      );
      i++; continue;
    }

    // Bullet list item
    if (line.match(/^[-*•]\s+/) || line.startsWith('• ')) {
      const text = line.replace(/^[-*•]\s+/, '').replace(/^•\s+/, '');
      nodes.push(
        <div key={i} className="flex items-start gap-2 leading-relaxed font-body-md text-body-md text-text-primary">
          <span className="text-primary mt-1 shrink-0 text-[10px]">●</span>
          <span>{renderInline(text)}</span>
        </div>
      );
      i++; continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 leading-relaxed font-body-md text-body-md text-text-primary">
          <span className="text-primary shrink-0 font-bold min-w-[1.2rem]">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      i++; continue;
    }

    // Blank line
    if (!line.trim()) {
      nodes.push(<div key={i} className="h-4" />);
      i++; continue;
    }

    // Default paragraph
    nodes.push(
      <p key={i} className="leading-relaxed font-body-md text-body-md text-text-primary">{renderInline(line)}</p>
    );
    i++;
  }

  return <div className="space-y-1">{nodes}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-text-primary">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-surface-container-low text-[13px] font-label-md text-secondary border border-border-base" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

interface EnrolledCourseInfo {
  id: string;
  title: string;
  category: string;
  progress_percent: number;
}

export default function AIMentorPage() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseInfo[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_course_enrollments')
      .select('course_id, progress_percent, courses!user_course_enrollments_course_id_fkey(id, title, category)')
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) {
          const mapped: EnrolledCourseInfo[] = data
            .filter(r => r.courses)
            .map(r => {
              const c = Array.isArray(r.courses) ? r.courses[0] : r.courses as { id: string; title: string; category: string };
              return { id: c.id, title: c.title, category: c.category, progress_percent: r.progress_percent };
            });
          setEnrolledCourses(mapped);
        }
        setLoadingCourses(false);
      });
  }, [user]);

  const buildSystemPrompt = useCallback(() => {
    const userName = profile?.full_name ?? 'the student';
    const skillLevel = enrolledCourses.length === 0
      ? 'beginner'
      : enrolledCourses.some(c => c.progress_percent > 70)
        ? 'intermediate-to-advanced'
        : 'beginner-to-intermediate';

    const courseContext = enrolledCourses.length > 0
      ? enrolledCourses
          .map(c => `  • ${c.title} (${c.category}) — ${c.progress_percent}% complete`)
          .join('\n')
      : '  (No courses enrolled yet)';

    const inProgressCourse = enrolledCourses.find(c => c.progress_percent > 0 && c.progress_percent < 100);

    return `You are Loomie, the AI Learning Mentor on the LearnLoom platform.

STUDENT PROFILE:
- Name: ${userName}
- Skill level: ${skillLevel}
- Currently enrolled courses:
${courseContext}
${inProgressCourse ? `- Currently working on: "${inProgressCourse.title}" (${inProgressCourse.progress_percent}% done)` : ''}

YOUR ROLE:
- Answer technical questions clearly with examples and code snippets when helpful.
- Create personalized study plans tailored to the student's enrolled courses and skill level.
- Help with interview preparation (DSA, system design, behavioural).
- When the student asks about a topic covered in one of their enrolled courses, reference that course specifically.
- Format responses with markdown: **bold** for key terms, bullet points, numbered lists, and fenced code blocks (with language tag).
- Use inline code for function names, variables, and short snippets.
- Keep responses focused and concise — avoid unnecessary preamble.
- Be encouraging and mentor-like. This platform targets Indian college students (18–24) preparing for placements.`;
  }, [profile, enrolledCourses]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setStreaming(true);

    const historyBase = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    const recentHistory = historyBase.slice(-MAX_HISTORY);

    const contents = [
      { role: 'user', parts: [{ text: buildSystemPrompt() }] },
      { role: 'model', parts: [{ text: `Understood. I'm Loomie, the AI Mentor. I have the student's context loaded and am ready to help.` }] },
      ...recentHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];

    abortRef.current = new AbortController();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ contents }),
          signal: abortRef.current.signal,
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const parser = createParser({
        onEvent(event) {
          if (!event.data) return;
          try {
            const parsed = JSON.parse(event.data);
            const chunk: string =
              parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (chunk) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
                )
              );
            }
          } catch {
            // skip
          }
        },
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) parser.feed(line + '\n');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('AI Mentor error:', err);
      toast.error('AI Mentor unavailable', { description: 'Please try again in a moment.' });
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setStreaming(false);
    }
  };

  const handleStop = () => { abortRef.current?.abort(); setStreaming(false); };
  const handleReset = () => { setMessages([WELCOME_MESSAGE]); setInput(''); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <AppLayout title="AI Mentor" noPadding>
      <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden w-full font-body-md text-text-primary bg-background">
        
        {/* Left Sidebar: Recent Chats (Hidden on smaller screens) */}
        <aside className="w-64 bg-surface border-r border-border-base shrink-0 hidden lg:flex flex-col overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-4 border-b border-border-base/50">
            <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 bg-surface border border-border-base rounded-lg py-2 hover:-translate-y-[1px] hover:shadow-md transition-all text-primary font-label-md text-label-md group">
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">add</span>
              New Chat
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="font-label-sm text-label-sm text-text-secondary mb-2 uppercase tracking-wider">Recent</h3>
            <ul className="space-y-1 mb-4">
              <li>
                <button className="w-full text-left px-3 py-2 rounded-md bg-surface-container-low text-primary font-label-md text-label-md truncate border border-primary-fixed">
                  Current Session
                </button>
              </li>
            </ul>
          </div>
          
          {/* User Mini Profile */}
          <div className="p-4 border-t border-border-base/50 mt-auto flex items-center gap-3 hover:bg-surface-container-lowest cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container font-label-md overflow-hidden border border-border-base/50">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" /> : (profile?.full_name?.substring(0, 2).toUpperCase() || 'U')}
            </div>
            <div className="flex-1 truncate">
              <div className="font-label-md text-label-md text-text-primary truncate">{profile?.full_name || 'User'}</div>
              <div className="font-label-sm text-label-sm text-text-secondary truncate">Pro Plan</div>
            </div>
            <span className="material-symbols-outlined text-outline">settings</span>
          </div>
        </aside>

        {/* Center: Chat Canvas */}
        <section className="flex-1 flex flex-col relative bg-surface-container-lowest overflow-hidden">
          {/* Background Decorative Element for depth */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-secondary-container to-tertiary-container blur-[100px] mix-blend-multiply"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-surface-tint to-primary-container blur-[80px] mix-blend-multiply"></div>
          </div>
          
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-8 max-w-container-max mx-auto w-full z-10 scroll-smooth pb-32">
            
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${streaming ? 'bg-primary animate-pulse' : 'bg-primary/50'}`} />
                <span className="text-xs text-text-secondary font-label-sm">
                  {streaming ? 'Loomie is generating response...' : 'Loomie is online'}
                </span>
              </div>
              {streaming && (
                <button onClick={handleStop} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-error/40 text-error hover:bg-error/10 font-label-sm text-label-sm transition-colors">
                  <span className="material-symbols-outlined text-[14px]">stop_circle</span> Stop
                </button>
              )}
            </div>

            {messages.map(msg => (
              <div key={msg.id} className={`flex w-full gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-primary to-tertiary flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  </div>
                )}
                
                <div className={`max-w-[85%] relative group ${
                  msg.role === 'user' 
                    ? 'bg-surface border border-border-base rounded-2xl rounded-tr-sm p-4 shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05)]' 
                    : 'glass-panel rounded-2xl rounded-tl-sm p-6 prose'
                }`}>
                  
                  {msg.role === 'assistant' && (
                    <div className="absolute -top-3 left-4 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full border border-secondary shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                      AI Generated
                    </div>
                  )}

                  <div className={`font-body-md text-body-md ${msg.role === 'user' ? 'text-text-primary whitespace-pre-wrap' : 'text-text-primary mt-2'}`}>
                    {msg.role === 'assistant' ? <MarkdownMessage content={msg.content} /> : msg.content}
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-text-secondary hover:text-success transition-colors"><span className="material-symbols-outlined text-[20px]">thumb_up</span></button>
                      <button className="text-text-secondary hover:text-error transition-colors"><span className="material-symbols-outlined text-[20px]">thumb_down</span></button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center shrink-0 border border-border-base mt-1 overflow-hidden">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[20px] text-text-primary">person</span>}
                  </div>
                )}
              </div>
            ))}
            
            {/* Suggested Prompts Chips */}
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-2 justify-center mt-4 mb-8">
                {SUGGESTED_PROMPTS.slice(0, 3).map(p => (
                  <button key={p} onClick={() => sendMessage(p)} disabled={streaming}
                    className="bg-surface border border-outline-variant rounded-full px-4 py-2 font-label-md text-label-md text-text-primary hover:border-primary hover:text-primary transition-colors shadow-sm disabled:opacity-50">
                    {p}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border-base/50 bg-surface/80 backdrop-blur-md z-20 absolute bottom-0 left-0 right-0">
            <div className="max-w-3xl mx-auto relative rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-surface border-2 border-transparent" style={{ backgroundClip: 'padding-box' }}>
              <div className="absolute top-[-2px] right-[-2px] bottom-[-2px] left-[-2px] -z-10 rounded-xl bg-gradient-to-r from-primary via-secondary to-tertiary"></div>
              <div className="flex flex-col rounded-xl overflow-hidden bg-surface">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1 border-b border-transparent">
                  <button className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-surface-container-low transition-colors" title="Upload File">
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>
                  <button className="p-1.5 text-text-secondary hover:text-tertiary rounded-md hover:bg-surface-container-low transition-colors" title="Voice Input">
                    <span className="material-symbols-outlined">mic</span>
                  </button>
                  <div className="ml-auto flex items-center gap-2 px-2 py-1 bg-surface-container-low rounded-md border border-primary-fixed-dim">
                    <span className="material-symbols-outlined text-[16px] text-primary">model_training</span>
                    <span className="font-label-sm text-label-sm text-primary">Gemini 2.5 Flash</span>
                  </div>
                </div>
                {/* Textarea */}
                <textarea 
                  ref={textareaRef}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none font-body-md text-body-md p-4 text-text-primary placeholder:text-text-secondary max-h-[200px]" 
                  placeholder="Message LearnLoom AI..." 
                  rows={2}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  disabled={streaming}
                />
                {/* Send Action */}
                <div className="flex justify-end p-3 pt-1">
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || streaming} className="bg-primary text-on-primary rounded-lg p-2 hover:bg-primary-container hover:shadow-md transition-all flex items-center justify-center h-10 w-10 disabled:opacity-50">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center mt-2 font-label-sm text-label-sm text-text-secondary">
                LearnLoom AI can make mistakes. Verify important information.
            </div>
          </div>
        </section>

        {/* Right Sidebar: Learning Context / Study Plan */}
        <aside className="w-80 bg-surface border-l border-border-base shrink-0 hidden xl:flex flex-col overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.02)] relative z-20">
          <div className="p-4 border-b border-border-base/50 sticky top-0 bg-surface/90 backdrop-blur flex justify-between items-center z-10">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary">Study Context</h3>
            <span className="material-symbols-outlined text-outline cursor-pointer hover:text-primary">menu_book</span>
          </div>
          
          <div className="p-4 space-y-8">
            {/* Current Context */}
            {enrolledCourses.length > 0 && (
              <div>
                {loadingCourses
                  ? [1].map(n => <Skeleton key={n} className="h-24 w-full bg-surface-variant rounded-xl" />)
                  : enrolledCourses.slice(0, 1).map(c => (
                      <div key={c.id} className="bg-surface border border-border-base rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase">Current Module</span>
                          <span className="material-symbols-outlined text-text-secondary text-[18px]">more_horiz</span>
                        </div>
                        <h4 className="font-headline-md text-[18px] leading-tight text-text-primary mb-2 line-clamp-2">{c.title}</h4>
                        <div className="w-full bg-surface-container h-2 rounded-full mt-4 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${c.progress_percent}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="font-label-sm text-label-sm text-text-secondary">{c.progress_percent}% Completed</span>
                          <span className="font-label-sm text-label-sm text-primary font-medium hover:underline cursor-pointer">Resume</span>
                        </div>
                      </div>
                    ))
                }
              </div>
            )}

            {/* Reference Materials Bento */}
            <div>
              <h4 className="font-label-md text-label-md text-text-primary font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[18px]">bookmark</span>
                Reference Materials
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-container-low border border-primary-fixed-dim rounded-lg p-3 hover:bg-surface-container cursor-pointer transition-colors flex flex-col items-center text-center gap-1">
                  <span className="material-symbols-outlined text-primary">description</span>
                  <span className="font-label-sm text-label-sm text-on-surface">Docs</span>
                </div>
                <div className="bg-surface-container-low border border-primary-fixed-dim rounded-lg p-3 hover:bg-surface-container cursor-pointer transition-colors flex flex-col items-center text-center gap-1">
                  <span className="material-symbols-outlined text-primary">code_blocks</span>
                  <span className="font-label-sm text-label-sm text-on-surface">Sandbox</span>
                </div>
                <div className="col-span-2 bg-tertiary-fixed border border-tertiary-fixed-dim rounded-lg p-3 hover:bg-tertiary-fixed-dim cursor-pointer transition-colors flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-tertiary-fixed-variant" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  <span className="font-label-md text-label-md text-on-tertiary-fixed flex-1">Video: Deep Dive</span>
                </div>
              </div>
            </div>

            {/* AI Study Goals */}
            <div>
              <h4 className="font-label-md text-label-md text-text-primary font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">flag</span>
                Session Goals
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 bg-surface p-2 rounded-md border border-border-base border-l-2 border-l-primary shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">radio_button_unchecked</span>
                  <span className="font-body-sm text-body-sm text-text-primary">Master current concepts</span>
                </li>
                <li className="flex items-start gap-2 bg-surface p-2 rounded-md border border-border-base opacity-70">
                  <span className="material-symbols-outlined text-[16px] text-text-secondary mt-0.5">lock</span>
                  <span className="font-body-sm text-body-sm text-text-secondary">Complete practice quiz</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>

      </div>
    </AppLayout>
  );
}
