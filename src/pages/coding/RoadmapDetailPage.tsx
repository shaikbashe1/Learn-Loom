import { AppLayout } from '@/components/layouts/AppLayout';
import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface RoadmapTopic {
  id: string;
  title: string;
  description: string;
  order_index: number;
  problem_ids: string[];
}

export default function RoadmapDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [roadmap, setRoadmap] = useState<any>(null);
  const [topics, setTopics] = useState<RoadmapTopic[]>([]);
  const [problemsCache, setProblemsCache] = useState<Record<string, any>>({});
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const { data: rData, error: rError } = await supabase.from('roadmaps').select('*').eq('id', id).single();
        if (rError) throw rError;
        setRoadmap(rData);

        const { data: tData, error: tError } = await supabase
          .from('roadmap_topics')
          .select('*')
          .eq('roadmap_id', id)
          .order('order_index', { ascending: true });
        
        if (tError) throw tError;
        setTopics(tData as RoadmapTopic[]);

        // Fetch actual problem names for all problem_ids in these topics
        const allProblemIds = (tData as RoadmapTopic[]).flatMap(t => t.problem_ids || []);
        if (allProblemIds.length > 0) {
          const { data: pData } = await supabase.from('coding_problems').select('id, title, difficulty').in('id', allProblemIds);
          if (pData) {
            const pMap: Record<string, any> = {};
            pData.forEach(p => pMap[p.id] = p);
            setProblemsCache(pMap);
          }
        }

        if (user) {
          const { data: sData } = await supabase
            .from('submissions')
            .select('problem_id')
            .eq('user_id', user.id)
            .eq('verdict', 'Accepted');
          
          if (sData) {
            setSolvedIds(new Set(sData.map(s => s.problem_id)));
          }
        }

      } catch (err: any) {
        toast.error('Failed to load roadmap details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!roadmap) return <AppLayout><div className="p-6 text-center">Roadmap not found</div></AppLayout>;

  return (
    <AppLayout title={roadmap.title}>
      <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-10 relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-tertiary/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold font-display text-primary-fixed-dim mb-4">{roadmap.title}</h1>
            <p className="text-on-surface-variant font-label-lg">{roadmap.description}</p>
          </div>
        </div>

        <div className="space-y-6">
          {topics.map((topic, i) => (
            <Card key={topic.id} className="glass-panel border-outline-variant/60 shadow-sm relative pl-8">
              {/* Timeline Connector */}
              <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-outline-variant/40"></div>
              {/* Timeline Node */}
              <div className="absolute left-3 top-8 w-4 h-4 rounded-full bg-surface border-2 border-primary z-10 shadow-sm shadow-primary/30"></div>

              <CardHeader>
                <CardTitle className="font-display text-xl text-on-surface">{i + 1}. {topic.title}</CardTitle>
                <p className="text-sm text-on-surface-variant">{topic.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 mt-2">
                  {(topic.problem_ids || []).map(pid => {
                    const prob = problemsCache[pid];
                    const isSolved = solvedIds.has(pid);
                    
                    if (!prob) return null;
                    return (
                      <Link to={`/coding/problems/${pid}`} key={pid} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isSolved ? 'bg-success/5 border-success/30 hover:bg-success/10' : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/40'}`}>
                        <div className="flex items-center gap-3">
                          {isSolved ? (
                            <span className="material-symbols-outlined text-success">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-outline-variant">radio_button_unchecked</span>
                          )}
                          <div>
                            <p className={`font-medium ${isSolved ? 'text-on-surface' : 'text-on-surface'}`}>{prob.title}</p>
                            <p className={`text-xs ${prob.difficulty === 'Beginner' ? 'text-[#4ade80]' : prob.difficulty === 'Intermediate' ? 'text-tertiary' : 'text-error'}`}>{prob.difficulty}</p>
                          </div>
                        </div>
                        <Button variant="ghost" className={isSolved ? 'text-success' : 'text-primary'}>
                          {isSolved ? 'Review' : 'Solve'}
                        </Button>
                      </Link>
                    );
                  })}
                  {(!topic.problem_ids || topic.problem_ids.length === 0) && (
                    <div className="text-sm text-on-surface-variant italic py-2">No problems listed yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
