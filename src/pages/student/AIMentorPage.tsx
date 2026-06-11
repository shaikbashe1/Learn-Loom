import { useState, useRef, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain, Send, Sparkles, BookOpen, Code2, Target, RefreshCw,
  GraduationCap, ChevronRight,
} from 'lucide-react';
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
// Handles: **bold**, `inline code`, ```code blocks```, bullet/numbered lists,
// blank lines as spacers, and plain text.

function MarkdownMessage({ content }: { content: string }) {
  if (!content) return <TypingIndicator />;

  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ──
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div key={i} className="my-2 rounded-lg overflow-hidden border border-border bg-[hsl(var(--background))]">
          {lang && (
            <div className="px-3 py-1 text-[10px] font-mono text-muted-foreground bg-muted border-b border-border">
              {lang}
            </div>
          )}
          <pre className="p-3 text-xs font-mono leading-relaxed overflow-x-auto text-foreground whitespace-pre">
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // ── Heading (### or ##) ──
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      nodes.push(
        <p key={i} className="font-semibold text-foreground mt-3 mb-1 text-sm">
          {renderInline(headingMatch[2])}
        </p>
      );
      i++; continue;
    }

    // ── Bullet list item ──
    if (line.match(/^[-*•]\s+/) || line.startsWith('• ')) {
      const text = line.replace(/^[-*•]\s+/, '').replace(/^•\s+/, '');
      nodes.push(
        <div key={i} className="flex items-start gap-2 text-sm leading-relaxed pl-1">
          <span className="text-primary mt-[3px] shrink-0 text-xs">•</span>
          <span>{renderInline(text)}</span>
        </div>
      );
      i++; continue;
    }

    // ── Numbered list ──
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 text-sm leading-relaxed pl-1">
          <span className="text-primary shrink-0 font-medium min-w-[1rem]">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      i++; continue;
    }

    // ── Blank line spacer ──
    if (!line.trim()) {
      nodes.push(<div key={i} className="h-2" />);
      i++; continue;
    }

    // ── Default paragraph ──
    nodes.push(
      <p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>
    );
    i++;
  }

  return <div className="space-y-0.5">{nodes}</div>;
}

