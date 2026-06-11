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
        <div key={i} className="my-4 rounded-xl bg-[#0d0d0f] border border-outline-variant/40 overflow-hidden shadow-sm">
          {lang && (
            <div className="flex justify-between items-center px-4 py-2 bg-surface-container border-b border-outline-variant/40">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{lang}</span>
              <button onClick={() => navigator.clipboard.writeText(codeLines.join('\n'))} className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span className="font-label-sm text-label-sm">Copy</span>
              </button>
            </div>
          )}
          <div className="p-4 overflow-x-auto">
            <pre className="font-label-md text-label-md leading-relaxed text-on-surface/80 whitespace-pre">
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
        <p key={i} className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-4 mb-2">
          {renderInline(headingMatch[2])}
        </p>
      );
      i++; continue;
    }

    // Bullet list item
    if (line.match(/^[-*•]\s+/) || line.startsWith('• ')) {
      const text = line.replace(/^[-*•]\s+/, '').replace(/^•\s+/, '');
      nodes.push(
        <div key={i} className="flex items-start gap-2 leading-relaxed font-body-md text-body-md text-on-surface/90">
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
        <div key={i} className="flex items-start gap-2 leading-relaxed font-body-md text-body-md text-on-surface/90">
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
      <p key={i} className="leading-relaxed font-body-md text-body-md text-on-surface/90">{renderInline(line)}</p>
    );
    i++;
  }

  return <div className="space-y-1">{nodes}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-on-surface">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-surface-container-high text-[13px] font-label-md text-secondary border border-outline-variant/40">
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  };

  return (
    <AppLayout title="AI Mentor">
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden w-full relative">
        
        {/* Messages Canvas */}
        <div className="flex-1 overflow-y-auto px-md md:px-xl py-xl space-y-8 scroll-smooth pb-48 relative">
          
          <div className="flex items-center justify-between max-w-3xl mx-auto mb-8">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${streaming ? 'bg-primary animate-pulse' : 'bg-primary/50'}`} />
              <span className="text-xs text-on-surface-variant font-label-sm">
                {streaming ? 'Loomie is generating response...' : 'Loomie is online'}
              </span>
            </div>
            <div className="flex gap-2">
              {streaming && (
                <button onClick={handleStop} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-error/40 text-error hover:bg-error/10 font-label-sm text-label-sm transition-colors">
                  <span className="material-symbols-outlined text-[14px]">stop_circle</span> Stop
                </button>
              )}
              <button onClick={handleReset} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/60 text-on-surface hover:bg-surface-variant/50 font-label-sm text-label-sm transition-colors">
                <span className="material-symbols-outlined text-[14px]">refresh</span> New Chat
              </button>
            </div>
          </div>

          {messages.map(msg => (
            <div key={msg.id} className="max-w-3xl mx-auto flex gap-4">
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 mt-1">
                  <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-surface-variant flex items-center justify-center shrink-0 border border-outline-variant/60 mt-1 overflow-hidden">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[18px] text-on-surface">person</span>}
                </div>
              )}
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">{msg.role === 'assistant' ? 'Loomie' : 'You'}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="font-body-md text-body-md text-on-surface/90 leading-relaxed">
                  {msg.role === 'assistant' ? <MarkdownMessage content={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Area (Fixed at bottom of Center column) */}
        <div className="absolute bottom-0 left-0 md:right-[320px] lg:right-[320px] right-0 p-4 md:p-md bg-gradient-to-t from-background via-background/90 to-transparent pt-12">
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* Quick Actions / Suggestions */}
            {messages.length <= 2 && (
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {SUGGESTED_PROMPTS.slice(0, 4).map(p => (
                  <button key={p} onClick={() => sendMessage(p)} disabled={streaming}
                    className="whitespace-nowrap px-4 py-1.5 rounded-full border border-outline-variant/60 bg-surface-container/50 text-on-surface-variant font-label-sm text-label-sm hover:border-primary/50 hover:text-primary transition-colors hover:bg-primary/5 disabled:opacity-50">
                    {p}
                  </button>
                ))}
              </div>
            )}
            
            {/* Chat Input Box */}
            <div className="relative bg-surface-container-low border border-outline-variant/60 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all flex flex-col">
              <textarea 
                ref={textareaRef}
                className="w-full bg-transparent border-none resize-none py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 max-h-32 min-h-[52px]" 
                placeholder="Message Loomie or share code... (Shift+Enter for new line)" 
                rows={1} 
                style={{ scrollbarWidth: 'thin' }}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                disabled={streaming}
              />
              <div className="flex justify-between items-center px-3 py-2 border-t border-outline-variant/20">
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors disabled:opacity-50" title="Attach file or code" disabled={streaming}>
                    <span className="material-symbols-outlined text-[20px]">attach_file</span>
                  </button>
                  <button className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors disabled:opacity-50" title="Add code snippet" disabled={streaming}>
                    <span className="material-symbols-outlined text-[20px]">data_object</span>
                  </button>
                </div>
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || streaming} className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary hover:brightness-110 transition-all shadow-sm disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
                </button>
              </div>
            </div>
            
            <div className="text-center hidden sm:block">
              <span className="font-label-sm text-label-sm text-on-surface-variant/50">Loomie can make mistakes. Verify critical code.</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Context & Resources */}
        <aside className="w-80 border-l border-outline-variant/60 bg-surface-container-lowest overflow-y-auto p-md hidden lg:block shrink-0 space-y-xl z-10 h-full pb-24">
          {/* Current Context */}
          {enrolledCourses.length > 0 && (
            <div className="space-y-sm">
              <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Current Context</h3>
              <div className="space-y-2">
                {loadingCourses
                  ? [1, 2].map(n => <Skeleton key={n} className="h-20 w-full bg-surface-variant rounded-xl" />)
                  : enrolledCourses.slice(0, 3).map(c => (
                      <div key={c.id} onClick={() => sendMessage(`I'm currently studying "${c.title}". Can you help me with a key concept from this course?`)} className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-colors group cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded bg-secondary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-secondary">terminal</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors truncate">{c.title}</h4>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 truncate">{c.category}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-surface-variant rounded-full overflow-hidden">
                            <div className="h-full bg-secondary rounded-full" style={{ width: `${c.progress_percent}%` }}></div>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{c.progress_percent}%</span>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          )}

          {/* Mentor Capabilities */}
          <div className="space-y-sm">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Loomie Capabilities</h3>
            <div className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-low/50 space-y-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Analyze & refactor specific code blocks</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Explain complex architectural concepts</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Generate tailored practice exercises</span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </AppLayout>
  );
}
