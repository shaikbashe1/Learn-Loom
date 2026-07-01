import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface Roadmap {
  id: string;
  title: string;
  description: string;
  type: string;
}

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoadmaps() {
      try {
        const { data, error } = await supabase.from('roadmaps').select('*');
        if (!error && data) {
          setRoadmaps(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadRoadmaps();
  }, []);

  const getIcon = (title: string) => {
    if (title.toLowerCase().includes('data')) return 'account_tree';
    if (title.toLowerCase().includes('sql')) return 'database';
    return 'map';
  };

  return (
    <AppLayout title="Coding Roadmaps">
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Learning Roadmaps</h1>
          <p className="text-on-surface-variant font-label-md mt-1">Structured paths to master specific domains and ace interviews.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roadmaps.map((r) => (
              <Card key={r.id} className="glass-panel border-outline-variant/60 relative overflow-hidden group hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/20 transition-all"></div>
                <CardHeader className="flex flex-row items-center gap-4 pb-2 relative z-10">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <span className="material-symbols-outlined text-[28px]">{getIcon(r.title)}</span>
                  </div>
                  <div>
                    <CardTitle className="font-display text-xl text-on-surface">{r.title}</CardTitle>
                    <p className="text-xs text-on-surface-variant mt-1">{r.type}</p>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="mt-2">
                    <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">{r.description}</p>
                    <Link to={`/coding/roadmaps/${r.id}`}>
                      <Button className="w-full bg-primary text-on-primary">
                        View Roadmap
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
