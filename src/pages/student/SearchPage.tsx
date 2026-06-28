import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { Skeleton } from '@/components/ui/skeleton';

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
      
      const [postsRes, profilesRes] = await Promise.all([
        supabase
          .from('forum_posts')
          .select('id, title, content, profiles(full_name)')
          .ilike('title', `%${query}%`)
          .limit(10),
        supabase
          .from('profiles')
          .select('id, full_name, bio, avatar_url')
          .ilike('full_name', `%${query}%`)
          .limit(10)
      ]);
      
      const newResults: SearchResult[] = [];
      
      if (profilesRes.data) {
        profilesRes.data.forEach(p => {
          newResults.push({
            id: p.id,
            type: 'user',
            title: p.full_name || 'Community Member',
            subtitle: p.bio || 'Student @ LearnLoom',
            url: `/profile/${p.id}`,
            imageUrl: p.avatar_url
          });
        });
      }
      
      if (postsRes.data) {
        postsRes.data.forEach(p => {
          newResults.push({
            id: p.id,
            type: 'post',
            title: p.title,
            subtitle: `By ${(p.profiles as any)?.full_name || 'Anonymous'}`,
            url: `/community#post-${p.id}`,
          });
        });
      }
      
      setResults(newResults);
      setLoading(false);
    })();
  }, [query]);

  return (
    <AppLayout title="Search Results">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 w-full min-h-[80vh]">
        <h1 className="font-display text-3xl font-bold mb-2">Search Results for "{query}"</h1>
        <p className="text-text-secondary mb-8">Found {results.length} results</p>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full bg-surface-container rounded-xl" />
            <Skeleton className="h-20 w-full bg-surface-container rounded-xl" />
            <Skeleton className="h-20 w-full bg-surface-container rounded-xl" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-xl border border-border-base shadow-sm">
            <span className="material-symbols-outlined text-5xl text-text-secondary opacity-50 mb-4">search_off</span>
            <h3 className="font-headline-md text-xl font-bold mb-2">No results found</h3>
            <p className="text-text-secondary">Try adjusting your keywords and searching again.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {results.map((r, idx) => (
              <Link 
                key={`${r.type}-${r.id}-${idx}`}
                to={r.url}
                className="bg-surface border border-border-base rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow group card-lift"
              >
                {r.type === 'user' ? (
                  r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.title} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
                      {r.title.charAt(0).toUpperCase()}
                    </div>
                  )
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface-container-low border border-border-base text-primary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined">forum</span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[16px] text-text-primary truncate group-hover:text-primary transition-colors">{r.title}</h4>
                  <p className="text-[13px] text-text-secondary truncate mt-0.5">{r.subtitle}</p>
                </div>
                
                <div className="text-xs font-bold px-2.5 py-1 rounded-md bg-surface-container-low text-text-secondary border border-border-base uppercase tracking-wider">
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
