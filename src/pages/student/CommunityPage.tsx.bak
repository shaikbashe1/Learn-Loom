import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { renderMarkdown } from '@/lib/markdown';

// ── Types ────────────────────────────────────────────────────────────────────

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  upvotes: number;
  reply_count: number;
  created_at: string;
  user_id: string;
  is_pinned?: boolean;
  profiles?: { full_name: string | null; avatar_url: string | null; bio: string | null };
  user_voted?: boolean;
}

interface ForumReply {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  upvotes: number;
  created_at: string;
  is_accepted?: boolean;
  is_ai?: boolean;
  profiles?: { full_name: string | null; avatar_url: string | null; bio: string | null };
  user_voted?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CAT_DETAILS: Record<string, { label: string; color: string; icon: string }> = {
  doubt:       { label: 'Doubt', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400', icon: 'help_outline' },
  general:     { label: 'General', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400', icon: 'forum' },
  challenge:   { label: 'Challenge', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400', icon: 'code' },
  'study-group': { label: 'Study Group', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400', icon: 'groups' },
};

function initials(name: string | null | undefined) {
  if (!name) return 'CM';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '[Code Block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^\s*-\s+/gm, '');
}

function insertFormat(
  textareaRef: HTMLTextAreaElement | null,
  textValue: string,
  setValue: (v: string) => void,
  before: string,
  after: string = ''
) {
  if (!textareaRef) {
    setValue(textValue + before + after);
    return;
  }
  const start = textareaRef.selectionStart;
  const end = textareaRef.selectionEnd;
  const selectedText = textValue.substring(start, end);
  const replacement = before + selectedText + after;
  setValue(
    textValue.substring(0, start) + replacement + textValue.substring(end)
  );
  
  setTimeout(() => {
    textareaRef.focus();
    textareaRef.setSelectionRange(
      start + before.length,
      start + before.length + selectedText.length
    );
  }, 0);
}

// ── Markdown Toolbar ─────────────────────────────────────────────────────────

interface MarkdownToolbarProps {
  textareaRef: HTMLTextAreaElement | null;
  textValue: string;
  setValue: (v: string) => void;
}

function MarkdownToolbar({ textareaRef, textValue, setValue }: MarkdownToolbarProps) {
  return (
    <div className="flex items-center gap-1 bg-surface-container border border-border-base rounded-t-lg p-1.5 shrink-0 flex-wrap">
      <button
        type="button"
        title="Bold"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '**', '**')}
        className="p-1.5 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[32px] min-w-[32px]"
      >
        <span className="material-symbols-outlined text-[18px] font-bold">format_bold</span>
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '*', '*')}
        className="p-1.5 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[32px] min-w-[32px]"
      >
        <span className="material-symbols-outlined text-[18px]">format_italic</span>
      </button>
      <button
        type="button"
        title="Link"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '[', '](url)')}
        className="p-1.5 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[32px] min-w-[32px]"
      >
        <span className="material-symbols-outlined text-[18px]">link</span>
      </button>
      <button
        type="button"
        title="Code Block"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '```javascript\n', '\n```')}
        className="p-1.5 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[32px] min-w-[32px]"
      >
        <span className="material-symbols-outlined text-[18px]">code</span>
      </button>
      <button
        type="button"
        title="List"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '- ')}
        className="p-1.5 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[32px] min-w-[32px]"
      >
        <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
      </button>
    </div>
  );
}

// ── PostCard (LinkedIn Feed Card Style) ───────────────────────────────────────

