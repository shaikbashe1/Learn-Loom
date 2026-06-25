import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

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
  profiles?: { full_name: string | null; avatar_url: string | null };
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
  profiles?: { full_name: string | null; avatar_url: string | null };
  user_voted?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  doubt:         'bg-error/10 text-error border-error/20',
  general:       'bg-primary/10 text-primary border-primary/20',
  challenge:     'bg-secondary/10 text-secondary border-secondary/20',
  'study-group': 'bg-tertiary/10 text-tertiary border-tertiary/20',
};

function initials(name: string | null | undefined) {
  if (!name) return 'CM';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onVote,
  onReplyCountChange,
  currentUserId,
}: {
  post: ForumPost;
  onVote: (post: ForumPost) => void;
  onReplyCountChange: (postId: string, delta: number) => void;
  currentUserId: string | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies]   = useState<ForumReply[]>([]);
  const [loadingR, setLoadingR] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting]   = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadReplies = useCallback(async () => {
    setLoadingR(true);
    const { data } = await supabase
      .from('forum_replies')
      .select('*, profiles(full_name, avatar_url)')
      .eq('post_id', post.id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data && currentUserId) {
      const replyIds = data.map(r => r.id);
      const { data: voted } = await supabase
        .from('forum_reply_votes')
        .select('reply_id')
        .eq('user_id', currentUserId)
        .in('reply_id', replyIds);
      const votedSet = new Set(voted?.map(v => v.reply_id) ?? []);
      setReplies(data.map(r => ({ ...r, user_voted: votedSet.has(r.id) })));
    } else {
      setReplies(data ?? []);
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
            .select('full_name, avatar_url')
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

  const submitReply = async () => {
    if (!replyText.trim() || !currentUserId) return;
    setPosting(true);
    const { error } = await supabase.from('forum_replies').insert({
      post_id: post.id,
      parent_id: null,
      user_id: currentUserId,
      content: replyText.trim(),
    });
    setPosting(false);
    if (error) { toast.error('Failed to post reply'); return; }
    setReplyText('');
    onReplyCountChange(post.id, 1);
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

  const authorName = post.profiles?.full_name ?? 'Community Member';
  const avatarUrl = post.profiles?.avatar_url;

  return (
    <article className="glass-panel border border-border-base rounded-xl p-4 sm:p-5 md:p-6 flex flex-col gap-3 card-lift relative overflow-hidden group">
      {post.is_pinned && <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden"><div className="absolute top-1 -right-3 w-12 text-center rotate-45 bg-error text-white font-label-sm text-[8px] font-bold py-0.5 shadow-sm tracking-wider">PINNED</div></div>}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="User Avatar" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border-base object-cover shadow-sm" />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-container flex items-center justify-center border border-border-base font-bold text-text-primary text-sm sm:text-[15px] shadow-sm">
              {initials(post.profiles?.full_name)}
            </div>
          )}
          <div>
            <div className="font-label-md text-[14px] sm:text-[15px] text-text-primary font-bold">{authorName}</div>
            <div className="text-[11px] sm:text-[13px] text-text-secondary">{post.category.replace('-', ' ').toUpperCase()} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</div>
          </div>
        </div>
        <button className="text-text-secondary hover:bg-surface-container hover:text-text-primary p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100">
          <span className="material-symbols-outlined text-[20px]">more_horiz</span>
        </button>
      </div>

      <div className="mt-2">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`text-[11px] font-label-sm font-bold px-2 py-1 rounded uppercase tracking-wider border ${CAT_COLORS[post.category] ?? 'bg-surface-container text-text-secondary border-border-base'}`}>
            {post.category}
          </span>
          {post.tags?.map(tag => (
             <span key={tag} className="bg-surface text-text-secondary text-[11px] font-label-sm font-bold px-2 py-1 rounded uppercase tracking-wider border border-border-base">
               #{tag}
             </span>
          ))}
        </div>
        <h2 className="text-[20px] font-headline-md text-text-primary mb-2 font-bold leading-tight group-hover:text-primary transition-colors">{post.title}</h2>
        <p className="text-[15px] font-body-md text-text-secondary mb-2 whitespace-pre-wrap leading-relaxed line-clamp-3">{post.content}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 pt-4 border-t border-border-base">
        <button 
          onClick={() => onVote(post)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-surface-container transition-colors font-label-md text-[13px] sm:text-[14px] font-bold min-h-[40px] ${post.user_voted ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
        >
          <span className={`material-symbols-outlined text-[18px] sm:text-[20px] ${post.user_voted ? 'fill' : ''}`}>thumb_up</span>
          {post.upvotes}
        </button>
        <button 
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-surface-container text-text-secondary hover:text-primary transition-colors font-label-md text-[13px] sm:text-[14px] font-bold min-h-[40px]"
        >
          <span className={`material-symbols-outlined text-[18px] sm:text-[20px] ${expanded ? 'fill text-primary' : ''}`}>chat_bubble_outline</span>
          {post.reply_count} <span className="hidden xs:inline">Comments</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-surface-container text-text-secondary hover:text-primary transition-colors font-label-md text-[13px] sm:text-[14px] font-bold ml-auto min-h-[40px]">
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">share</span>
          <span>Share</span>
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border-base pt-4 animate-in slide-in-from-top-2">
          {loadingR ? (
            <div className="flex items-center gap-2 text-[14px] text-text-secondary justify-center py-4">
              <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span> Loading replies…
            </div>
          ) : replies.length === 0 ? (
            <p className="text-[14px] text-text-secondary text-center py-4 font-body-sm bg-surface/50 rounded-lg border border-dashed border-border-base">No replies yet — be the first to share your thoughts!</p>
          ) : (
            <div className="space-y-3">
              {replies.map(reply => (
                <div key={reply.id} className="flex gap-2 sm:gap-3 items-start">
                  {reply.profiles?.avatar_url ? (
                    <img src={reply.profiles.avatar_url} alt="Avatar" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border-base object-cover shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-container flex items-center justify-center text-[10px] sm:text-[12px] font-bold shrink-0 text-text-primary shadow-sm border border-border-base">
                      {initials(reply.profiles?.full_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 bg-surface border border-border-base rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm relative group/reply">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                      <span className="text-[13px] sm:text-[14px] font-label-md text-text-primary font-bold">{reply.profiles?.full_name ?? 'Community Member'}</span>
                      <span className="text-[10px] sm:text-[11px] text-text-secondary font-medium">• {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-[13px] sm:text-[14px] font-body-md text-text-secondary leading-relaxed">{reply.content}</p>
                    <button
                      onClick={() => voteReply(reply)}
                      className={`flex items-center gap-1 mt-2 text-[11px] sm:text-[12px] font-bold transition-colors py-1 px-2 rounded hover:bg-surface-container min-h-[28px] ${reply.user_voted ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
                    >
                      <span className={`material-symbols-outlined text-[14px] sm:text-[16px] ${reply.user_voted ? 'fill' : ''}`}>thumb_up</span>
                      {reply.upvotes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentUserId ? (
            <div className="flex gap-3 items-start pt-3 border-t border-border-base">
               <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary">
                  <span className="material-symbols-outlined text-[18px]">person</span>
               </div>
               <div className="flex-1 flex flex-col gap-2">
                 <textarea
                    placeholder="Write a reply…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
                    className="w-full bg-surface border border-border-base rounded-lg p-3 text-[14px] text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 resize-none min-h-[44px] max-h-[120px] transition-all shadow-sm"
                    rows={1}
                 />
                 <div className="flex justify-end">
                   <button
                      onClick={submitReply}
                      disabled={!replyText.trim() || posting}
                      className="bg-primary text-on-primary px-4 py-1.5 rounded-lg text-[13px] font-label-md font-bold hover:bg-primary-container disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all"
                   >
                      {posting ? <span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[16px]">send</span>}
                      Reply
                   </button>
                 </div>
               </div>
            </div>
          ) : (
            <p className="text-[13px] text-text-secondary text-center font-medium bg-surface-container rounded p-2">Log in to reply</p>
          )}
        </div>
      )}
    </article>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts]               = useState<ForumPost[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [newTitle, setNewTitle]         = useState('');
  const [newContent, setNewContent]     = useState('');
  const [newCategory, setNewCategory]   = useState('general');
  const [posting, setPosting]           = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [realtimeOk, setRealtimeOk]     = useState(false);

  // ── Fetch posts with vote state ──────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('forum_posts')
        .select('*, profiles(full_name, avatar_url)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (fetchErr) throw fetchErr;

      if (user && data) {
        const postIds = data.map(p => p.id);
        const { data: voteData } = await supabase
          .from('forum_votes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        const votedSet = new Set(voteData?.map(v => v.post_id) ?? []);
        setPosts(data.map(p => ({ ...p, user_voted: votedSet.has(p.id) })));
      } else {
        setPosts(data ?? []);
      }
    } catch (err: unknown) {
      console.error('Community load error:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Supabase Realtime subscription for new/deleted posts ─────────────────
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
            .select('full_name, avatar_url')
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

  // ── Post a new thread ────────────────────────────────────────────────────
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please log in to post'); return; }
    if (!newTitle.trim() || !newContent.trim()) { toast.error('Please fill in all fields'); return; }
    setPosting(true);
    const { error: err } = await supabase.from('forum_posts').insert({
      user_id: user.id,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
    });
    setPosting(false);
    if (err) { toast.error('Failed to post', { description: err.message }); return; }
    toast.success('Discussion posted!');
    setIsComposerOpen(false);
    setNewTitle(''); setNewContent(''); setNewCategory('general');
  };

  // ── Vote on a post ───────────────────────────────────────────────────────
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
        
        {/* Left Column: Context Nav & Groups */}
        <aside className="hidden lg:flex col-span-3 flex-col gap-6 sticky top-24">
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
                    {item.id === 'all' && <span className="font-label-sm text-[10px] text-white bg-primary px-2 py-0.5 rounded-full shadow-sm">New</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-xl p-4 border border-border-base shadow-sm">
            <h3 className="font-label-sm text-[11px] text-text-secondary uppercase tracking-widest font-bold mb-3 px-1 flex items-center justify-between">
              Joined Groups
            </h3>
            <ul className="space-y-2">
              {[
                { color: 'bg-[#61DAFB]/20 text-[#0088cc]', icon: 'code_blocks', name: 'React Masters', badge: true },
                { color: 'bg-[#DEA584]/20 text-[#c27244]', icon: 'settings_b_roll', name: 'Rustaceans' },
                { color: 'bg-primary/20 text-primary', icon: 'psychology', name: 'AI Engineers' },
                { color: 'bg-surface-container-high text-text-primary', icon: 'terminal', name: 'System Design' },
              ].map((group, i) => (
                <li key={i}>
                  <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-container transition-colors group/item">
                    <div className={`w-8 h-8 rounded-lg border border-border-base flex items-center justify-center shadow-sm transition-transform group-hover/item:scale-105 ${group.color}`}>
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
        <div className="col-span-1 lg:col-span-6 flex flex-col gap-4 sm:gap-6">
          
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

          {/* Post Composer */}
          <div className={
            isComposerOpen 
              ? "fixed inset-0 z-50 flex flex-col bg-surface p-4 md:relative md:inset-auto md:z-auto md:flex-initial md:bg-transparent md:glass-panel md:border md:border-border-base md:rounded-xl md:p-5 md:shadow-sm md:card-lift md:overflow-hidden"
              : "glass-panel border border-border-base rounded-xl p-5 shadow-sm transition-all focus-within:shadow-md card-lift relative overflow-hidden"
          }>
            {!isComposerOpen && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>}
            {isComposerOpen ? (
              <form onSubmit={handlePost} className="flex flex-col gap-4 mt-2 flex-1 md:flex-none">
                {/* Mobile composer header */}
                <div className="flex md:hidden items-center justify-between border-b border-border-base pb-3 mb-2 shrink-0">
                  <span className="font-headline-md text-[20px] text-text-primary font-bold">New Discussion</span>
                  <button type="button" onClick={() => setIsComposerOpen(false)} className="text-text-secondary p-1">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Title of your discussion..." 
                  className="w-full bg-surface-container-low border border-border-base rounded-lg p-3 text-[15px] font-body-md text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 shadow-sm transition-all shrink-0"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required minLength={5}
                />
                <select 
                  className="w-full bg-surface-container-low border border-border-base rounded-lg p-3 text-[14px] font-label-md text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 shadow-sm transition-all appearance-none cursor-pointer shrink-0"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="doubt">Doubt</option>
                  <option value="challenge">Challenge</option>
                  <option value="study-group">Study Group</option>
                </select>
                <textarea 
                  placeholder="Share your thoughts, ask a question, or provide details..." 
                  className="w-full bg-surface-container-low border border-border-base rounded-lg p-3 text-[15px] font-body-md text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 shadow-sm transition-all flex-1 md:flex-none md:min-h-[120px] resize-y"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  required minLength={10}
                />
                <div className="flex justify-between items-center mt-2 border-t border-border-base pt-3 shrink-0">
                  <div className="flex gap-2">
                     <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:bg-surface-container transition-colors text-[13px] font-bold">
                         <span className="material-symbols-outlined text-primary text-[18px]">article</span> <span className="hidden sm:inline">Article</span>
                     </button>
                     <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:bg-surface-container transition-colors text-[13px] font-bold">
                         <span className="material-symbols-outlined text-success text-[18px]">image</span> <span className="hidden sm:inline">Media</span>
                     </button>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsComposerOpen(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary font-label-md font-bold transition-colors">Cancel</button>
                    <button type="submit" disabled={posting} className="bg-primary text-on-primary hover:bg-primary-container px-6 py-2 rounded-lg font-label-md font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all min-h-[40px]">
                      {posting ? <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
                      Post
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-4 mt-1">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User" className="w-10 h-10 object-cover border border-border-base rounded-full shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface border border-border-base flex items-center justify-center shrink-0 shadow-sm text-primary">
                     <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                )}
                <div className="flex-1" onClick={() => setIsComposerOpen(true)}>
                  <input className="w-full bg-surface-container-low rounded-lg px-4 py-3 border border-border-base hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none font-body-md text-[14px] text-text-primary placeholder-text-secondary transition-all cursor-pointer shadow-sm" placeholder="Share a resource, ask a question, or start a discussion..." type="text" readOnly />
                </div>
              </div>
            )}
          </div>

          {/* Feed Sort/Filter */}
          <div className="flex items-center justify-between pb-3 border-b border-border-base">
            <h2 className="font-headline-md text-[20px] font-bold text-text-primary">Recent Posts</h2>
            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[18px]">search</span>
                <input 
                  type="text" 
                  placeholder="Search community..." 
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

          <div className="space-y-6">
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
                <span className="material-symbols-outlined text-[48px] text-text-secondary opacity-30 mb-4">forum</span>
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
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Widgets */}
        <aside className="hidden lg:flex col-span-3 flex-col gap-6 sticky top-24">
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
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> Top Contributors
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
