import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, ThumbsUp, Search, Plus, Flame, Loader2,
  AlertCircle, ChevronDown, ChevronUp, Send, X, Wifi
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  doubt:         'bg-primary/15 text-primary border-primary/30',
  general:       'bg-chart-2/15 text-chart-2 border-chart-2/30',
  challenge:     'bg-chart-4/15 text-chart-4 border-chart-4/30',
  'study-group': 'bg-chart-3/15 text-chart-3 border-chart-3/30',
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
      .select('*, profiles!forum_replies_user_id_fkey(full_name, avatar_url)')
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

  // Subscribe to Realtime for this thread when expanded
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
          // Fetch author profile
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

  return (
    <Card className="bg-card border-border hover:border-primary/25 transition-all">
      <CardContent className="p-4">
        {/* Post header */}
        <div className="flex gap-3 items-start">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {initials(post.profiles?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <h4 className="font-semibold text-foreground text-sm text-balance flex-1 min-w-0 leading-snug">
                {post.is_pinned && <span className="text-chart-4 mr-1.5">📌</span>}
                {post.title}
              </h4>
              <Badge className={`text-[10px] shrink-0 capitalize border ${CAT_COLORS[post.category] ?? ''}`}>
                {post.category.replace('-', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2 text-pretty">{post.content}</p>

            {/* Post actions */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium text-foreground/80">{authorName}</span>
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              <button
                onClick={() => onVote(post)}
                className={`flex items-center gap-1 transition-colors ${post.user_voted ? 'text-primary font-semibold' : 'hover:text-primary'}`}
              >
                <ThumbsUp className={`w-3 h-3 ${post.user_voted ? 'fill-primary' : ''}`} />
                {post.upvotes}
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                {post.reply_count} {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Replies thread */}
        {expanded && (
          <div className="mt-4 ml-12 space-y-3 border-l-2 border-border pl-4">
            {loadingR ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading replies…
              </div>
            ) : replies.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No replies yet — be the first!</p>
            ) : (
              replies.map(reply => (
                <div key={reply.id} className="flex gap-2.5 items-start group">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="bg-chart-2/20 text-chart-2 text-[10px] font-bold">
                      {initials(reply.profiles?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 bg-muted/50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground">
                        {reply.profiles?.full_name ?? 'Community Member'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed text-pretty">{reply.content}</p>
                    <button
                      onClick={() => voteReply(reply)}
                      className={`flex items-center gap-1 mt-1.5 text-[10px] transition-colors ${reply.user_voted ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'}`}
                    >
                      <ThumbsUp className={`w-2.5 h-2.5 ${reply.user_voted ? 'fill-primary' : ''}`} />
                      {reply.upvotes}
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Reply composer */}
            {currentUserId ? (
              <div className="flex gap-2 items-end pt-1">
                <Textarea
                  placeholder="Write a reply…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
                  rows={1}
                  className="flex-1 bg-input border-border text-foreground text-xs resize-none min-h-[36px] max-h-[100px] py-2"
                />
                <Button
                  onClick={submitReply}
                  disabled={!replyText.trim() || posting}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 shrink-0"
                >
                  {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Log in to reply</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [realtimeOk, setRealtimeOk]     = useState(false);

  // ── Fetch posts with vote state ──────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('forum_posts')
        .select('*, profiles!forum_posts_user_id_fkey(full_name, avatar_url)')
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
    toast.success('Discussion posted!', { description: 'Your post is live — other students will see it in real time.' });
    setDialogOpen(false);
    setNewTitle(''); setNewContent(''); setNewCategory('general');
    // Realtime will add it; no manual re-fetch needed
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
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground text-balance">Community</h2>
            <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-1.5">
              Connect, collaborate, and learn together
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${realtimeOk ? 'bg-chart-3/10 text-chart-3 border-chart-3/30' : 'bg-muted text-muted-foreground border-border'}`}>
                <Wifi className="w-2.5 h-2.5" />
                {realtimeOk ? 'Live' : 'Connecting…'}
              </span>
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground">Start a Discussion</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePost} className="space-y-4 mt-2">
                <Input
                  placeholder="Title (5–300 characters)"
                  className="bg-input border-border text-foreground"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required minLength={5} maxLength={300}
                />
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="doubt">Doubt</SelectItem>
                    <SelectItem value="challenge">Challenge</SelectItem>
                    <SelectItem value="study-group">Study Group</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Share your thoughts, questions, or insights…"
                  className="bg-input border-border text-foreground resize-none"
                  rows={4}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  required minLength={10} maxLength={10000}
                />
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}
                    className="border border-border text-foreground hover:bg-accent">
                    <X className="w-4 h-4 mr-1.5" /> Cancel
                  </Button>
                  <Button type="submit" disabled={posting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {posting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting…</> : 'Post'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: MessageSquare, label: 'Discussions',   value: posts.length,                                                              color: 'text-primary',  bg: 'bg-primary/10' },
            { icon: ThumbsUp,      label: 'Total Upvotes', value: posts.reduce((s, p) => s + p.upvotes, 0),                                  color: 'text-chart-2',  bg: 'bg-chart-2/10' },
            { icon: Flame,         label: 'This Month',    value: posts.filter(p => new Date(p.created_at) > new Date(Date.now() - 30*86400000)).length, color: 'text-chart-4', bg: 'bg-chart-4/10' },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border h-full">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold text-foreground">{loading ? '—' : s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search discussions…"
              className="pl-10 bg-input border-border text-foreground"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="w-full md:w-44 bg-input border-border text-foreground">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="doubt">Doubt</SelectItem>
              <SelectItem value="challenge">Challenge</SelectItem>
              <SelectItem value="study-group">Study Group</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* ── Posts list ── */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-9 h-9 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-muted" />
                      <Skeleton className="h-3 w-full bg-muted" />
                      <Skeleton className="h-3 w-1/2 bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-foreground text-balance">No discussions found</p>
              <p className="text-sm mt-1 text-pretty">
                {search ? 'Try a different search term.' : 'Be the first to start a conversation!'}
              </p>
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
    </AppLayout>
  );
}
