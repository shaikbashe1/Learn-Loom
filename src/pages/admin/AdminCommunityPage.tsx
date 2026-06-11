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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Community Moderation</h2>
          <Button variant="ghost" size="sm" onClick={fetchPosts} className="border border-border">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Post / Author</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Category</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Replies</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-10 w-full bg-muted" /></td></tr>
                    ))
                  ) : posts.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No forum posts found</td></tr>
                  ) : (
                    posts.map(p => {
                      const authorName = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;
                      const authorEmail = Array.isArray(p.profiles) ? p.profiles[0]?.email : p.profiles?.email;
                      return (
                        <tr key={p.id} className={`border-b border-border transition-colors ${p.is_hidden ? 'bg-muted/30' : 'hover:bg-muted/10'}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground line-clamp-1">{p.title}</p>
                            <p className="text-xs text-muted-foreground">By {authorName ?? 'Unknown'} ({authorEmail})</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] uppercase">{p.category}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center text-foreground font-medium">
                            <div className="flex items-center justify-center gap-1">
                              <MessageSquare className="w-3 h-3 text-muted-foreground" /> {p.reply_count}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.is_hidden 
                              ? <Badge variant="destructive" className="text-[10px]">Hidden</Badge>
                              : <Badge className="bg-green-500/10 text-green-600 border-0 hover:bg-green-500/20 text-[10px]">Active</Badge>
                            }
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleHide(p.id, p.is_hidden)}
                                title={p.is_hidden ? "Unhide" : "Hide post"}
                                className="h-8 px-2"
                              >
                                {p.is_hidden ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-amber-500" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deletePost(p.id)}
                                title="Delete post permanently"
                                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
