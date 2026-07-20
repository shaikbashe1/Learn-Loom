import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Loading } from '@/components/ui/loading';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { MarkdownToolbar } from '@/components/shared/MarkdownToolbar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { renderMarkdown } from '@/lib/markdown';
import { 
  MessageSquare, 
  HelpCircle, 
  Code, 
  Users, 
  ThumbsUp, 
  Heart, 
  Lightbulb, 
  Sparkles, 
  PartyPopper, 
  Bot, 
  CheckCircle2, 
  Reply as ReplyIcon, 
  X, 
  Globe, 
  MoreHorizontal, 
  FileText, 
  Share2, 
  RefreshCw, 
  User, 
  Send, 
  Search, 
  ChevronDown, 
  AlertTriangle, 
  Flame, 
  Award, 
  Plus, 
  Image as ImageIcon,
  ArrowLeft
} from 'lucide-react';

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
  user_reaction?: string | null;
  author_is_followed?: boolean;
  media?: { file_url: string; file_type: string }[];
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
  children?: ForumReply[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CAT_DETAILS: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  doubt:       { label: 'Doubt', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: HelpCircle },
  general:     { label: 'General', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: MessageSquare },
  challenge:   { label: 'Challenge', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', icon: Code },
  'study-group': { label: 'Study Group', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: Users },
};

const REACTIONS: Record<string, { icon: React.ComponentType<any>; label: string; color: string; bg: string }> = {
  like: { icon: ThumbsUp, label: 'Like', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  love: { icon: Heart, label: 'Love', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  inspiring: { icon: Lightbulb, label: 'Inspiring', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  helpful: { icon: Sparkles, label: 'Helpful', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  congratulations: { icon: PartyPopper, label: 'Congrats', color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

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

// ── ReplyNode (Recursive Comment Tree) ────────────────────────────────────────

function ReplyNode({ 
  reply, 
  postUserId, 
  currentUserId, 
  onVoteReply, 
  onAcceptReply, 
  onReplyTo 
}: { 
  reply: ForumReply; 
  postUserId: string; 
  currentUserId: string | undefined; 
  onVoteReply: (reply: ForumReply) => void; 
  onAcceptReply: (reply: ForumReply) => void; 
  onReplyTo: (reply: ForumReply) => void; 
}) {
  const isThreadAuthor = postUserId === currentUserId;

  return (
    <div className="flex gap-2.5 items-start mt-4">
      {reply.is_ai ? (
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/20">
          <Bot className="w-4 h-4 animate-pulse" />
        </div>
      ) : (
        <UserAvatar src={reply.profiles?.avatar_url} name={reply.profiles?.full_name || ''} size="sm" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className={cn(
          "border rounded-r-xl rounded-bl-xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm relative group/reply",
          reply.is_ai ? 'bg-primary/5 border-primary/15' : 'bg-muted/30 border-border'
        )}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] sm:text-xs font-bold text-foreground">
                  {reply.is_ai ? 'Loomie AI' : reply.profiles?.full_name ?? 'Community Member'}
                </span>
                {reply.is_ai && <span className="bg-primary/20 text-primary text-[8px] font-bold px-1 rounded uppercase tracking-wider">Bot</span>}
                {reply.is_accepted && (
                  <span className="text-emerald-500 font-bold text-[10px] flex items-center gap-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                  </span>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover/reply:opacity-100 transition-opacity">
              {isThreadAuthor && !reply.is_ai && (
                <button 
                  onClick={() => onAcceptReply(reply)}
                  className={cn(
                    "p-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                    reply.is_accepted 
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                      : 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 border-border'
                  )}
                  title={reply.is_accepted ? "Revoke acceptance" : "Accept this answer"}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
              {currentUserId && (
                <button 
                  onClick={() => onReplyTo(reply)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                  title="Reply to this comment"
                >
                  <ReplyIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed">
            {renderMarkdown(reply.content)}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1.5 ml-2">
          <button 
            onClick={() => onVoteReply(reply)}
            className={cn(
              "flex items-center gap-1 text-[10px] font-bold transition-all",
              reply.user_voted ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <ThumbsUp className={cn("w-3 h-3", reply.user_voted && "fill-primary")} />
            {reply.upvotes}
          </button>
        </div>

        {/* Nested Replies */}
        {reply.children && reply.children.length > 0 && (
          <div className="border-l-2 border-border/50 pl-3.5 ml-1">
            {reply.children.map(child => (
              <ReplyNode 
                key={child.id} 
                reply={child} 
                postUserId={postUserId} 
                currentUserId={currentUserId}
                onVoteReply={onVoteReply}
                onAcceptReply={onAcceptReply}
                onReplyTo={onReplyTo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main CommunityPage Component ──────────────────────────────────────────────

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  // Selected Post Details
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyMode, setReplyMode] = useState<'write' | 'preview'>('write');
  const [replyPosting, setReplyPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ForumReply | null>(null);

  // New Post Modal
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('doubt');
  const [newTags, setNewTags] = useState('');
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);

  // AI Summary
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const mainComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const replyComposerRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch Posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'forum_posts'));
      let postList: ForumPost[] = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ForumPost));

      if (categoryFilter !== 'all') {
        postList = postList.filter(p => p.category === categoryFilter);
      }

      if (sortBy === 'latest') {
        postList.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
      } else {
        postList.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return (b.upvotes || 0) - (a.upvotes || 0);
        });
      }

      if (search.trim()) {
        const s = search.toLowerCase();
        postList = postList.filter(p => 
          p.title.toLowerCase().includes(s) || 
          p.content.toLowerCase().includes(s) ||
          p.tags.some(t => t.toLowerCase().includes(s))
        );
      }

      // Load Author Profiles & Votes
      if (postList.length > 0) {
        const uids = Array.from(new Set(postList.map(p => p.user_id)));
        const profilesSnap = await getDocs(collection(db, 'profiles'));
        const pMap = new Map();
        profilesSnap.docs.forEach(d => {
          if (uids.includes(d.id)) {
            pMap.set(d.id, { id: d.id, ...d.data() });
          }
        });

        // Load votes if logged in
        let votedPostIds = new Set<string>();
        let reactionMap = new Map<string, string>();
        let followedAuthors = new Set<string>();

        if (user) {
          const votesSnap = await getDocs(query(collection(db, 'forum_post_votes'), where('user_id', '==', user.id)));
          votesSnap.forEach(d => {
            const data = d.data();
            votedPostIds.add(data.post_id);
            if (data.reaction_type) reactionMap.set(data.post_id, data.reaction_type);
          });

          const followsSnap = await getDocs(query(collection(db, 'user_followers'), where('follower_id', '==', user.id)));
          followsSnap.forEach(d => followedAuthors.add(d.data().following_id));
        }

        postList = postList.map(p => ({
          ...p,
          profiles: pMap.get(p.user_id),
          user_voted: votedPostIds.has(p.id),
          user_reaction: reactionMap.get(p.id) || null,
          author_is_followed: followedAuthors.has(p.user_id)
        }));
      }

      setPosts(postList);
    } catch (err: any) {
      toast.error('Failed to load community feed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, sortBy, search, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Load Replies for Selected Post
  const loadReplies = async (postId: string) => {
    setLoadingReplies(true);
    setAiSummary(null);
    try {
      const rSnap = await getDocs(query(collection(db, 'forum_replies'), where('post_id', '==', postId)));
      let replyList: ForumReply[] = rSnap.docs.map(d => ({ id: d.id, ...d.data() } as ForumReply));
      replyList.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

      if (replyList.length > 0) {
        const uids = Array.from(new Set(replyList.map(r => r.user_id)));
        const profilesSnap = await getDocs(collection(db, 'profiles'));
        const pMap = new Map();
        profilesSnap.docs.forEach(d => {
          if (uids.includes(d.id)) {
            pMap.set(d.id, { id: d.id, ...d.data() });
          }
        });

        let votedReplyIds = new Set<string>();
        if (user) {
          const rVotesSnap = await getDocs(query(collection(db, 'forum_reply_votes'), where('user_id', '==', user.id)));
          rVotesSnap.forEach(v => votedReplyIds.add(v.data().reply_id));
        }

        replyList = replyList.map(r => ({
          ...r,
          profiles: pMap.get(r.user_id),
          user_voted: votedReplyIds.has(r.id)
        }));

        // Reconstruct Tree Structure
        const tree: ForumReply[] = [];
        const rMap = new Map<string, ForumReply & { children: ForumReply[] }>();
        
        replyList.forEach(r => {
          rMap.set(r.id, { ...r, children: [] });
        });

        replyList.forEach(r => {
          const node = rMap.get(r.id)!;
          if (r.parent_id) {
            const parent = rMap.get(r.parent_id);
            if (parent) parent.children.push(node);
            else tree.push(node);
          } else {
            tree.push(node);
          }
        });

        setReplies(tree);
      } else {
        setReplies([]);
      }
    } catch (err: any) {
      toast.error('Failed to load comments: ' + err.message);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSelectPost = (post: ForumPost) => {
    setSelectedPost(post);
    loadReplies(post.id);
  };

  // Follow/Unfollow Author
  const handleFollowAuthor = async (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error('Please log in first.'); return; }
    const isFollowing = post.author_is_followed;

    try {
      if (isFollowing) {
        const fSnap = await getDocs(query(collection(db, 'user_followers'), where('follower_id', '==', user.id), where('following_id', '==', post.user_id)));
        for (const d of fSnap.docs) {
          await deleteDoc(d.ref);
        }
        toast.success(`Unfollowed ${post.profiles?.full_name}`);
      } else {
        await addDoc(collection(db, 'user_followers'), { follower_id: user.id, following_id: post.user_id });
        toast.success(`Following ${post.profiles?.full_name}`);
      }
      setPosts(prev => prev.map(p => p.user_id === post.user_id ? { ...p, author_is_followed: !isFollowing } : p));
      if (selectedPost && selectedPost.user_id === post.user_id) {
        setSelectedPost(prev => prev ? { ...prev, author_is_followed: !isFollowing } : null);
      }
    } catch (err) {
      toast.error('Follow action failed.');
    }
  };

  // Vote Post
  const handleVotePost = async (post: ForumPost, reactionType: string = 'like') => {
    if (!user) { toast.error('Please log in first.'); return; }
    
    const hasVoted = post.user_voted;
    const sameReaction = post.user_reaction === reactionType;

    try {
      if (hasVoted && sameReaction) {
        // Remove Vote
        const vSnap = await getDocs(query(collection(db, 'forum_post_votes'), where('post_id', '==', post.id), where('user_id', '==', user.id)));
        for (const docSnap of vSnap.docs) {
          await deleteDoc(docSnap.ref);
        }
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, upvotes: p.upvotes - 1, user_voted: false, user_reaction: null } : p));
        if (selectedPost?.id === post.id) {
          setSelectedPost(prev => prev ? { ...prev, upvotes: prev.upvotes - 1, user_voted: false, user_reaction: null } : null);
        }
      } else {
        // Upsert Vote
        const vSnap = await getDocs(query(collection(db, 'forum_post_votes'), where('post_id', '==', post.id), where('user_id', '==', user.id)));
        for (const docSnap of vSnap.docs) {
          await deleteDoc(docSnap.ref);
        }
        await addDoc(collection(db, 'forum_post_votes'), {
          post_id: post.id,
          user_id: user.id,
          reaction_type: reactionType
        });

        const diff = hasVoted ? 0 : 1;
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, upvotes: p.upvotes + diff, user_voted: true, user_reaction: reactionType } : p));
        if (selectedPost?.id === post.id) {
          setSelectedPost(prev => prev ? { ...prev, upvotes: prev.upvotes + diff, user_voted: true, user_reaction: reactionType } : null);
        }
      }
    } catch (err) {
      toast.error('Failed to record reaction.');
    }
  };

  // Vote Reply
  const handleVoteReply = async (reply: ForumReply) => {
    if (!user) { toast.error('Please log in first.'); return; }
    const hasVoted = reply.user_voted;

    try {
      if (hasVoted) {
        const vSnap = await getDocs(query(collection(db, 'forum_reply_votes'), where('reply_id', '==', reply.id), where('user_id', '==', user.id)));
        for (const docSnap of vSnap.docs) {
          await deleteDoc(docSnap.ref);
        }
        toast.success('Vote removed');
      } else {
        await addDoc(collection(db, 'forum_reply_votes'), { reply_id: reply.id, user_id: user.id });
        toast.success('Vote recorded');
      }
      
      const updateTree = (list: ForumReply[]): ForumReply[] => {
        return list.map(r => {
          if (r.id === reply.id) {
            return { ...r, upvotes: r.upvotes + (hasVoted ? -1 : 1), user_voted: !hasVoted };
          }
          if (r.children) {
            return { ...r, children: updateTree(r.children) };
          }
          return r;
        });
      };
      setReplies(prev => updateTree(prev));
    } catch (err) {
      toast.error('Failed to record comment vote.');
    }
  };

  // Accept Reply
  const handleAcceptReply = async (reply: ForumReply) => {
    if (!user || !selectedPost) return;
    if (selectedPost.user_id !== user.id) return; // Only thread author can accept

    const nextState = !reply.is_accepted;

    try {
      await updateDoc(doc(db, 'forum_replies', reply.id), { is_accepted: nextState });

      toast.success(nextState ? 'Answer marked as accepted!' : 'Answer unaccepted');
      
      const updateTree = (list: ForumReply[]): ForumReply[] => {
        return list.map(r => {
          if (r.id === reply.id) return { ...r, is_accepted: nextState };
          if (r.children) return { ...r, children: updateTree(r.children) };
          return r;
        });
      };
      setReplies(prev => updateTree(prev));
    } catch (err: any) {
      toast.error('Failed to accept reply: ' + err.message);
    }
  };

  // Loomie AI thread responder stream helper
  const triggerLoomieAI = async (postId: string, title: string, content: string, isReply: boolean = false, userQuery: string = '') => {
    try {
      const flatReplies: ForumReply[] = [];
      const flatten = (list: ForumReply[]) => {
        list.forEach(r => {
          flatReplies.push(r);
          if (r.children) flatten(r.children);
        });
      };
      flatten(replies);

      const threadContext = isReply 
        ? flatReplies.slice(-5).map(r => `${r.profiles?.full_name ?? 'User'}: ${r.content}`).join('\n')
        : '';
        
      const systemPrompt = `You are Loomie AI, the friendly and knowledgeable AI mentor on the Quovexi educational platform. A student has posted a question in the community discussions. Provide a clean, helpful, and structured response using Markdown.
      
Community Context:
Post Title: "${title}"
Post Content: "${content}"
${isReply ? `Previous replies:\n${threadContext}\n\nStudent query: "${userQuery}"` : ''}`;

      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

      const token = '';

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

      // Create a temporary AI reply placeholder in tree
      const tempId = 'ai-temp';
      const tempReply: ForumReply = {
        id: tempId,
        post_id: postId,
        parent_id: replyingTo?.id || null,
        user_id: 'ai',
        content: 'Formulating response...',
        upvotes: 0,
        created_at: new Date().toISOString(),
        is_ai: true,
        profiles: { full_name: 'Loomie AI', avatar_url: null, bio: 'AI Mentor' }
      };

      const addReplyToTree = (list: ForumReply[], parentId: string | null, node: ForumReply): ForumReply[] => {
        if (!parentId) return [...list, node];
        return list.map(r => {
          if (r.id === parentId) return { ...r, children: [...(r.children || []), node] };
          if (r.children) return { ...r, children: addReplyToTree(r.children, parentId, node) };
          return r;
        });
      };

      setReplies(prev => addReplyToTree(prev, replyingTo?.id || null, tempReply));

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

        const updateContentInTree = (list: ForumReply[]): ForumReply[] => {
          return list.map(r => {
            if (r.id === tempId) return { ...r, content: aiText };
            if (r.children) return { ...r, children: updateContentInTree(r.children) };
            return r;
          });
        };
        setReplies(prev => updateContentInTree(prev));
      }

      // Save AI reply to DB
      const docRef = await addDoc(collection(db, 'forum_replies'), {
        post_id: postId,
        parent_id: replyingTo?.id || null,
        user_id: '00000000-0000-0000-0000-000000000000', // AI system user ID
        content: aiText,
        is_ai: true,
        created_at: new Date().toISOString()
      });
      const savedAI = { id: docRef.id, created_at: new Date().toISOString() };

      if (savedAI) {
        const replaceTempInTree = (list: ForumReply[]): ForumReply[] => {
          return list.map(r => {
            if (r.id === tempId) return { ...r, id: savedAI.id, created_at: savedAI.created_at };
            if (r.children) return { ...r, children: replaceTempInTree(r.children) };
            return r;
          });
        };
        setReplies(prev => replaceTempInTree(prev));
      }
    } catch (err) {
      console.error('Loomie AI trigger failed:', err);
    }
  };

  // Submit Reply
  const handleSubmitReply = async () => {
    if (!user || !selectedPost) return;
    if (!replyText.trim()) { toast.error('Reply cannot be empty'); return; }

    setReplyPosting(true);
    const contentToSend = replyText.trim();

    try {
      const docRef = await addDoc(collection(db, 'forum_replies'), {
        post_id: selectedPost.id,
        parent_id: replyingTo?.id || null,
        user_id: user.id,
        content: contentToSend,
        is_ai: false,
        created_at: new Date().toISOString()
      });
      const data = [{ id: docRef.id, post_id: selectedPost.id, parent_id: replyingTo?.id || null, user_id: user.id, content: contentToSend, is_ai: false, created_at: new Date().toISOString() }];

      toast.success('Comment posted successfully');
      setReplyText('');
      setReplyMode('write');
      
      const newReply: ForumReply = {
        ...data[0],
        profiles: { full_name: user.email, avatar_url: null, bio: null },
        user_voted: false
      };

      const addReplyToTree = (list: ForumReply[], parentId: string | null, node: ForumReply): ForumReply[] => {
        if (!parentId) return [...list, node];
        return list.map(r => {
          if (r.id === parentId) return { ...r, children: [...(r.children || []), node] };
          if (r.children) return { ...r, children: addReplyToTree(r.children, parentId, node) };
          return r;
        });
      };

      setReplies(prev => addReplyToTree(prev, replyingTo?.id || null, newReply));
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, reply_count: p.reply_count + 1 } : p));
      setSelectedPost(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : null);

      setReplyingTo(null);

      // Trigger AI if query mentions @loomie
      if (contentToSend.toLowerCase().includes('@loomie')) {
        toast.info('Loomie AI is formulating a response...');
        await triggerLoomieAI(selectedPost.id, selectedPost.title, selectedPost.content, true, contentToSend);
      }
    } catch (err: any) {
      toast.error('Failed to post reply: ' + err.message);
    } finally {
      setReplyPosting(false);
    }
  };

  // Submit Post
  const handleCreatePost = async () => {
    if (!user) return;
    if (!newTitle.trim() || !newContent.trim()) { toast.error('Please fill in both title and content.'); return; }

    setPosting(true);

    try {
      const tagList = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const mediaList: { file_url: string; file_type: string }[] = [];

      // Upload Media
      for (const file of newMediaFiles) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const storageRef = ref(storage, `forum_attachments/${path}`);
        await uploadBytes(storageRef, file);
        const file_url = await getDownloadURL(storageRef);
        mediaList.push({ file_url, file_type: file.type.startsWith('image/') ? 'image' : 'document' });
      }

      const postDocRef = await addDoc(collection(db, 'forum_posts'), {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        tags: tagList,
        user_id: user.id,
        media: mediaList,
        created_at: new Date().toISOString(),
        upvotes: 0,
        reply_count: 0
      });
      const data = [{ id: postDocRef.id, title: newTitle.trim(), content: newContent.trim() }];

      toast.success('Post created successfully!');
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setNewMediaFiles([]);
      setComposerOpen(false);
      fetchPosts();

      // Trigger AI if post mentions @loomie
      const insertedPost = data?.[0];
      if (insertedPost && (newTitle.toLowerCase().includes('@loomie') || newContent.toLowerCase().includes('@loomie'))) {
        toast.info('Loomie AI is formulating a response...');
        await triggerLoomieAI(insertedPost.id, insertedPost.title, insertedPost.content);
      }
    } catch (err: any) {
      toast.error('Failed to create post: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  // AI Summary Generator
  const generateAISummary = async () => {
    if (!selectedPost) return;
    setLoadingSummary(true);
    try {
      const flatReplies: ForumReply[] = [];
      const flatten = (list: ForumReply[]) => {
        list.forEach(r => {
          flatReplies.push(r);
          if (r.children) flatten(r.children);
        });
      };
      flatten(replies);

      const threadContext = flatReplies.map(r => `${r.profiles?.full_name ?? 'User'}: ${r.content}`).join('\n');
      const systemPrompt = `Analyze this Q&A forum thread. Provide a concise, bulleted TL;DR summary of the main discussion, key solutions proposed, and whether a consensus was reached. Use clean Markdown.
      
Post Title: "${selectedPost.title}"
Post Content: "${selectedPost.content}"
Replies:
${threadContext}`;

      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

      const token = '';

      const res = await fetch('/api/ai-mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contents }),
      });

      if (!res.ok) throw new Error('AI Summary request failed');
      const json = await res.json();
      setAiSummary(json?.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated.');
    } catch (err: any) {
      toast.error('Failed to generate summary: ' + err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg w-full flex flex-col lg:flex-row gap-gutter">
        
        {/* LEFT COLUMN: Main Feed or Selected Thread Details */}
        <section className="flex-1 min-w-0 space-y-6">
          
          {selectedPost ? (
            /* DETAILED THREAD VIEW */
            <div className="space-y-6">
              <button 
                onClick={() => setSelectedPost(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors select-none mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Feed
              </button>

              <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar src={selectedPost.profiles?.avatar_url} name={selectedPost.profiles?.full_name || ''} size="md" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-none">{selectedPost.profiles?.full_name ?? 'Community Member'}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(selectedPost.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 select-none">
                    {user && selectedPost.user_id !== user.id && (
                      <button 
                        onClick={(e) => void handleFollowAuthor(selectedPost, e)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                          selectedPost.author_is_followed 
                            ? 'bg-muted text-muted-foreground border-border' 
                            : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                        )}
                      >
                        {selectedPost.author_is_followed ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const CatIcon = CAT_DETAILS[selectedPost.category]?.icon || MessageSquare;
                      return (
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 uppercase tracking-wider", CAT_DETAILS[selectedPost.category]?.color)}>
                          <CatIcon className="w-3 h-3" />
                          {CAT_DETAILS[selectedPost.category]?.label || 'General'}
                        </span>
                      );
                    })()}
                    {selectedPost.tags.map(t => (
                      <span key={t} className="bg-muted text-muted-foreground border border-border text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">#{t}</span>
                    ))}
                  </div>

                  <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight leading-tight">{selectedPost.title}</h1>
                  
                  <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {renderMarkdown(selectedPost.content)}
                  </div>

                  {/* Media Attachments */}
                  {selectedPost.media && selectedPost.media.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/40">
                      {selectedPost.media.map((file, idx) => (
                        <div key={idx} className="border border-border rounded-xl overflow-hidden shadow-inner bg-muted/25 relative group max-w-sm">
                          {file.file_type === 'image' ? (
                            <img src={file.file_url} alt="Attachment" className="w-full h-auto max-h-48 object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                          ) : (
                            <a href={file.file_url} target="_blank" rel="noreferrer" className="p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors">
                              <FileText className="text-destructive w-8 h-8 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">Download Attachment</p>
                                <p className="text-[10px] text-muted-foreground font-semibold">Document File</p>
                              </div>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-border/40 select-none flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleVotePost(selectedPost)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold",
                        selectedPost.user_voted 
                          ? 'bg-primary/10 text-primary border-primary/25' 
                          : 'bg-card text-muted-foreground border-border hover:text-primary hover:border-primary/20'
                      )}
                    >
                      <ThumbsUp className={cn("w-4 h-4", selectedPost.user_voted && "fill-primary")} />
                      {selectedPost.upvotes}
                    </button>

                    <button 
                      onClick={generateAISummary}
                      disabled={loadingSummary}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/20 transition-all text-xs font-bold bg-card"
                    >
                      <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      {loadingSummary ? 'Summarizing...' : 'AI Summary'}
                    </button>
                  </div>

                  <div className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                    <MessageSquare size={14} /> {selectedPost.reply_count} Responses
                  </div>
                </div>

                {/* AI Summary Panel */}
                {aiSummary && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <Bot className="w-4.5 h-4.5 animate-pulse" /> Loomie AI Thread Summary
                    </div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                      {renderMarkdown(aiSummary)}
                    </div>
                  </div>
                )}
              </div>

              {/* Thread Comments Board */}
              <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 select-none">
                  Discussion Comments
                </h3>

                {loadingReplies ? (
                  <div className="flex justify-center py-10">
                    <Loading variant="spinner" size="md" />
                  </div>
                ) : replies.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6 select-none">No responses yet. Start the conversation!</p>
                ) : (
                  <div className="space-y-4">
                    {replies.map(reply => (
                      <ReplyNode 
                        key={reply.id} 
                        reply={reply} 
                        postUserId={selectedPost.id} 
                        currentUserId={user?.id}
                        onVoteReply={handleVoteReply}
                        onAcceptReply={handleAcceptReply}
                        onReplyTo={setReplyingTo}
                      />
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {user && (
                  <div className="border-t border-border/40 pt-6 space-y-4">
                    {replyingTo && (
                      <div className="flex justify-between items-center bg-primary/5 border border-primary/10 rounded-xl p-3 text-xs animate-fade-in select-none">
                        <span className="text-primary font-semibold">
                          Replying to <strong>@{replyingTo.profiles?.full_name ?? 'user'}</strong>
                        </span>
                        <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <MarkdownToolbar 
                        textareaRef={replyComposerRef.current} 
                        textValue={replyText} 
                        setValue={setReplyText} 
                      />

                      <div className="flex gap-2 justify-end mb-1 select-none">
                        <button
                          type="button"
                          onClick={() => setReplyMode('write')}
                          className={cn("px-2 py-0.5 rounded text-[10px] font-bold", replyMode === 'write' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
                        >
                          Write
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyMode('preview')}
                          className={cn("px-2 py-0.5 rounded text-[10px] font-bold", replyMode === 'preview' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
                        >
                          Preview
                        </button>
                      </div>

                      {replyMode === 'write' ? (
                        <textarea
                          ref={replyComposerRef}
                          placeholder="Type your reply (markdown supported, use @loomie for AI help)..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          className="w-full bg-muted/20 border border-border rounded-b-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary min-h-[80px] resize-none"
                        />
                      ) : (
                        <div className="w-full bg-muted/10 border border-border rounded-b-xl p-3 text-xs text-muted-foreground min-h-[80px] leading-relaxed shadow-sm">
                          {replyText.trim() ? renderMarkdown(replyText) : <span className="italic text-muted-foreground">Nothing to preview.</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end select-none">
                      <button 
                        onClick={() => void handleSubmitReply()}
                        disabled={replyPosting || !replyText.trim()}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[38px] flex items-center gap-1.5 shadow-sm"
                      >
                        {replyPosting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Post Comment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* FEED LIST VIEW */
            <div className="space-y-4">
              
              {/* Header Control panel */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm select-none">
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide py-1">
                  {['all', 'doubt', 'general', 'challenge', 'study-group'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all shrink-0",
                        categoryFilter === cat 
                          ? 'bg-primary/10 text-primary border-primary/20 font-bold' 
                          : 'bg-card text-muted-foreground border-border hover:border-primary/20'
                      )}
                    >
                      {cat === 'all' ? 'All Feed' : CAT_DETAILS[cat]?.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search feed..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary w-full sm:w-48"
                    />
                  </div>

                  <select 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-card border border-border rounded-xl text-xs text-foreground py-1.5 px-3 focus:outline-none focus:border-primary font-semibold cursor-pointer"
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Popular</option>
                  </select>
                </div>
              </div>

              {/* Feed List Cards */}
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Loading key={i} variant="skeleton" className="h-32 w-full rounded-2xl" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card text-muted-foreground select-none">
                  <MessageSquare className="w-12 h-12 opacity-30 mx-auto mb-4" />
                  <p className="text-sm font-bold text-foreground">No posts found in feed</p>
                  <p className="text-xs mt-1 max-w-xs mx-auto leading-normal">Try adjusting your filters, searching for something else, or creating a new post.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map(post => {
                    const CatIcon = CAT_DETAILS[post.category]?.icon || MessageSquare;
                    return (
                      <div 
                        key={post.id}
                        onClick={() => handleSelectPost(post)}
                        className="bg-card border border-border hover:border-primary/25 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col gap-3 group"
                      >
                        <div className="flex items-center justify-between gap-4 select-none">
                          <div className="flex items-center gap-3">
                            <UserAvatar src={post.profiles?.avatar_url} name={post.profiles?.full_name || ''} size="sm" />
                            <div>
                              <h5 className="text-xs font-bold text-foreground leading-none group-hover:text-primary transition-colors">{post.profiles?.full_name ?? 'Community Member'}</h5>
                              <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {post.is_pinned && (
                              <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[8px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Pinned</span>
                            )}
                            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 uppercase tracking-wider", CAT_DETAILS[post.category]?.color)}>
                              <CatIcon className="w-3 h-3" />
                              {CAT_DETAILS[post.category]?.label}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">{post.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {stripMarkdown(post.content)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/40 select-none flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                              <ThumbsUp className="w-3.5 h-3.5 text-primary" /> {post.upvotes} Upvotes
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-chart-4" /> {post.reply_count} Replies
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {post.tags.slice(0, 3).map(t => (
                              <span key={t} className="bg-muted text-muted-foreground border border-border text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">#{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Sidebar (Compose trigger, guidelines, hot topics) */}
        <aside className="w-full lg:w-[320px] shrink-0 space-y-6">
          
          {/* Ask a Question CTA */}
          {user && !selectedPost && (
            <button 
              onClick={() => setComposerOpen(true)}
              className="w-full bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs py-3.5 rounded-2xl transition-all shadow-md flex justify-center items-center gap-2 select-none min-h-[44px]"
            >
              <Plus className="w-4.5 h-4.5" /> Start a Discussion
            </button>
          )}

          {/* Discussion Guidelines */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 select-none">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Community Rules
            </h4>
            <ul className="space-y-2.5 text-[11px] text-muted-foreground leading-relaxed">
              <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Be polite and supportive to peers.</li>
              <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Keep questions clear and descriptive.</li>
              <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Paste error logs or code in code blocks.</li>
              <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Mention @loomie for automated AI help.</li>
            </ul>
          </div>

          {/* Hot Topics / Tags */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 select-none">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-chart-3" /> Trending Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {['react', 'typescript', 'firebase', 'nextjs', 'tailwind', 'ai-agents', 'graphql'].map(t => (
                <button 
                  key={t}
                  onClick={() => { setSearch(t); setSelectedPost(null); }}
                  className="bg-muted hover:bg-primary/10 hover:text-primary hover:border-primary/25 border border-border text-muted-foreground text-[10px] font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all"
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>

          {/* Top Contributors */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 select-none">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-primary" /> Top Contributors
            </h4>
            <div className="space-y-3.5">
              {[
                { name: 'Yogesh K.', xp: '14,250 XP', avatar: null },
                { name: 'Alex M.', xp: '11,800 XP', avatar: null },
                { name: 'Sarah T.', xp: '9,450 XP', avatar: null },
              ].map((c, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar src={c.avatar} name={c.name} size="sm" />
                    <div>
                      <h5 className="text-[11px] font-bold text-foreground leading-none">{c.name}</h5>
                      <span className="text-[9px] text-muted-foreground mt-0.5 inline-block">{c.xp}</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-primary">#{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* NEW POST DIALOG MODAL */}
        {composerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm select-none">
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-5 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Start a Discussion</h3>
                <button onClick={() => setComposerOpen(false)} className="text-muted-foreground hover:text-destructive transition-colors rounded-xl p-1"><X className="w-4.5 h-4.5" /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                  <input 
                    type="text" 
                    placeholder="Enter a descriptive title..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary shadow-inner"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                    <select 
                      value={newCategory} 
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full bg-muted/35 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary font-semibold cursor-pointer"
                    >
                      <option value="doubt">Doubt / Question</option>
                      <option value="general">General Discussion</option>
                      <option value="challenge">Challenge / Coding Task</option>
                      <option value="study-group">Study Group Collaboration</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tags (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="react, ts, bug" 
                      value={newTags}
                      onChange={e => setNewTags(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Content</label>
                  <MarkdownToolbar 
                    textareaRef={mainComposerRef.current} 
                    textValue={newContent} 
                    setValue={setNewContent} 
                  />
                  <textarea
                    ref={mainComposerRef}
                    placeholder="Write details here (markdown supported, mention @loomie for AI helper)..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-b-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary min-h-[150px] resize-none"
                    required
                  />
                </div>

                {/* Upload Media Files */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Attachments</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-border hover:border-primary hover:bg-primary/5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-primary cursor-pointer transition-all">
                      <ImageIcon className="w-4 h-4" /> Upload Files
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*,.pdf,.zip" 
                        onChange={e => e.target.files && setNewMediaFiles(Array.from(e.target.files))} 
                        className="hidden" 
                      />
                    </label>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {newMediaFiles.length} files selected
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setComposerOpen(false)}
                  className="px-4 py-2 bg-muted/40 border border-border text-foreground hover:bg-muted rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => void handleCreatePost()}
                  disabled={posting || !newTitle.trim() || !newContent.trim()}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[38px] flex items-center gap-1.5 shadow-sm"
                >
                  {posting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish Post
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </AppLayout>
  );
}
