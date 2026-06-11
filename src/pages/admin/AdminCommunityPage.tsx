import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { EyeOff, Eye, Trash2, MessageSquare, RefreshCw } from 'lucide-react';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  is_hidden: boolean;
  reply_count: number;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        id, title, content, category, reply_count, created_at, is_hidden,
        profiles!forum_posts_user_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load forum posts');
      console.error(error);
    } else {
      // Supabase join syntax gives an array or object depending on relation, here it's object or null.
      setPosts((data as any[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const toggleHide = async (id: string, currentHidden: boolean) => {
    const { error } = await supabase.from('forum_posts').update({ is_hidden: !currentHidden }).eq('id', id);
    if (error) {
      toast.error('Failed to update post visibility');
    } else {
      toast.success(currentHidden ? 'Post is now visible' : 'Post hidden from students');
      setPosts(posts.map(p => p.id === id ? { ...p, is_hidden: !currentHidden } : p));
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this post?')) return;
    const { error } = await supabase.from('forum_posts').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete post');
    } else {
      toast.success('Post deleted');
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  return (
    <AppLayout title="Community Moderation" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        {/* Header & Top Level Stats */}
        <header className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h1 className="font-display text-display text-on-surface">Community Moderation</h1>
            <p className="text-on-surface-variant text-body-lg mt-xs">Monitor forum health and maintain platform standards.</p>
          </div>
          <div className="flex gap-sm">
            <Button variant="ghost" size="sm" onClick={fetchPosts} className="border border-outline-variant text-on-surface hover:bg-surface-variant h-11 w-11 rounded-xl">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="glass-panel px-lg py-sm rounded-xl text-center min-w-[140px]">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-widest">Active Posts</p>
              <p className="text-headline-md text-primary">{posts.filter(p => !p.is_hidden).length}</p>
            </div>
            <div className="glass-panel px-lg py-sm rounded-xl text-center min-w-[140px]">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-widest">Hidden/Flagged</p>
              <p className="text-headline-md text-error">{posts.filter(p => p.is_hidden).length}</p>
            </div>
          </div>
        </header>

        {/* Bento Grid Layout for Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-2xl">
          <div className="glass-panel rounded-xl p-lg flex flex-col justify-between min-h-[160px] group hover:border-primary transition-all">
            <div className="flex justify-between items-start">
              <h3 className="font-headline-md text-on-surface">Community Engagement</h3>
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">trending_up</span>
            </div>
            <div className="mt-md">
              <div className="flex justify-between text-label-md mb-xs">
                <span className="text-on-surface-variant">Total Replies</span>
                <span className="text-primary font-bold">{posts.reduce((acc, p) => acc + (p.reply_count || 0), 0)} Responses</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary glow-primary" style={{ width: '88%' }}></div>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-lg flex flex-col justify-between min-h-[160px] group hover:border-secondary transition-all">
            <div className="flex justify-between items-start">
              <h3 className="font-headline-md text-on-surface">Moderation Speed</h3>
              <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">timer</span>
            </div>
            <div className="mt-md">
              <div className="flex justify-between text-label-md mb-xs">
                <span className="text-on-surface-variant">Avg Resolution</span>
                <span className="text-secondary font-bold">14m 22s</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Table */}
        <div className="glass-panel rounded-xl overflow-hidden mt-xl">
          <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50">
            <h3 className="font-headline-md text-on-surface">Forum Posts Directory</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-container-high/50 text-label-sm text-outline uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Post / Author</th>
                  <th className="px-6 py-4 font-bold">Category</th>
                  <th className="px-6 py-4 font-bold text-center">Replies</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-10 w-full bg-surface-container" /></td></tr>
                  ))
                ) : posts.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-label-md text-on-surface-variant">No forum posts found</td></tr>
                ) : (
                  posts.map(p => {
                    const authorName = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;
                    const authorEmail = Array.isArray(p.profiles) ? p.profiles[0]?.email : p.profiles?.email;
                    return (
                      <tr key={p.id} className={`transition-colors group ${p.is_hidden ? 'bg-surface-variant/20 hover:bg-surface-variant/30' : 'hover:bg-surface-variant/10'}`}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-on-surface line-clamp-1">{p.title}</p>
                          <p className="text-[12px] text-outline mt-1">
                            By {authorName ?? 'Unknown'} ({authorEmail}) • {new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-surface-container-high text-on-surface-variant text-[10px] uppercase font-bold rounded border border-outline-variant/30">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-on-surface font-label-md">
                            <span className="material-symbols-outlined text-[16px] text-outline">forum</span>
                            {p.reply_count}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.is_hidden 
                            ? <span className="inline-flex items-center gap-1.5 text-error text-[12px] font-bold px-2 py-1 rounded-full bg-error/10 border border-error/20">
                                <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span>
                                Hidden
                              </span>
                            : <span className="inline-flex items-center gap-1.5 text-success text-[12px] font-bold px-2 py-1 rounded-full bg-success/10 border border-success/20">
                                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                                Active
                              </span>
                          }
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleHide(p.id, p.is_hidden)}
                              title={p.is_hidden ? "Unhide" : "Hide post"}
                              className={`p-2 border rounded-lg transition-colors flex items-center justify-center ${
                                p.is_hidden 
                                  ? 'border-success/30 text-success hover:bg-success/10' 
                                  : 'border-warning/30 text-warning hover:bg-warning/10'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">{p.is_hidden ? 'visibility' : 'visibility_off'}</span>
                            </button>
                            <button
                              onClick={() => deletePost(p.id)}
                              title="Delete post permanently"
                              className="p-2 border border-error/30 rounded-lg text-error hover:bg-error/10 transition-colors flex items-center justify-center"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
