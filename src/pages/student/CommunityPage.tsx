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
  doubt:         'bg-primary/10 text-primary border-primary/20',
  general:       'bg-secondary/10 text-secondary border-secondary/20',
  challenge:     'bg-tertiary/10 text-tertiary border-tertiary/20',
  'study-group': 'bg-chart-3/10 text-chart-3 border-chart-3/20',
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
      .select('*')
      .eq('post_id', post.id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .limit(100);

    let enrichedReplies = data || [];
    if (data && data.length > 0) {
      const userIds = Array.from(new Set(data.map(r => r.user_id)));
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
        
      if (profData) {
        const profMap = Object.fromEntries(profData.map(p => [p.id, p]));
        enrichedReplies = data.map(r => ({ ...r, profiles: profMap[r.user_id] }));
      }
    }

    if (enrichedReplies.length > 0 && currentUserId) {
      const replyIds = enrichedReplies.map(r => r.id);
      const { data: voted } = await supabase
        .from('forum_reply_votes')
        .select('reply_id')
        .eq('user_id', currentUserId)
        .in('reply_id', replyIds);
      const votedSet = new Set(voted?.map(v => v.reply_id) ?? []);
      setReplies(enrichedReplies.map(r => ({ ...r, user_voted: votedSet.has(r.id) })));
    } else {
      setReplies(enrichedReplies);
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
    <article className="bg-surface border border-outline-variant/60 rounded-xl p-md flex flex-col gap-sm hover:border-outline-variant transition-colors group relative overflow-hidden">
      {post.is_pinned && <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden"><div className="absolute top-1 -right-3 w-12 text-center rotate-45 bg-chart-4 text-on-primary font-label-sm text-[8px] font-bold py-0.5">PINNED</div></div>}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-sm">
          {avatarUrl ? (
            <img src={avatarUrl} alt="User Avatar" className="w-10 h-10 rounded-full border border-outline-variant/40 object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40 font-bold text-on-surface text-sm">
              {initials(post.profiles?.full_name)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-xs">
              <span className="text-label-md font-label-md text-on-surface font-semibold">{authorName}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">• {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            </div>
            <span className="text-label-sm font-label-sm text-on-surface-variant capitalize">{post.category.replace('-', ' ')}</span>
          </div>
        </div>
        <button className="text-on-surface-variant hover:text-on-surface opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </div>

      <div className="mt-xs">
        <div className="flex items-center gap-xs mb-sm">
          <span className={`text-label-sm font-label-sm px-xs py-[2px] rounded font-mono border ${CAT_COLORS[post.category] ?? 'bg-surface-container-high text-on-surface-variant border-outline-variant/40'}`}>
            #{post.category}
          </span>
          {post.tags?.map(tag => (
             <span key={tag} className="bg-surface-container-high text-on-surface-variant text-label-sm font-label-sm px-xs py-[2px] rounded font-mono border border-outline-variant/40">
               #{tag}
             </span>
          ))}
        </div>
        <h2 className="text-headline-md font-headline-md text-on-surface mb-xs leading-snug">{post.title}</h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-sm whitespace-pre-wrap">{post.content}</p>
      </div>

      <div className="flex items-center gap-md mt-sm pt-sm border-t border-outline-variant/30">
        <button 
          onClick={() => onVote(post)}
          className={`flex items-center gap-xs transition-colors ${post.user_voted ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
        >
          <span className={`material-symbols-outlined text-[20px] ${post.user_voted ? 'fill' : ''}`}>thumb_up</span>
          <span className="text-label-sm font-label-sm font-semibold">{post.upvotes}</span>
        </button>
        <button 
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-xs text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
          <span className="text-label-sm font-label-sm font-semibold">{post.reply_count} comments</span>
        </button>
        <div className="flex items-center gap-xs text-on-surface-variant ml-auto">
          <span className="material-symbols-outlined text-[20px]">visibility</span>
          <span className="text-label-sm font-label-sm">{(post.upvotes * 3 + post.reply_count * 5) || 12} views</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-md space-y-md border-t border-outline-variant/30 pt-md">
          {loadingR ? (
            <div className="flex items-center gap-2 text-label-sm text-on-surface-variant justify-center py-2">
              <span className="material-symbols-outlined animate-spin">autorenew</span> Loading replies…
            </div>
          ) : replies.length === 0 ? (
            <p className="text-label-sm text-on-surface-variant text-center py-2">No replies yet — be the first!</p>
          ) : (
            <div className="space-y-sm">
              {replies.map(reply => (
                <div key={reply.id} className="flex gap-sm items-start">
                  {reply.profiles?.avatar_url ? (
                    <img src={reply.profiles.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-outline-variant/40 object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold shrink-0 text-on-surface">
                      {initials(reply.profiles?.full_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 bg-surface-container-low border border-outline-variant/30 rounded-xl px-sm py-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-label-sm font-label-sm text-on-surface font-semibold">{reply.profiles?.full_name ?? 'Community Member'}</span>
                      <span className="text-[10px] text-on-surface-variant">• {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant">{reply.content}</p>
                    <button
                      onClick={() => voteReply(reply)}
                      className={`flex items-center gap-1 mt-2 text-[10px] transition-colors ${reply.user_voted ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                      <span className={`material-symbols-outlined text-[14px] ${reply.user_voted ? 'fill' : ''}`}>thumb_up</span>
                      {reply.upvotes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentUserId ? (
            <div className="flex gap-2 items-start pt-2 border-t border-outline-variant/30">
               <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/40">
                  <span className="material-symbols-outlined text-[18px]">person</span>
               </div>
               <div className="flex-1 flex flex-col gap-2">
                 <textarea
                    placeholder="Write a reply…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none min-h-[40px] max-h-[120px]"
                    rows={1}
                 />
                 <div className="flex justify-end">
                   <button
                      onClick={submitReply}
                      disabled={!replyText.trim() || posting}
                      className="bg-primary text-on-primary-container px-md py-1 rounded-md text-label-sm font-label-sm font-bold hover:brightness-110 disabled:opacity-50 flex items-center gap-1"
                   >
                      {posting ? <span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[16px]">send</span>}
                      Reply
                   </button>
                 </div>
               </div>
            </div>
          ) : (
            <p className="text-label-sm text-on-surface-variant text-center">Log in to reply</p>
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
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (fetchErr) throw fetchErr;

      let enrichedPosts = data || [];
      if (data && data.length > 0) {
        const userIds = Array.from(new Set(data.map(p => p.user_id)));
        const { data: profData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
          
        if (profData) {
          const profMap = Object.fromEntries(profData.map(p => [p.id, p]));
          enrichedPosts = data.map(p => ({ ...p, profiles: profMap[p.user_id] }));
        }
      }

      if (user && enrichedPosts.length > 0) {
        const postIds = enrichedPosts.map(p => p.id);
        const { data: voteData } = await supabase
          .from('forum_votes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        const votedSet = new Set(voteData?.map(v => v.post_id) ?? []);
        setPosts(enrichedPosts.map(p => ({ ...p, user_voted: votedSet.has(p.id) })));
      } else {
        setPosts(enrichedPosts);
      }
    } catch (err: unknown) {
      console.error('Community load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts. Please try again.');
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
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start pb-xl">
        
        {/* Left Column: Context Nav & Groups */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-lg lg:sticky lg:top-24">
          <section className="flex flex-col gap-xs">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm px-sm flex items-center justify-between">
              Feeds
              {realtimeOk ? <span className="w-2 h-2 rounded-full bg-primary animate-pulse" title="Live connection active" /> : <span className="w-2 h-2 rounded-full bg-error" title="Offline" />}
            </h3>
            {[
              { icon: 'public', label: 'All Discussions', active: activeCategory === 'all', id: 'all' },
              { icon: 'help_outline', label: 'Doubts', active: activeCategory === 'doubt', id: 'doubt' },
              { icon: 'code', label: 'Challenges', active: activeCategory === 'challenge', id: 'challenge' },
              { icon: 'groups', label: 'Study Groups', active: activeCategory === 'study-group', id: 'study-group' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveCategory(item.id)}
                className={`flex items-center justify-between w-full text-left px-sm py-sm rounded-lg transition-colors group border ${item.active ? 'bg-surface-container border-outline-variant/60 text-on-surface' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border-transparent'}`}
              >
                <div className="flex items-center gap-sm">
                  <span className={`material-symbols-outlined ${item.active ? 'text-primary' : ''}`}>{item.icon}</span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                </div>
                {item.id === 'all' && <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-2 rounded-full">New</span>}
              </button>
            ))}
          </section>

          <section className="flex flex-col gap-sm">
            <div className="flex items-center justify-between px-sm mb-xs">
              <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Joined Groups</h3>
              <button className="text-primary hover:text-primary-fixed-dim transition-colors"><span className="material-symbols-outlined text-[18px]">add</span></button>
            </div>
            {[
              { color: 'text-[#61DAFB]', icon: 'code_blocks', name: 'React Masters', badge: true },
              { color: 'text-[#DEA584]', icon: 'settings_b_roll', name: 'Rustaceans' },
              { color: 'text-secondary', icon: 'psychology', name: 'AI Engineers' },
              { color: 'text-on-surface', icon: 'terminal', name: 'System Design' },
            ].map((group, i) => (
              <a key={i} href="#" className="flex items-center gap-sm px-sm py-sm rounded-lg hover:bg-surface-container-low transition-colors group">
                <div className={`w-8 h-8 rounded bg-surface-container-high border border-outline-variant/60 flex items-center justify-center ${group.color}`}>
                  <span className="material-symbols-outlined text-[18px]">{group.icon}</span>
                </div>
                <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-on-surface flex-1 truncate">{group.name}</span>
                {group.badge && <div className="w-2 h-2 rounded-full bg-primary"></div>}
              </a>
            ))}
          </section>
        </div>

        {/* Center Column: Discussion Feed */}
        <div className="col-span-1 lg:col-span-6 flex flex-col gap-md">
          {/* Command Bar / Create Post */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-md flex flex-col gap-md shadow-sm transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
            {isComposerOpen ? (
              <form onSubmit={handlePost} className="flex flex-col gap-sm">
                <input 
                  type="text" 
                  placeholder="Title of your discussion..." 
                  className="bg-surface border border-outline-variant/60 rounded-md p-sm text-body-md text-on-surface focus:outline-none focus:border-primary"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required minLength={5}
                />
                <select 
                  className="bg-surface border border-outline-variant/60 rounded-md p-sm text-body-md text-on-surface focus:outline-none focus:border-primary"
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
                  className="bg-surface border border-outline-variant/60 rounded-md p-sm text-body-md text-on-surface focus:outline-none focus:border-primary min-h-[100px] resize-y"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  required minLength={10}
                />
                <div className="flex justify-end gap-sm mt-2">
                  <button type="button" onClick={() => setIsComposerOpen(false)} className="px-md py-sm text-on-surface-variant hover:text-on-surface font-label-md">Cancel</button>
                  <button type="submit" disabled={posting} className="bg-primary text-on-primary-container px-md py-sm rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                    {posting ? <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
                    Post
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-md cursor-text" onClick={() => setIsComposerOpen(true)}>
                <div className="w-10 h-10 rounded-full bg-surface border border-outline-variant/60 flex items-center justify-center shrink-0">
                   <span className="material-symbols-outlined text-outline">person</span>
                </div>
                <div className="flex-1 bg-transparent border-none font-body-md text-on-surface-variant">Start a discussion, ask a question, or share an update...</div>
                <button className="bg-primary text-on-primary-container px-md py-sm rounded-lg font-label-md font-bold hover:brightness-110 ml-xs shadow-sm" onClick={(e) => {e.stopPropagation(); setIsComposerOpen(true);}}>
                    Post
                </button>
              </div>
            )}
          </div>

          {/* Feed Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm border-b border-outline-variant/40 pb-sm mb-xs">
            <div className="flex items-center gap-sm">
              <button className="flex items-center gap-xs px-sm py-xs text-on-surface font-label-sm font-bold border-b-2 border-primary -mb-[calc(0.5rem+2px)]">
                <span className="material-symbols-outlined text-[18px]">fiber_new</span> New
              </button>
              <button className="flex items-center gap-xs px-sm py-xs text-on-surface-variant hover:text-on-surface font-label-sm transition-colors">
                <span className="material-symbols-outlined text-[18px]">moving</span> Trending
              </button>
              <button className="flex items-center gap-xs px-sm py-xs text-on-surface-variant hover:text-on-surface font-label-sm transition-colors">
                <span className="material-symbols-outlined text-[18px]">verified</span> Top
              </button>
            </div>
            
            <div className="relative w-full sm:w-48">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-surface-container rounded-full py-1 pl-8 pr-3 border border-outline-variant/60 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Discussion Cards */}
          {error && (
            <div className="p-md rounded-lg bg-error/10 border border-error/30 text-error flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5">error</span>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-md">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-surface border border-outline-variant/60 rounded-xl p-md flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0 bg-surface-container" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4 bg-surface-container" />
                    <Skeleton className="h-6 w-3/4 bg-surface-container" />
                    <Skeleton className="h-4 w-full bg-surface-container" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-xl border border-outline-variant/60 rounded-xl bg-surface-container-low border-dashed">
                <span className="material-symbols-outlined text-[48px] text-outline opacity-40 mb-3">forum</span>
                <p className="font-headline-sm text-on-surface">No discussions found</p>
                <p className="font-body-sm text-on-surface-variant mt-1">Try a different search term or start a new post.</p>
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
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-lg lg:sticky lg:top-24">
          {/* Trending Topics */}
          <div className="bg-surface border border-outline-variant/60 rounded-xl p-md">
            <h3 className="font-label-md text-label-md font-bold text-on-surface mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-tertiary text-[18px]">trending_up</span> Trending Topics
            </h3>
            <div className="flex flex-col gap-sm">
              {[
                { topic: '#machine-learning', desc: 'Trending in AI Engineers', posts: '2.4k' },
                { topic: '#system-design', desc: 'Trending globally', posts: '1.8k' },
                { topic: '#career-advice', desc: 'Trending in General', posts: '956' },
              ].map((t, i) => (
                <a key={i} href="#" className="flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm font-mono text-on-surface group-hover:text-primary transition-colors">{t.topic}</span>
                    <span className="text-xs text-on-surface-variant">{t.desc}</span>
                  </div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant bg-surface-container px-xs py-[2px] rounded">{t.posts} posts</span>
                </a>
              ))}
            </div>
            <button className="w-full text-center mt-md font-label-sm text-label-sm text-primary hover:text-primary-fixed-dim transition-colors">Show all trends</button>
          </div>

          {/* Top Contributors */}
          <div className="bg-surface border border-outline-variant/60 rounded-xl p-md">
            <h3 className="font-label-md text-label-md font-bold text-on-surface mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary text-[18px]">workspace_premium</span> Top Contributors
            </h3>
            <div className="flex flex-col gap-sm">
              {[
                { name: 'Elena Rostova', pts: '14.2k', rank: 1, color: 'text-tertiary' },
                { name: 'Marcus Johnson', pts: '12.8k', rank: 2, color: 'text-on-surface-variant' },
                { name: 'Sarah Jenkins', pts: '9.4k', rank: 3, color: 'text-on-surface-variant' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-sm">
                  <div className={`w-6 text-center font-label-sm text-label-sm font-bold ${c.color}`}>{c.rank}</div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${c.rank === 1 ? 'border border-tertiary/50 bg-tertiary/10 text-tertiary' : 'bg-surface-container-high border border-outline-variant/40 text-on-surface'}`}>
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-sm text-label-sm text-on-surface truncate">{c.name}</p>
                  </div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant font-mono">{c.pts} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines Card */}
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-md">
            <h3 className="font-label-md text-label-md font-bold text-on-surface mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">gavel</span> Community Guidelines
            </h3>
            <p className="font-body-sm text-[13px] text-on-surface-variant mb-sm">
              Keep discussions respectful, technical, and constructive. No spam, self-promotion outside designated channels, or toxic behavior.
            </p>
            <a href="#" className="font-label-sm text-label-sm text-primary hover:underline">Read full rules &rarr;</a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
