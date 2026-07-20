import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { db } from '@/db/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageSquare } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'post' | 'user';
  title: string;
  subtitle: string;
  url: string;
  imageUrl?: string | null;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    (async () => {
      setLoading(true);
      
      try {
        const [postsSnap, profilesSnap] = await Promise.all([
          getDocs(collection(db, 'forum_posts')),
          getDocs(collection(db, 'profiles'))
        ]);
        
        const profilesData = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const postsData = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        const queryLower = query.toLowerCase();

        const matchedProfiles = profilesData
          .filter(p => (p.full_name || '').toLowerCase().includes(queryLower))
          .slice(0, 10);

        const matchedPosts = postsData
          .filter(p => (p.title || '').toLowerCase().includes(queryLower))
          .slice(0, 10);
        
        const newResults: SearchResult[] = [];
        
        matchedProfiles.forEach(p => {
          newResults.push({
            id: p.id,
            type: 'user',
            title: p.full_name || 'Community Member',
            subtitle: p.bio || 'Student @ Quovexi',
            url: `/profile/${p.id}`,
            imageUrl: p.avatar_url
          });
        });
        
        matchedPosts.forEach(p => {
          const authorProfile = profilesData.find(prof => prof.id === p.author_id);
          newResults.push({
            id: p.id,
            type: 'post',
            title: p.title,
            subtitle: `By ${authorProfile?.full_name || 'Anonymous'}`,
            url: `/community#post-${p.id}`,
          });
        });
        
        setResults(newResults);
      } catch (err) {
        console.error('Error fetching search results:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [query]);

  return (
    <AppLayout title="Search Results">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 w-full min-h-[80vh] select-none">
        <h1 className="font-display text-2xl font-bold mb-1">Search Results for "{query}"</h1>
        <p className="text-xs text-muted-foreground font-semibold mb-8">Found {results.length} results</p>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full bg-muted rounded-2xl" />
            <Skeleton className="h-20 w-full bg-muted rounded-2xl" />
            <Skeleton className="h-20 w-full bg-muted rounded-2xl" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
              <Search className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <h3 className="text-sm font-bold mb-1">No results found</h3>
            <p className="text-xs text-muted-foreground font-semibold">Try adjusting your keywords and searching again.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {results.map((r, idx) => (
              <Link 
                key={`${r.type}-${r.id}-${idx}`}
                to={r.url}
                className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:border-border/80 shadow-sm hover:shadow-md transition-all group"
              >
                {r.type === 'user' ? (
                  r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.title} className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0">
                      {r.title.charAt(0).toUpperCase()}
                    </div>
                  )
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-sm shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors leading-normal">
                    {r.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate mt-1 font-semibold leading-normal">
                    {r.subtitle}
                  </p>
                </div>
                
                <div className="text-[9px] font-extrabold px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border uppercase tracking-wider">
                  {r.type}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
export { SearchPage };
