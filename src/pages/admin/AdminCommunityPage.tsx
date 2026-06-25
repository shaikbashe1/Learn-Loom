import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { RefreshCw, TrendingUp, Timer, MessageSquare, Eye, EyeOff, Trash2 } from 'lucide-react';

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
      setPosts((data as unknown as ForumPost[]) ?? []);
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

  const activePostsCount = posts.filter(p => !p.is_hidden).length;
  const hiddenPostsCount = posts.filter(p => p.is_hidden).length;
  const totalRepliesCount = posts.reduce((acc, p) => acc + (p.reply_count || 0), 0);

  return (
    <AppLayout title="Community Moderation" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Community Moderation</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Monitor forum health, manage active discussions, and maintain platform standards.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={fetchPosts} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Active</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{activePostsCount}</span>
               </div>
             </div>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-error"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Hidden</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{hiddenPostsCount}</span>
               </div>
             </div>
          </div>
        </header>

        {/* Bento Grid Layout for Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl border border-border-base p-6 shadow-sm flex flex-col justify-between min-h-[160px] group hover:border-primary/50 transition-all card-lift overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-20 -mt-20"></div>
            <div className="flex justify-between items-start relative z-10">
              <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
                Community Engagement
              </h3>
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">Total Replies</span>
                <span className="text-[24px] font-bold text-primary leading-none">{totalRepliesCount} <span className="text-[14px] font-medium text-text-secondary ml-1">Responses</span></span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-border-base/50">
                <div className="h-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_8px_rgba(192,193,255,0.6)] rounded-full transition-all duration-1000" style={{ width: '88%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel rounded-2xl border border-border-base p-6 shadow-sm flex flex-col justify-between min-h-[160px] group hover:border-secondary/50 transition-all card-lift overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-secondary/10 to-transparent rounded-bl-full -mr-20 -mt-20"></div>
            <div className="flex justify-between items-start relative z-10">
              <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
                Moderation Speed
              </h3>
              <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Timer className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">Avg Resolution</span>
                <span className="text-[24px] font-bold text-secondary leading-none">14m 22s</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-border-base/50">
                <div className="h-full bg-gradient-to-r from-secondary to-primary-container shadow-[0_0_8px_rgba(221,183,255,0.6)] rounded-full transition-all duration-1000" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Table */}
        <section className="glass-panel rounded-2xl border border-border-base shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 md:px-8 py-5 border-b border-border-base flex justify-between items-center bg-surface/50">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
               <MessageSquare className="w-5 h-5 text-primary" />
               Forum Directory
            </h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-container/50 border-b border-border-base">
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider w-[40%]">Post / Author</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-center">Replies</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-12 w-full bg-surface-container rounded-lg" /></td></tr>
                  ))
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                       <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                         <MessageSquare className="w-6 h-6 text-text-secondary" />
                       </div>
                       <p className="font-headline-md text-[18px] font-bold text-text-primary">No forum posts found</p>
                    </td>
                  </tr>
                ) : (
                  posts.map(p => {
                    const authorName = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;
                    const authorEmail = Array.isArray(p.profiles) ? p.profiles[0]?.email : p.profiles?.email;
                    return (
                      <tr key={p.id} className={`transition-colors group hover:bg-surface-container/50 ${p.is_hidden ? 'bg-surface-container/30 opacity-75' : ''}`}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-[15px] text-text-primary line-clamp-1 group-hover:text-primary transition-colors">{p.title}</p>
                          <p className="text-[12px] text-text-secondary mt-1 font-medium">
                            By <span className="text-text-primary">{authorName ?? 'Unknown'}</span> ({authorEmail}) • {new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-surface border border-border-base text-text-secondary text-[11px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-text-primary font-bold text-[15px]">
                            <MessageSquare className="w-4 h-4 text-text-secondary" />
                            {p.reply_count}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.is_hidden 
                            ? <span className="inline-flex items-center gap-1.5 text-error text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-error/10 border border-error/20">
                                <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span>
                                Hidden
                              </span>
                            : <span className="inline-flex items-center gap-1.5 text-success text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-success/10 border border-success/20">
                                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                                Active
                              </span>
                          }
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleHide(p.id, p.is_hidden)}
                              title={p.is_hidden ? "Unhide" : "Hide post"}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border border-transparent hover:border-border-base ${
                                p.is_hidden 
                                  ? 'text-success hover:text-success hover:bg-surface' 
                                  : 'text-warning hover:text-warning hover:bg-surface'
                              }`}
                            >
                              {p.is_hidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => deletePost(p.id)}
                              title="Delete post permanently"
                              className="w-10 h-10 rounded-full text-text-secondary hover:text-error hover:bg-surface flex items-center justify-center transition-all shadow-sm border border-transparent hover:border-border-base"
                            >
                              <Trash2 className="w-5 h-5" />
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
        </section>
      </div>
    </AppLayout>
  );
}