/** Renders inline markdown: **bold**, `code`, plain text */
function renderInline(text: string): React.ReactNode {
  // Split on **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-muted text-[11px] font-mono text-foreground border border-border">
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

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load enrolled courses for context injection
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

  // Build dynamic system prompt with full user context
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

    return `You are LearnLoom AI Mentor — an expert computer science and software engineering tutor on the LearnLoom platform.

STUDENT PROFILE:
- Name: ${userName}
- Skill level: ${skillLevel}
- Currently enrolled courses:
${courseContext}
${inProgressCourse ? `- Currently working on: "${inProgressCourse.title}" (${inProgressCourse.progress_percent}% done)` : ''}

YOUR ROLE:
- Answer technical questions clearly with examples and code snippets when helpful
- Create personalized study plans tailored to the student's enrolled courses and skill level
- Help with interview preparation (DSA, system design, behavioural)
- When the student asks about a topic covered in one of their enrolled courses, reference that course specifically
- Format responses with markdown: **bold** for key terms, bullet points, numbered lists, and fenced code blocks (with language tag)
- Use inline code for function names, variables, and short snippets
- Keep responses focused and concise — avoid unnecessary preamble
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

    // Cap history at last MAX_HISTORY turns (excluding welcome msg)
    const historyBase = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    const recentHistory = historyBase.slice(-MAX_HISTORY);

    // Build Gemini contents array: system prompt framed as user/model exchange,
    // followed by the capped conversation history
    const contents = [
      { role: 'user', parts: [{ text: buildSystemPrompt() }] },
      { role: 'model', parts: [{ text: `Understood. I'm LearnLoom AI Mentor. I have the student's context loaded and am ready to help.` }] },
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
            // incomplete JSON chunk — skip silently
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

  return (
    <AppLayout title="AI Mentor">
      <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-3">

        {/* ── Header ── */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-balance">AI Learning Mentor</h2>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${streaming ? 'bg-chart-4 animate-pulse' : 'bg-chart-3'}`} />
                <span className="text-xs text-muted-foreground">
                  {streaming ? 'Generating response…' : 'Online · Gemini 2.5 Flash · Context-aware'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {streaming && (
              <Button onClick={handleStop} variant="ghost" size="sm"
                className="border border-destructive/40 text-destructive hover:bg-destructive/10">
                Stop
              </Button>
            )}
            <Button onClick={handleReset} variant="ghost" size="sm"
              className="border border-border text-foreground hover:bg-accent">
              <RefreshCw className="w-4 h-4 mr-1.5" /> New Chat
            </Button>
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">

          {/* ── Chat area ── */}
          <div className="flex-1 min-w-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                    <AvatarFallback className={`text-xs font-bold ${msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-chart-2/20 text-chart-2'}`}>
                      {msg.role === 'assistant' ? <Brain className="w-4 h-4" /> : 'ME'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[82%] rounded-xl px-3 py-2.5 ${msg.role === 'assistant' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'}`}>
                    {msg.role === 'assistant'
                      ? <MarkdownMessage content={msg.content} />
                      : <p className="text-sm leading-relaxed">{msg.content}</p>
                    }
                    <p className={`text-[10px] mt-1.5 ${msg.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Suggested prompts — show only before first user message */}
            {messages.length === 1 && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.slice(0, 4).map(p => (
                  <button key={p} onClick={() => sendMessage(p)}
                    className="text-xs text-primary bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors text-left">
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask anything — doubts, concepts, interview prep… (Shift+Enter for new line)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="flex-1 bg-input border-border text-foreground resize-none min-h-[40px] max-h-[120px] text-sm py-2"
                  disabled={streaming}
                />
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || streaming}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 h-10 px-3 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                Context-aware · last {MAX_HISTORY} messages sent · Enter to send · Shift+Enter for newline
              </p>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="hidden lg:flex flex-col w-56 shrink-0 gap-4">

            {/* Enrolled courses */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> My Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {loadingCourses
                  ? [1, 2, 3].map(n => <Skeleton key={n} className="h-8 w-full bg-muted rounded-lg" />)
                  : enrolledCourses.length === 0
                    ? <p className="text-xs text-muted-foreground">No enrolled courses yet.</p>
                    : enrolledCourses.map(c => (
                        <button key={c.id}
                          onClick={() => sendMessage(`I'm currently studying "${c.title}". Can you help me with a key concept from this course?`)}
                          disabled={streaming}
                          className="w-full text-left p-2 rounded-lg bg-muted/50 hover:bg-primary/10 transition-all group disabled:opacity-50">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs text-foreground font-medium leading-snug line-clamp-1 flex-1">{c.title}</p>
                            <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress_percent}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{c.progress_percent}% complete</p>
                        </button>
                      ))
                }
              </CardContent>
            </Card>

            {/* Quick prompts */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Prompts</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button key={prompt} onClick={() => sendMessage(prompt)} disabled={streaming}
                    className="w-full text-left text-xs text-foreground p-2 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-50">
                    {prompt}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Capabilities */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">I Can Help With</p>
                {[
                  { icon: BookOpen, label: 'Concept Doubts', color: 'text-primary' },
                  { icon: Target, label: 'Study Plans', color: 'text-chart-2' },
                  { icon: Code2, label: 'Coding Help', color: 'text-chart-3' },
                  { icon: Sparkles, label: 'Interview Prep', color: 'text-chart-4' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    {item.label}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Context badge */}
            {enrolledCourses.length > 0 && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-[11px] text-primary font-medium mb-1">✦ Context active</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Your {enrolledCourses.length} enrolled courses are injected into every message so answers are personalised to your learning.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile quick prompts ── */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 shrink-0">
          {SUGGESTED_PROMPTS.slice(0, 4).map(p => (
            <button key={p} onClick={() => sendMessage(p)} disabled={streaming}
              className="shrink-0 text-xs text-primary bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/20 whitespace-nowrap disabled:opacity-50">
              {p}
            </button>
          ))}
        </div>

        {/* Context pills (mobile) */}
        {enrolledCourses.length > 0 && (
          <div className="lg:hidden flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground shrink-0">Context:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {enrolledCourses.slice(0, 3).map(c => (
                <Badge key={c.id} variant="secondary" className="text-[10px] shrink-0 whitespace-nowrap">
                  {c.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
