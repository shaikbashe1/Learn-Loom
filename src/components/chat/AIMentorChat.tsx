import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { createParser } from 'eventsource-parser';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAIRateLimit } from '@/hooks/useAIRateLimit';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { ChatMessage, DBMentorConversation, DBMentorMessage } from '@/types/types';

const MAX_HISTORY = 20;

const SUGGESTED_PROMPTS = [
  'Analyze my current course progress',
  'What are my weakest skills based on quizzes?',
  'Create a personalized project idea for me',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm Loomie, your AI Learning Mentor.\n\nI automatically analyze your course progress, quiz scores, and assignments to provide personalized recommendations.\n\nHow can I help you accelerate your learning today?",
  timestamp: new Date().toISOString(),
};

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

function MarkdownMessage({ content }: { content: string }) {
  if (!content) return <TypingIndicator />;

  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

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

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      nodes.push(
        <p key={i} className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-4 mb-2">
          {renderInline(headingMatch[2])}
        </p>
      );
      i++; continue;
    }

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

    if (!line.trim()) {
      nodes.push(<div key={i} className="h-4" />);
      i++; continue;
    }

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

interface EnrolledCourseInfo {
  id: string;
  title: string;
  category: string;
  progress_percent: number;
}

interface AIMentorChatProps {
  externalPrompt?: string;
  onExternalPromptHandled?: () => void;
  isWidget?: boolean;
}

