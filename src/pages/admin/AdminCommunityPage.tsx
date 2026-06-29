import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  TrendingUp, 
  Timer, 
  MessageSquare, 
  Eye, 
  EyeOff, 
  Trash2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

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
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Community Moderation</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Monitor forum health, manage active discussions, and maintain platform standards.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={fetchPosts} 
               className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all shadow-sm"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             
             <div className="flex items-center justify-center px-4 py-2 bg-card border border-border rounded-xl shadow-sm h-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active</span>
                  <span className="text-xs font-bold text-foreground ml-1">{activePostsCount}</span>
                </div>
             </div>
             
             <div className="flex items-center justify-center px-4 py-2 bg-card border border-border rounded-xl shadow-sm h-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hidden</span>
                  <span className="text-xs font-bold text-foreground ml-1">{hiddenPostsCount}</span>
                </div>
             </div>
          </div>
        </header>

        {/* Bento Grid Layout for Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group">
            <div className="absolute top-[-10%] right-[-10%] w-36 h-36 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-xs font-bold text-foreground">
                Community Engagement
              </h3>
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>
            
            <div className="mt-4 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Total Replies</span>
                <span className="text-xl font-extrabold text-primary leading-none">
                  {totalRepliesCount} <span className="text-[11px] font-semibold text-muted-foreground ml-0.5">Responses</span>
                </span>
              </div>
              
              <div className="h-2 w-full bg-muted border border-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-chart-4 rounded-full transition-all duration-1000" 
                  style={{ width: '88%' }} 
                />
              </div>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group">
            <div className="absolute top-[-10%] right-[-10%] w-36 h-36 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-xs font-bold text-foreground">
                Moderation Speed
              </h3>
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
                <Timer className="w-4.5 h-4.5" />
              </div>
            </div>
            
            <div className="mt-4 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Avg Resolution</span>
                <span className="text-xl font-extrabold text-primary leading-none">14m 22s</span>
              </div>
              
              <div className="h-2 w-full bg-muted border border-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-chart-4 rounded-full transition-all duration-1000" 
                  style={{ width: '94%' }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Posts Table */}
        <section className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
               <MessageSquare className="w-4.5 h-4.5 text-primary" />
               Forum Directory
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider w-[40%]">Post / Author</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-center">Replies</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-12 w-full bg-muted rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                       <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                         <MessageSquare className="w-5 h-5 text-muted-foreground/40" />
                       </div>
                       <p className="text-sm font-bold text-foreground">No forum posts found</p>
                    </td>
                  </tr>
                ) : (
                  posts.map(p => {
                    const authorName = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;
                    const authorEmail = Array.isArray(p.profiles) ? p.profiles[0]?.email : p.profiles?.email;
                    return (
                      <tr key={p.id} className={`transition-colors hover:bg-muted/10 ${p.is_hidden ? 'bg-muted/30 opacity-75' : ''} group`}>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-normal">
                            {p.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                            By <span className="text-foreground">{authorName ?? 'Unknown'}</span> ({authorEmail}) • {new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 bg-background border border-border text-muted-foreground text-[9px] font-extrabold uppercase tracking-wider rounded-lg shadow-sm">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-foreground font-bold text-xs">
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{p.reply_count}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.is_hidden ? (
                            <span className="inline-flex items-center gap-1 text-destructive text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-destructive/10 border border-destructive/20">
                              <XCircle className="h-3 w-3 animate-pulse" /> Hidden
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-500 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleHide(p.id, p.is_hidden)}
                              title={p.is_hidden ? "Unhide" : "Hide post"}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center border border-transparent hover:border-border transition-all hover:bg-muted ${
                                p.is_hidden ? 'text-emerald-500' : 'text-amber-500'
                              }`}
                            >
                              {p.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => deletePost(p.id)}
                              title="Delete post permanently"
                              className="w-9 h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-muted flex items-center justify-center border border-transparent hover:border-border transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
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