function PostCard({
  post,
  onVote,
  onReplyCountChange,
  currentUserId,
  refreshProfile,
}: {
  post: ForumPost;
  onVote: (post: ForumPost) => void;
  onReplyCountChange: (postId: string, delta: number) => void;
  currentUserId: string | undefined;
  refreshProfile?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies]   = useState<ForumReply[]>([]);
  const [loadingR, setLoadingR] = useState(false);
  
  // Truncation state
  const [isTruncated, setIsTruncated] = useState(true);
  
  // Comment composer state
  const [replyText, setReplyText] = useState('');
  const [replyMode, setReplyMode] = useState<'write' | 'preview'>('write');
  const [posting, setPosting]     = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadReplies = useCallback(async () => {
    setLoadingR(true);
    const { data } = await supabase
      .from('forum_replies')
      .select('*')
      .eq('post_id', post.id)
      .is('parent_id', null)
      .order('is_accepted', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(100);

    let enrichedData: ForumReply[] = [];
    if (data && data.length > 0) {
      const userIds = Array.from(new Set(data.map(r => r.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio')
        .in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
      enrichedData = data.map(r => ({
        ...r,
        profiles: profileMap.get(r.user_id) ?? undefined
      }));
    }

    if (enrichedData.length > 0 && currentUserId) {
      const replyIds = enrichedData.map(r => r.id);
      const { data: voted } = await supabase
        .from('forum_reply_votes')
        .select('reply_id')
        .eq('user_id', currentUserId)
        .in('reply_id', replyIds);
      const votedSet = new Set(voted?.map(v => v.reply_id) ?? []);
      setReplies(enrichedData.map(r => ({ ...r, user_voted: votedSet.has(r.id) })));
    } else {
      setReplies(enrichedData);
    }
    setLoadingR(false);
  }, [post.id, currentUserId]);

  useEffect(() => {
    if (!expanded) { channelRef.current?.unsubscribe(); return; }
    loadReplies();

    channelRef.current = supabase
      .channel(`replies:${post.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'forum_replies', filter: `post_id=eq.${post.id}` },
        async payload => {
          const newReply = payload.new as ForumReply;
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, bio')
            .eq('id', newReply.user_id)
            .maybeSingle();
          setReplies(prev => {
            if (prev.some(r => r.id === newReply.id)) return prev;
            return [...prev, { ...newReply, profiles: prof ?? undefined, user_voted: false }];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'forum_replies', filter: `post_id=eq.${post.id}` },
        payload => {
          setReplies(prev => prev.filter(r => r.id !== (payload.old as ForumReply).id));
        }
      )
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [expanded, loadReplies, post.id]);

  const triggerLoomieAI = async (postId: string, userText: string) => {
    try {
      const threadHistory = replies.slice(-5).map(r => `${r.profiles?.full_name ?? 'User'}: ${r.content}`).join('\n');
      const systemPrompt = `You are Loomie AI, the friendly and knowledgeable AI mentor on the LearnLoom educational platform. Answer the student's question directly inside this discussion thread. Be technical, accurate, clear, and structured. Use Markdown for styling.
      
Main Discussion Thread:
Title: "${post.title}"
Content: "${post.content}"

Previous Comment History:
${threadHistory}

Student's Query mentioning @loomie:
"${userText}"`;

      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await fetch('/api/ai-mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contents }),
      });

      if (!res.ok) throw new Error('Failed to fetch AI response');
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              aiText += parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            } catch {}
          }
        }
      }

      if (aiText.trim()) {
        await supabase.from('forum_replies').insert({
          post_id: postId,
          parent_id: null,
          user_id: currentUserId,
          content: aiText.trim(),
          is_ai: true,
        });
        loadReplies();
        onReplyCountChange(post.id, 1);
      }
    } catch (err) {
      console.error('Loomie AI response error:', err);
    }
  };

  const submitReply = async () => {
    if (!replyText.trim() || !currentUserId) return;
    setPosting(true);
    const textToSend = replyText.trim();
    const { error } = await supabase.from('forum_replies').insert({
      post_id: post.id,
      parent_id: null,
      user_id: currentUserId,
      content: textToSend,
      is_ai: false,
    });

    setPosting(false);
    if (error) { toast.error('Failed to post reply'); return; }
    setReplyText('');
    setReplyMode('write');
    onReplyCountChange(post.id, 1);
    
    if (textToSend.toLowerCase().includes('@loomie')) {
      toast.info('Loomie AI is reviewing the thread...');
      await triggerLoomieAI(post.id, textToSend);
    }
  };

  const voteReply = async (reply: ForumReply) => {
    if (!currentUserId) { toast.error('Please log in to vote'); return; }
    const { data, error } = await supabase.rpc('toggle_reply_vote', {
      p_reply_id: reply.id,
      p_user_id: currentUserId,
    });
    if (error) return;
    const result = Array.isArray(data) ? data[0] : data;
    setReplies(prev => prev.map(r =>
      r.id === reply.id
        ? { ...r, upvotes: result?.new_upvotes ?? r.upvotes, user_voted: result?.user_voted ?? !reply.user_voted }
        : r
    ));
  };

  const acceptReply = async (reply: ForumReply) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase.rpc('mark_reply_accepted', {
        p_reply_id: reply.id,
        p_user_id: currentUserId,
      });

      if (error) {
        toast.error('Failed to mark accepted solution', { description: error.message });
        return;
      }

      toast.success(reply.is_accepted ? 'Solution unmarked' : 'Solution accepted! Reward points issued.');
      if (refreshProfile) refreshProfile();
      loadReplies();
    } catch (err) {
      toast.error('Failed to mark accepted solution');
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/community#post-${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Link copied to clipboard!', { description: 'Share this thread with your peers.' });
  };

  const authorName = post.profiles?.full_name ?? 'Community Member';
  const authorBio = post.profiles?.bio ?? 'Student @ LearnLoom';
  const avatarUrl = post.profiles?.avatar_url;

  const shouldTruncate = post.content.length > 280;
  const isPostAuthor = post.user_id === currentUserId;

  return (
    <article id={`post-${post.id}`} className="bg-surface border border-border-base rounded-xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      {post.is_pinned && <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden"><div className="absolute top-1 -right-3 w-12 text-center rotate-45 bg-error text-white font-label-sm text-[8px] font-bold py-0.5 shadow-sm tracking-wider">PINNED</div></div>}
      
      {/* 1. Header (LinkedIn Style) */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="User Avatar" className="w-12 h-12 rounded-full border border-border-base object-cover shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-border-base font-bold text-text-primary text-[15px] shadow-sm select-none">
              {initials(post.profiles?.full_name)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-[15px] text-text-primary font-extrabold hover:text-primary transition-colors cursor-pointer">{authorName}</span>
              {isPostAuthor && <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full select-none">Author</span>}
            </div>
            <p className="text-[11px] sm:text-[12px] text-text-secondary font-medium leading-snug line-clamp-1 max-w-[280px] sm:max-w-md">{authorBio}</p>
            <div className="text-[10px] sm:text-[11px] text-text-secondary mt-0.5 flex items-center gap-1.5 select-none">
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              <span>•</span>
              <span className="material-symbols-outlined text-[12px] sm:text-[14px]">public</span>
            </div>
          </div>
        </div>
        <button className="text-text-secondary hover:bg-surface-container hover:text-text-primary p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 min-h-[36px] min-w-[36px] flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">more_horiz</span>
        </button>
      </div>

      {/* 2. Content Body */}
      <div className="mt-1">
        <h2 className="text-[17px] sm:text-[19px] font-headline-md text-text-primary mb-2 font-bold leading-tight group-hover:text-primary transition-colors">{post.title}</h2>
        
        <div className="text-[14px] sm:text-[15px] font-body-md text-text-secondary leading-relaxed">
          {shouldTruncate && isTruncated ? (
            <p className="whitespace-pre-wrap">
              {stripMarkdown(post.content).slice(0, 260)}...
              <button 
                onClick={() => setIsTruncated(false)}
                className="text-primary font-bold ml-1 hover:underline focus:outline-none"
              >
                see more
              </button>
            </p>
          ) : (
            <>
              {renderMarkdown(post.content)}
              {shouldTruncate && !isTruncated && (
                <button 
                  onClick={() => setIsTruncated(true)}
                  className="text-primary font-bold mt-2 hover:underline focus:outline-none block"
                >
                  see less
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3 select-none">
          <span className={`text-[10px] font-label-sm font-bold px-2 py-0.5 rounded border ${CAT_DETAILS[post.category]?.color ?? 'bg-surface-container text-text-secondary'}`}>
            #{post.category}
          </span>
          {post.tags?.map(tag => (
             <span key={tag} className="bg-surface-container-low text-text-secondary text-[10px] font-label-sm font-bold px-2 py-0.5 rounded border border-border-base">
               #{tag}
             </span>
          ))}
        </div>
      </div>

      {/* 3. Engagement Stats Bar */}
      <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-text-secondary border-b border-border-base pb-2 mt-1 select-none">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center border border-surface text-white text-[10px]"><span className="material-symbols-outlined text-[10px] font-bold">thumb_up</span></span>
            {post.reply_count > 0 && <span className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center border border-surface text-white text-[10px]"><span className="material-symbols-outlined text-[10px] font-bold">chat</span></span>}
          </div>
          <span>{post.upvotes} {post.upvotes === 1 ? 'like' : 'likes'}</span>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="hover:text-primary hover:underline font-medium">
          {post.reply_count} {post.reply_count === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      {/* 4. Action Bar (LinkedIn Style) */}
      <div className="grid grid-cols-3 border-b border-border-base pb-1 select-none">
        <button 
          onClick={() => onVote(post)}
          className={`flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-container transition-colors font-label-md text-[13px] sm:text-[14px] font-bold min-h-[40px] ${post.user_voted ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
        >
          <span className={`material-symbols-outlined text-[20px] ${post.user_voted ? 'fill' : ''}`}>thumb_up</span>
          <span>Like</span>
        </button>
        
        <button 
          onClick={() => setExpanded(e => !e)}
          className={`flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-container transition-colors font-label-md text-[13px] sm:text-[14px] font-bold min-h-[40px] ${expanded ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
          <span>Comment</span>
        </button>

        <button 
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-container text-text-secondary hover:text-primary transition-colors font-label-md text-[13px] sm:text-[14px] font-bold min-h-[40px]"
        >
          <span className="material-symbols-outlined text-[20px]">share</span>
          <span>Share</span>
        </button>
      </div>

      {/* 5. Expanded Comments & Input */}
      {expanded && (
        <div className="space-y-4 pt-1 animate-in slide-in-from-top-2">
          {loadingR ? (
            <div className="flex items-center gap-2 text-[13px] text-text-secondary justify-center py-4">
              <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Loading comments…
            </div>
          ) : replies.length === 0 ? (
            <p className="text-[13px] text-text-secondary text-center py-4 bg-surface-container-low rounded-lg border border-dashed border-border-base select-none">Be the first to share your thoughts!</p>
          ) : (
            <div className="space-y-4">
              {replies.map(reply => {
                const isThreadAuthor = post.user_id === currentUserId;

                return (
                  <div key={reply.id} className="flex gap-2.5 items-start">
                    {reply.is_ai ? (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--chart-4))] flex items-center justify-center text-white shrink-0 shadow-md">
                        <span className="material-symbols-outlined text-[16px] animate-pulse">smart_toy</span>
                      </div>
                    ) : reply.profiles?.avatar_url ? (
                      <img src={reply.profiles.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full border border-border-base object-cover shrink-0 shadow-sm" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold shrink-0 text-text-primary shadow-sm border border-border-base select-none">
                        {initials(reply.profiles?.full_name)}
                      </div>
                    )}
                    
                    <div className={`flex-1 min-w-0 border rounded-r-xl rounded-bl-xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm relative group/reply ${reply.is_ai ? 'bg-primary/5 border-primary/20' : 'bg-surface-container-low border-border-base'}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[13px] sm:text-[14px] font-label-md text-text-primary font-bold">
                              {reply.is_ai ? 'Loomie AI' : reply.profiles?.full_name ?? 'Community Member'}
                            </span>
                            
                            {reply.is_ai && (
                              <span className="bg-gradient-to-r from-primary to-[hsl(var(--chart-4))] text-white text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-full shadow-sm select-none">BOT</span>
                            )}

                            {reply.is_accepted && (
                              <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm animate-pulse-glow select-none">
                                <span className="material-symbols-outlined text-[12px] font-extrabold">check_circle</span>
                                Accepted Solution
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-text-secondary leading-tight mt-0.5 line-clamp-1 max-w-[200px] sm:max-w-sm">{reply.profiles?.bio ?? 'Student @ LearnLoom'}</p>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-text-secondary font-medium select-none">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                      </div>

                      <div className="text-[13px] sm:text-[14px] font-body-md text-text-secondary leading-relaxed">
                        {renderMarkdown(reply.content)}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-base/50">
                        <button
                          onClick={() => voteReply(reply)}
                          className={`flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold transition-colors py-1 px-2 rounded hover:bg-surface-container min-h-[28px] ${reply.user_voted ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
                        >
                          <span className={`material-symbols-outlined text-[15px] ${reply.user_voted ? 'fill' : ''}`}>thumb_up</span>
                          <span>{reply.upvotes}</span>
                        </button>

                        {isThreadAuthor && (
                          <button
                            onClick={() => acceptReply(reply)}
                            className={`flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold transition-colors py-1 px-2.5 rounded border min-h-[28px] ${
                              reply.is_accepted 
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20' 
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">{reply.is_accepted ? 'cancel' : 'check_circle'}</span>
                            <span>{reply.is_accepted ? 'Unaccept Answer' : 'Accept Answer'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentUserId ? (
            <div className="flex gap-3 items-start pt-3 border-t border-border-base">
               <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary select-none">
                  <span className="material-symbols-outlined text-[18px]">person</span>
               </div>
               <div className="flex-1 flex flex-col gap-2">
                 
                 <MarkdownToolbar 
                   textareaRef={textareaRef.current} 
                   textValue={replyText} 
                   setValue={setReplyText} 
                 />

                 <div className="flex gap-2 mb-1 justify-end select-none">
                   <button
                     type="button"
                     onClick={() => setReplyMode('write')}
                     className={`px-3 py-1 rounded text-xs font-bold transition-all ${replyMode === 'write' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                   >
                     Write
                   </button>
                   <button
                     type="button"
                     onClick={() => setReplyMode('preview')}
                     className={`px-3 py-1 rounded text-xs font-bold transition-all ${replyMode === 'preview' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                   >
                     Preview
                   </button>
                 </div>

                 {replyMode === 'write' ? (
                   <textarea
                      ref={textareaRef}
                      placeholder="Write a comment in markdown (use @loomie to consult AI)..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="w-full bg-surface border border-border-base rounded-b-lg p-3 text-[14px] text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 resize-none min-h-[85px] transition-all shadow-sm"
                   />
                 ) : (
                   <div className="w-full bg-surface-container-low border border-border-base rounded-b-lg p-4 text-[14px] text-text-secondary min-h-[85px] leading-relaxed shadow-sm">
                     {replyText.trim() ? renderMarkdown(replyText) : <span className="italic text-muted-foreground">Nothing to preview.</span>}
                   </div>
                 )}

                 <div className="flex justify-end select-none">
                   <button
                      onClick={submitReply}
                      disabled={!replyText.trim() || posting}
                      className="bg-primary text-on-primary px-4 py-1.5 rounded-lg text-[13px] font-label-md font-bold hover:bg-primary-container disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all min-h-[36px]"
                   >
                      {posting ? <span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[16px]">send</span>}
                      Comment
                   </button>
                 </div>
               </div>
            </div>
          ) : (
            <p className="text-[13px] text-text-secondary text-center font-medium bg-surface-container rounded p-2 select-none">Log in to comment</p>
          )}
        </div>
      )}
    </article>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { user, refreshProfile } = useAuth();
  const [posts, setPosts]               = useState<ForumPost[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Composer Modal State
  const [newTitle, setNewTitle]         = useState('');
  const [newContent, setNewContent]     = useState('');
  const [newCategory, setNewCategory]   = useState('general');
  const [composerMode, setComposerMode] = useState<'write' | 'preview'>('write');
  const [posting, setPosting]           = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [realtimeOk, setRealtimeOk]     = useState(false);

  const mainComposerRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Fetch posts ──────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('forum_posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (fetchErr) throw fetchErr;

      let enrichedData: ForumPost[] = [];
      if (data && data.length > 0) {
        const userIds = Array.from(new Set(data.map(p => p.user_id)));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .in('id', userIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
        enrichedData = data.map(p => ({
          ...p,
          profiles: profileMap.get(p.user_id) ?? undefined
        }));
      }

      if (user && enrichedData.length > 0) {
        const postIds = enrichedData.map(p => p.id);
        const { data: voteData } = await supabase
          .from('forum_votes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        const votedSet = new Set(voteData?.map(v => v.post_id) ?? []);
        setPosts(enrichedData.map(p => ({ ...p, user_voted: votedSet.has(p.id) })));
      } else {
        setPosts(enrichedData);
      }
    } catch (err) {
      console.error('Community load error:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Realtime subscription for posts ─────────────────
  useEffect(() => {
    const channel = supabase
      .channel('community:forum_posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'forum_posts' },
        async payload => {
          const newPost = payload.new as ForumPost;
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, bio')
            .eq('id', newPost.user_id)
            .maybeSingle();
          setPosts(prev => {
            if (prev.some(p => p.id === newPost.id)) return prev;
            return [{ ...newPost, profiles: prof ?? undefined, user_voted: false }, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'forum_posts' },
        payload => {
          const updated = payload.new as ForumPost;
          setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'forum_posts' },
        payload => {
          setPosts(prev => prev.filter(p => p.id !== (payload.old as ForumPost).id));
        }
      )
      .subscribe(status => setRealtimeOk(status === 'SUBSCRIBED'));

    return () => { channel.unsubscribe(); };
  }, []);

  const triggerLoomieForPost = async (postId: string, title: string, content: string) => {
    try {
      const systemPrompt = `You are Loomie AI, the friendly and knowledgeable AI mentor on the LearnLoom educational platform. A student has created a new discussion post. Provide a clean, helpful, and structured response using Markdown. If code is relevant, show examples. Keep it professional and complete.
      
Post Title: "${title}"
Post Content:
"${content}"`;

      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await fetch('/api/ai-mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contents }),
      });

      if (!res.ok) return;
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              aiText += parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            } catch {}
          }
        }
      }

      if (aiText.trim()) {
        await supabase.from('forum_replies').insert({
          post_id: postId,
          parent_id: null,
          user_id: user?.id,
          content: aiText.trim(),
          is_ai: true,
        });
        fetchPosts();
      }
    } catch (err) {
      console.error('Loomie post auto-reply error:', err);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please log in to post'); return; }
    if (!newTitle.trim() || !newContent.trim()) { toast.error('Please fill in all fields'); return; }
    setPosting(true);
    
    const postTitle = newTitle.trim();
    const postContent = newContent.trim();

    const { data, error: err } = await supabase.from('forum_posts').insert({
      user_id: user.id,
      title: postTitle,
      content: postContent,
      category: newCategory,
    }).select();

    setPosting(false);
    if (err) { toast.error('Failed to post', { description: err.message }); return; }
    
    toast.success('Discussion posted!');
    setIsComposerOpen(false);
    setNewTitle(''); setNewContent(''); setNewCategory('general');
    setComposerMode('write');
    fetchPosts();

    if (postContent.toLowerCase().includes('@loomie') || postTitle.toLowerCase().includes('@loomie')) {
      const newPostId = data?.[0]?.id;
      if (newPostId) {
        toast.info('Loomie AI is formulating a response...');
        await triggerLoomieForPost(newPostId, postTitle, postContent);
      }
    }
  };

  const handleVote = async (post: ForumPost) => {
    if (!user) { toast.error('Please log in to vote'); return; }
    const { data, error } = await supabase.rpc('toggle_forum_vote', {
      p_post_id: post.id,
      p_user_id: user.id,
    });
    if (error) { toast.error('Vote failed'); return; }
    const result = Array.isArray(data) ? data[0] : data;
    setPosts(prev => prev.map(p =>
      p.id === post.id
        ? { ...p, upvotes: result?.new_upvotes ?? p.upvotes, user_voted: result?.user_voted ?? !post.user_voted }
        : p
    ));
  };

  const handleReplyCountChange = (postId: string, delta: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: p.reply_count + delta } : p));
  };

  const filtered = posts.filter(p => {
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <AppLayout title="Community">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        
        {/* Left Column: Feeds & Groups */}
        <aside className="hidden lg:flex col-span-3 flex-col gap-6 sticky top-24 select-none">
          <div className="glass-panel rounded-xl p-4 border border-border-base shadow-sm">
            <h3 className="font-label-sm text-[11px] text-text-secondary uppercase tracking-widest font-bold mb-3 px-3 flex items-center justify-between">
              Feeds
              {realtimeOk ? <span className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)] animate-pulse" title="Live connection active" /> : <span className="w-2.5 h-2.5 rounded-full bg-error" title="Offline" />}
            </h3>
            <ul className="space-y-1">
              {[
                { icon: 'home', label: 'All Discussions', active: activeCategory === 'all', id: 'all' },
                { icon: 'help_outline', label: 'Doubts', active: activeCategory === 'doubt', id: 'doubt' },
                { icon: 'code', label: 'Challenges', active: activeCategory === 'challenge', id: 'challenge' },
                { icon: 'forum', label: 'Study Groups', active: activeCategory === 'study-group', id: 'study-group' },
              ].map(item => (
                <li key={item.id}>
                  <button 
                    onClick={() => setActiveCategory(item.id)}
                    className={`flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${item.active ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:text-text-primary hover:bg-surface-container/50 font-medium'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-[20px] ${item.active ? 'fill' : ''}`} style={{ fontVariationSettings: item.active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                      <span className="font-label-md text-[14px]">{item.label}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-border-base shadow-sm">
            <h3 className="font-label-sm text-[11px] text-text-secondary uppercase tracking-widest font-bold mb-3 px-1 flex items-center justify-between">
              Collaboration Rooms
            </h3>
            <ul className="space-y-2">
              {[
                { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: 'code_blocks', name: 'React Masters', badge: true },
                { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: 'settings_b_roll', name: 'Rustaceans' },
                { color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: 'psychology', name: 'AI Engineers' },
                { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: 'terminal', name: 'System Design' },
              ].map((group, i) => (
                <li key={i}>
                  <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-container transition-colors group/item">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-sm transition-transform group-hover/item:scale-105 ${group.color}`}>
                      <span className="material-symbols-outlined text-[18px]">{group.icon}</span>
                    </div>
                    <span className="font-label-md text-[14px] font-medium text-text-primary group-hover/item:text-primary transition-colors flex-1 truncate">{group.name}</span>
                    {group.badge && <div className="w-2 h-2 rounded-full bg-primary shadow-sm"></div>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Center Column: Discussion Feed */}
        <div className="col-span-1 lg:col-span-6 flex flex-col gap-4 sm:gap-5">
          
          {/* Mobile Categories Selector (Scrollable) */}
          <div className="flex lg:hidden overflow-x-auto scrollbar-hide gap-2 pb-2 -mx-4 px-4 scroll-snap-x">
            {[
              { icon: 'home', label: 'All', id: 'all' },
              { icon: 'help_outline', label: 'Doubts', id: 'doubt' },
              { icon: 'code', label: 'Challenges', id: 'challenge' },
              { icon: 'forum', label: 'Study Groups', id: 'study-group' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveCategory(item.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border shrink-0 scroll-snap-align-start transition-colors text-xs font-bold ${
                  activeCategory === item.id 
                    ? 'bg-primary border-primary text-on-primary shadow-sm' 
                    : 'bg-surface border-border-base text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* LinkedIn-Style Top Composer Box */}
          <div className="bg-surface border border-border-base rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="User Avatar" className="w-12 h-12 rounded-full border border-border-base object-cover shadow-sm" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface-container border border-border-base flex items-center justify-center shrink-0 shadow-sm text-primary select-none">
                   <span className="material-symbols-outlined text-[24px]">person</span>
                </div>
              )}
              <button 
                onClick={() => { setIsComposerOpen(true); setNewCategory('general'); }}
                className="flex-1 text-left bg-surface-container-low rounded-full px-5 py-3 border border-border-base hover:bg-surface-container-high transition-colors font-body-md text-[14px] text-text-secondary cursor-pointer shadow-inner min-h-[44px]"
              >
                Start a post with markdown (use @loomie for AI help)...
              </button>
            </div>
            
            <div className="grid grid-cols-3 border-t border-border-base pt-2 text-text-secondary select-none">
              <button 
                onClick={() => { setIsComposerOpen(true); setNewCategory('doubt'); }}
                className="flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-container hover:text-primary transition-all font-label-md text-xs sm:text-[13px] font-bold"
              >
                <span className="material-symbols-outlined text-rose-500 font-bold text-[18px] sm:text-[20px]">help_outline</span>
                <span>Ask Doubt</span>
              </button>
              <button 
                onClick={() => { setIsComposerOpen(true); setNewCategory('challenge'); }}
                className="flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-container hover:text-primary transition-all font-label-md text-xs sm:text-[13px] font-bold"
              >
                <span className="material-symbols-outlined text-purple-500 font-bold text-[18px] sm:text-[20px]">code</span>
                <span>Share Code</span>
              </button>
              <button 
                onClick={() => { setIsComposerOpen(true); setNewCategory('study-group'); }}
                className="flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-container hover:text-primary transition-all font-label-md text-xs sm:text-[13px] font-bold"
              >
                <span className="material-symbols-outlined text-emerald-500 font-bold text-[18px] sm:text-[20px]">groups</span>
                <span>Group Work</span>
              </button>
            </div>
          </div>

          {/* LinkedIn-Style Composer Modal Overlay */}
          {isComposerOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <form 
                onSubmit={handlePost} 
                className="bg-surface border border-border-base rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
                  <span className="font-headline-md text-[18px] sm:text-[20px] text-text-primary font-extrabold select-none">Create a post</span>
                  <button 
                    type="button" 
                    onClick={() => setIsComposerOpen(false)} 
                    className="text-text-secondary hover:text-text-primary p-1.5 hover:bg-surface-container rounded-full transition-colors flex items-center justify-center min-h-[32px] min-w-[32px]"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Modal User Header */}
                <div className="px-5 py-3 flex items-center gap-3 bg-surface-container-low select-none">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border border-border-base object-cover shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface border border-border-base flex items-center justify-center shrink-0 shadow-sm text-primary">
                       <span className="material-symbols-outlined text-[18px]">person</span>
                    </div>
                  )}
                  <div>
                    <span className="font-label-md text-[14px] text-text-primary font-bold">{user?.user_metadata?.full_name || 'Community Member'}</span>
                    
                    <div className="relative mt-0.5">
                      <select 
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="bg-surface border border-border-base text-text-secondary text-[11px] font-bold py-1 pl-2.5 pr-8 rounded-full focus:outline-none focus:border-primary appearance-none cursor-pointer shadow-sm hover:text-text-primary transition-colors"
                      >
                        <option value="general">🌐 Anyone (General)</option>
                        <option value="doubt">❓ Doubt & Query</option>
                        <option value="challenge">💻 Code Challenge</option>
                        <option value="study-group">👥 Study Group</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-[12px]">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* Modal Form Scrollable Area */}
                <div className="p-5 overflow-y-auto flex flex-col gap-4 flex-1">
                  <input 
                    type="text" 
                    placeholder="Title of your post..." 
                    className="w-full bg-surface border-b border-border-base py-2 text-[16px] font-bold text-text-primary focus:outline-none focus:border-primary transition-all shrink-0"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    required 
                    minLength={5}
                  />

                  <MarkdownToolbar 
                    textareaRef={mainComposerRef.current} 
                    textValue={newContent} 
                    setValue={setNewContent} 
                  />

                  <div className="flex gap-2 justify-end mb-1 shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => setComposerMode('write')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${composerMode === 'write' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerMode('preview')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${composerMode === 'preview' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      Preview
                    </button>
                  </div>

                  {composerMode === 'write' ? (
                    <textarea 
                      ref={mainComposerRef}
                      placeholder="What do you want to talk about? (use @loomie for instant AI answers)" 
                      className="w-full bg-surface border border-border-base rounded-b-lg p-3 text-[14px] text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 shadow-sm transition-all flex-1 min-h-[160px] resize-y"
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      required 
                      minLength={10}
                    />
                  ) : (
                    <div className="w-full bg-surface border border-border-base rounded-b-lg p-4 text-[14px] text-text-secondary min-h-[160px] leading-relaxed shadow-sm overflow-y-auto">
                      {newContent.trim() ? renderMarkdown(newContent) : <span className="italic text-muted-foreground">Nothing to preview.</span>}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-4 border-t border-border-base bg-surface-container flex justify-end gap-3 select-none">
                  <button 
                    type="button" 
                    onClick={() => setIsComposerOpen(false)} 
                    className="px-4 py-2 text-text-secondary hover:text-text-primary font-label-md font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={posting} 
                    className="bg-gradient-to-r from-primary to-[hsl(var(--chart-4))] text-white hover:shadow-md px-6 py-2 rounded-lg font-label-md font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all min-h-[40px]"
                  >
                    {posting ? <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
                    Post
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Feed Sort/Filter */}
          <div className="flex items-center justify-between pb-3 border-b border-border-base select-none">
            <h2 className="font-headline-md text-[18px] sm:text-[20px] font-bold text-text-primary">Recent Posts</h2>
            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[18px]">search</span>
                <input 
                  type="text" 
                  placeholder="Search posts..." 
                  className="w-56 bg-surface rounded-full py-1.5 pl-9 pr-4 border border-border-base text-[13px] font-body-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm transition-all"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-label-md text-text-secondary cursor-pointer hover:text-primary transition-colors bg-surface border border-border-base px-3 py-1.5 rounded-lg shadow-sm">
                 Sort: <span className="font-bold text-text-primary">Latest</span>
                 <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </div>
            </div>
          </div>

          {/* Discussion Cards */}
          {error && (
            <div className="p-4 rounded-xl bg-error/5 border border-error/20 text-error flex items-start gap-3 shadow-sm">
              <span className="material-symbols-outlined mt-0.5 text-[20px]">error</span>
              <p className="font-body-sm text-[14px] font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-panel border border-border-base rounded-xl p-6 flex gap-4 shadow-sm">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0 bg-surface-container" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-1/3 bg-surface-container" />
                    <Skeleton className="h-7 w-3/4 bg-surface-container" />
                    <Skeleton className="h-16 w-full bg-surface-container" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 border border-border-base rounded-2xl bg-surface/50 border-dashed shadow-sm">
                <span className="material-symbols-outlined text-[48px] text-text-secondary opacity-30 mb-4 select-none">forum</span>
                <p className="font-headline-md text-[20px] font-bold text-text-primary mb-1">No discussions found</p>
                <p className="font-body-md text-[15px] text-text-secondary">Try a different search term or start a new post.</p>
              </div>
            ) : (
              filtered.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onVote={handleVote}
                  onReplyCountChange={handleReplyCountChange}
                  currentUserId={user?.id}
                  refreshProfile={refreshProfile}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Sidebar Widgets */}
        <aside className="hidden lg:flex col-span-3 flex-col gap-6 sticky top-24 select-none">
          {/* Trending Topics */}
          <div className="glass-panel rounded-xl p-5 border border-border-base shadow-sm">
            <h3 className="font-headline-md text-[18px] font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span> Trending Topics
            </h3>
            <ul className="space-y-4">
              {[
                { topic: '#NextJS14', desc: '1.2k posts today' },
                { topic: '#UXDesignPrinciples', desc: '856 posts today' },
                { topic: '#PythonForBeginners', desc: '642 posts today' },
              ].map((t, i) => (
                <li key={i}>
                  <a href="#" className="block group">
                    <div className="font-label-md text-[14px] font-bold text-text-primary group-hover:text-primary transition-colors mb-0.5">{t.topic}</div>
                    <div className="font-body-sm text-[12px] text-text-secondary">{t.desc}</div>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Contributors */}
          <div className="glass-panel rounded-xl p-5 border border-border-base shadow-sm">
            <h3 className="font-headline-md text-[18px] font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> Top Contributors
            </h3>
            <ul className="space-y-3">
              {[
                { name: 'David Kim', pts: '1.2k pts', role: 'Full Stack Dev' },
                { name: 'Elena R.', pts: '980 pts', role: 'Design Lead' },
                { name: 'Sarah J.', pts: '850 pts', role: 'Data Scientist' },
              ].map((c, i) => (
                <li key={i} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-surface-container border border-border-base flex items-center justify-center font-bold text-text-primary shadow-sm text-[12px] group-hover:border-primary transition-colors">
                    {initials(c.name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-label-sm text-[13px] font-bold text-text-primary group-hover:text-primary transition-colors">{c.name}</div>
                    <div className="font-body-sm text-[11px] text-text-secondary">{c.role}</div>
                  </div>
                  <span className="bg-surface-container text-text-secondary px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-border-base">{c.pts}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