export function AIMentorChat({ externalPrompt, onExternalPromptHandled, isWidget = false }: AIMentorChatProps) {
  const { user, profile } = useAuth();
  const rateLimit = useAIRateLimit('ai-mentor');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load mentor chat draft from localStorage when user is ready
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`mentor_chat_draft_${user.id}`);
      if (saved) {
        setInput(saved);
      }
    }
  }, [user?.id]);

  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseInfo[]>([]);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (externalPrompt && !streaming && activeConversationId) {
      sendMessage(externalPrompt);
      if (onExternalPromptHandled) onExternalPromptHandled();
    }
  }, [externalPrompt, activeConversationId]);

  // Bootstrapping the context and conversation history
  useEffect(() => {
    if (!user) return;
    
    const loadState = async () => {
      setLoadingHistory(true);
      try {
        // 1. Fetch user analytics/context
        const { data: courses } = await supabase
          .from('user_course_enrollments')
          .select('course_id, progress_percent, courses!user_course_enrollments_course_id_fkey(id, title, category)')
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false });
          
        if (courses) {
          setEnrolledCourses(
            courses.filter(r => r.courses).map(r => {
              const c = (Array.isArray(r.courses) ? r.courses[0] : r.courses) as { id: string; title: string; category: string } | null;
              return c ? { id: c.id, title: c.title, category: c.category, progress_percent: r.progress_percent } : null;
            }).filter(Boolean) as { id: string; title: string; category: string; progress_percent: number }[]
          );
        }

        // 2. Fetch or create latest active conversation
        const { data: existingConvos, error: convoErr } = await supabase
          .from('mentor_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        let convoId = '';
        if (existingConvos && existingConvos.length > 0) {
          convoId = existingConvos[0].id;
          setActiveConversationId(convoId);
          
          // 3. Load historical messages for this session
          const { data: historicalMsgs } = await supabase
            .from('mentor_messages')
            .select('*')
            .eq('conversation_id', convoId)
            .order('created_at', { ascending: true });

          if (historicalMsgs && historicalMsgs.length > 0) {
            const parsedHistory: ChatMessage[] = historicalMsgs.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.created_at
            }));
            setMessages([WELCOME_MESSAGE, ...parsedHistory]);
          }
        } else {
          // Create new conversation
          const { data: newConvo, error: insertErr } = await supabase
            .from('mentor_conversations')
            .insert({
              user_id: user.id,
              title: 'Learning Session',
              context_snapshot: { timestamp: new Date().toISOString() }
            })
            .select()
            .single();
            
          if (newConvo) {
            setActiveConversationId(newConvo.id);
          }
        }
      } catch (err) {
        console.error("Failed to bootstrap AI Mentor:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadState();
  }, [user]);

  const buildSystemPrompt = useCallback(() => {
    const userName = profile?.full_name ?? 'the student';
    const courseContext = enrolledCourses.length > 0
      ? enrolledCourses.map(c => `  • ${c.title} (${c.category}) — ${c.progress_percent}% complete`).join('\n')
      : '  (No courses enrolled yet)';

    return `You are Loomie, the AI Learning Mentor on the Quovexi platform.
STUDENT PROFILE:
- Name: ${userName}
- Currently enrolled courses:
${courseContext}

YOUR ROLE:
- You act as a personalized AI mentor analyzing the student's progress and goals.
- Answer technical questions clearly with examples and code snippets when helpful.
- Suggest projects based on the courses they are taking.
- Create personalized study plans to tackle weak areas.
- Help with interview preparation and coding doubts.
- Format responses with markdown: **bold** for key terms, bullet points, numbered lists, and fenced code blocks.
- Keep responses focused, encouraging, and highly contextual to their Quovexi progress.`;
  }, [profile, enrolledCourses]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming || !activeConversationId || !user) return;

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
    if (user?.id) {
      localStorage.removeItem(`mentor_chat_draft_${user.id}`);
    }
    setStreaming(true);

    // Persist user message to Supabase
    await supabase.from('mentor_messages').insert({
      conversation_id: activeConversationId,
      role: 'user',
      content: userMsg.content
    });

    const historyBase = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    const recentHistory = historyBase.slice(-MAX_HISTORY);

    const contents = [
      { role: 'user', parts: [{ text: buildSystemPrompt() }] },
      { role: 'model', parts: [{ text: `Understood. I'm Loomie, the AI Mentor.` }] },
      ...recentHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];

    abortRef.current = new AbortController();
    let fullResponseText = '';

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      // Route all AI requests through the authenticated backend
      const res = await fetch('/api/ai-mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contents }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        // Handle rate limit specifically
        if (res.status === 429) {
          let rateLimitData;
          try { rateLimitData = await res.json(); } catch { rateLimitData = null; }
          setRateLimitHit(true);
          rateLimit.refetch();
          const resetTime = rateLimitData?.resetAt
            ? new Date(rateLimitData.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'midnight';
          toast.error('Daily limit reached', {
            description: rateLimitData?.planId === 'free'
              ? `You've used all ${rateLimitData?.limit ?? 5} messages today. Resets at ${resetTime}. Upgrade to Pro for 100 messages/day!`
              : `Limit reached. Resets at ${resetTime}.`,
            duration: 8000,
          });
          setMessages(prev => prev.filter(m => m.id !== aiMsgId));
          return;
        }

        let errText = await res.text();
        try {
          const parsedErr = JSON.parse(errText);
          errText = parsedErr.error?.message || parsedErr.error || errText;
        } catch {}
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
            const chunk: string = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (chunk) {
              fullResponseText += chunk;
              setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + chunk } : m));
            }
          } catch { }
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

      // Final persistence step: save the generated AI response to Supabase
      if (fullResponseText.trim().length > 0) {
        await supabase.from('mentor_messages').insert({
          conversation_id: activeConversationId,
          role: 'assistant',
          content: fullResponseText
        });
      }

      // Update rate limit counter optimistically
      rateLimit.incrementUsed();

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('AI Mentor Error:', err);
      toast.error('AI Mentor unavailable', { 
        description: err.message || 'Please try again in a moment.' 
      });
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setStreaming(false);
    }
  };

  const handleStop = () => { abortRef.current?.abort(); setStreaming(false); };
  
  const handleReset = async () => { 
    if (!user) return;
    setMessages([WELCOME_MESSAGE]); 
    setInput(''); 
    if (user?.id) {
      localStorage.removeItem(`mentor_chat_draft_${user.id}`);
    }
    
    // Create new fresh conversation branch
    const { data: newConvo } = await supabase
      .from('mentor_conversations')
      .insert({
        user_id: user.id,
        title: 'New Learning Session',
        context_snapshot: { timestamp: new Date().toISOString() }
      })
      .select()
      .single();
      
    if (newConvo) {
      setActiveConversationId(newConvo.id);
      toast.success("Started a new session!");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (user?.id) {
      localStorage.setItem(`mentor_chat_draft_${user.id}`, val);
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  };

  if (loadingHistory) {
    return (
      <div className={`flex flex-col h-full w-full relative ${isWidget ? 'bg-surface' : ''} items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-primary animate-pulse">smart_toy</span>
          <p className="text-on-surface-variant font-label-sm">Initializing your learning context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full w-full relative ${isWidget ? 'bg-surface' : ''}`}>
      <div className={`flex-1 overflow-y-auto px-4 ${isWidget ? 'py-4 space-y-4' : 'py-8 space-y-8'} scroll-smooth pb-40 relative`}>
        {!isWidget && (
          <div className="flex items-center justify-between max-w-3xl mx-auto mb-8">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${streaming ? 'bg-primary animate-pulse' : 'bg-primary/50'}`} />
              <span className="text-xs text-on-surface-variant font-label-sm">
                {streaming ? 'Loomie is analyzing your progress...' : 'Loomie is monitoring your progress'}
              </span>
            </div>
            <div className="flex gap-2">
              {streaming && (
                <button onClick={handleStop} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-error/40 text-error hover:bg-error/10 font-label-sm text-label-sm transition-colors">
                  <span className="material-symbols-outlined text-[14px]">stop_circle</span> Stop
                </button>
              )}
              <button onClick={handleReset} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/60 text-on-surface hover:bg-surface-variant/50 font-label-sm text-label-sm transition-colors">
                <span className="material-symbols-outlined text-[14px]">add_comment</span> New Chat
              </button>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`mx-auto flex gap-3 md:gap-4 ${isWidget ? 'w-full' : 'max-w-3xl'}`}>
            {msg.role === 'assistant' ? (
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 mt-1 shadow-sm">
                <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-surface-variant flex items-center justify-center shrink-0 border border-outline-variant/60 mt-1 overflow-hidden shadow-sm">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[18px] text-on-surface">person</span>}
              </div>
            )}
            <div className="flex-1 space-y-1 md:space-y-2 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-label-md text-label-md font-bold text-on-surface">{msg.role === 'assistant' ? 'Loomie' : 'You'}</span>
              </div>
              <div className={`font-body-md ${isWidget ? 'text-sm' : 'text-body-md'} text-on-surface/90 leading-relaxed overflow-hidden`}>
                {msg.role === 'assistant' ? <MarkdownMessage content={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={`absolute bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-background via-background/90 to-transparent ${isWidget ? 'pt-8' : 'pt-12'} safe-bottom`}>
        <div className={`mx-auto space-y-3 ${isWidget ? 'w-full' : 'max-w-3xl'}`}>

          {/* Rate limit exceeded banner */}
          {rateLimitHit && rateLimit.remaining <= 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
              <span className="material-symbols-outlined text-destructive text-[18px]">block</span>
              <div className="flex-1">
                <p className="text-destructive font-semibold text-xs">Daily message limit reached</p>
                <p className="text-destructive/70 text-[11px] mt-0.5">
                  {rateLimit.planId === 'free'
                    ? 'Upgrade to Pro for 100 messages/day and unlock your full potential.'
                    : `Resets at ${rateLimit.resetAt ? new Date(rateLimit.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'midnight UTC'}.`
                  }
                </p>
              </div>
              {rateLimit.planId === 'free' && (
                <Link to="/pricing" className="shrink-0 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:brightness-110 transition-all shadow-sm">
                  Upgrade
                </Link>
              )}
            </div>
          )}

          {!isWidget && messages.length <= 2 && (
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {SUGGESTED_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)} disabled={streaming || rateLimit.remaining <= 0}
                  className="whitespace-nowrap px-4 py-1.5 rounded-full border border-outline-variant/60 bg-surface-container/50 text-on-surface-variant font-label-sm text-label-sm hover:border-primary/50 hover:text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 shadow-sm">
                  {p}
                </button>
              ))}
            </div>
          )}
          
          <div className="relative bg-surface-container-low border border-outline-variant/60 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all flex flex-col">
            <textarea 
              ref={textareaRef}
              className={`w-full bg-transparent border-none resize-none px-4 ${isWidget ? 'py-2 text-sm max-h-24' : 'py-3 font-body-md max-h-32'} text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 min-h-[52px]`}
              placeholder={rateLimit.remaining <= 0 ? 'Daily message limit reached — upgrade to continue' : 'Ask for a customized study plan, project ideas, or code explanations...'}
              rows={1} 
              style={{ scrollbarWidth: 'thin' }}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={streaming || rateLimit.remaining <= 0}
            />
            <div className="flex justify-between items-center px-2 py-2 border-t border-outline-variant/20 bg-surface/30">
              <div className="flex items-center gap-2">
                 {isWidget && streaming && (
                  <button onClick={handleStop} className="text-error text-xs ml-2 hover:underline min-h-[44px] px-2 flex items-center">Stop Generating</button>
                )}
                {/* Remaining messages counter */}
                {!rateLimit.loading && (
                  <span className={`text-[11px] font-semibold ml-2 ${
                    rateLimit.remaining <= 0 ? 'text-destructive' :
                    rateLimit.usagePercent >= 80 ? 'text-amber-500' :
                    'text-muted-foreground'
                  }`}>
                    {rateLimit.remaining}/{rateLimit.limit} messages left today
                  </span>
                )}
              </div>
              <button 
                onClick={() => sendMessage(input)} 
                disabled={!input.trim() || streaming || rateLimit.remaining <= 0} 
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary text-on-primary hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
                title="Send message"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
