import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { Link } from 'react-router-dom';
import { Briefcase, Calculator, GraduationCap, ChevronRight, Layers, Target, Trophy } from 'lucide-react';
import type { DBMLSTrack, DBMLSUserProgress } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const iconMap: Record<string, any> = {
  'Briefcase': Briefcase,
  'Calculator': Calculator,
  'GraduationCap': GraduationCap,
};

export default function ModularHubPage() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<DBMLSTrack[]>([]);
  const [progressData, setProgressData] = useState<{ [trackId: string]: { completed: number, total: number } }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHubData = async () => {
      setLoading(true);
      try {
        // Fetch all published tracks
        const { data: tracksData } = await supabase
          .from('mls_tracks')
          .select('*')
          .eq('is_published', true)
          .order('order_index', { ascending: true });
        
        if (tracksData) {
          setTracks(tracksData);
          
          // If we have a user, fetch progress per track
          if (user) {
            // First fetch all modules to count totals per track
            const { data: modulesData } = await supabase.from('mls_modules').select('id, track_id');
            // Then fetch user progress
            const { data: userProg } = await supabase.from('mls_user_progress').select('module_id, status').eq('user_id', user.id);
            
            const pData: any = {};
            tracksData.forEach(t => pData[t.id] = { completed: 0, total: 0 });
            
            if (modulesData) {
              modulesData.forEach(mod => {
                if (pData[mod.track_id]) {
                  pData[mod.track_id].total++;
                  const userM = userProg?.find(up => up.module_id === mod.id);
                  if (userM?.status === 'completed') {
                    pData[mod.track_id].completed++;
                  }
                }
              });
            }
            setProgressData(pData);
          }
        }
      } catch (err) {
        console.error("Error fetching MLS hub data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHubData();
  }, [user]);

  return (
    <AppLayout title="Modular Learning Hub">
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 bg-background">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface border border-outline-variant rounded-2xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-heading font-bold text-on-surface flex items-center gap-3">
              <Layers className="w-8 h-8 text-primary" />
              Modular Learning Hub
            </h1>
            <p className="text-on-surface-variant mt-2 max-w-2xl text-lg">
              Master specialized skills through bite-sized, highly focused learning modules designed to accelerate your career.
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-4 bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant z-10">
              <div className="text-center px-4 border-r border-outline-variant">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Total Tracks</p>
                <p className="text-2xl font-bold text-primary">{tracks.length}</p>
              </div>
              <div className="text-center px-4">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Modules Done</p>
                <p className="text-2xl font-bold text-tertiary flex items-center justify-center gap-1">
                  <Trophy className="w-5 h-5" /> 
                  {Object.values(progressData).reduce((acc: number, curr: any) => acc + curr.completed, 0)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tracks List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="glass-panel border-outline-variant/60 shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-surface-variant rounded-lg mb-4"></div>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-6" />
                  <Skeleton className="h-2 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : tracks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-on-surface-variant bg-surface rounded-2xl border border-outline-variant">
              No learning tracks available yet.
            </div>
          ) : (
            tracks.map(track => {
              const Icon = track.icon_name && iconMap[track.icon_name] ? iconMap[track.icon_name] : Layers;
              const p = progressData[track.id] || { completed: 0, total: 0 };
              const percent = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
              
              return (
                <Card key={track.id} className="glass-panel border-outline-variant/60 shadow-sm hover:border-primary/50 transition-colors group flex flex-col h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-on-surface mb-2 font-display">{track.title}</h3>
                    <p className="text-sm text-on-surface-variant flex-grow mb-6">{track.description}</p>
                    
                    <div className="mb-6">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-semibold text-on-surface">Progress</span>
                        <span className="text-on-surface-variant font-mono">{p.completed} / {p.total} Modules</span>
                      </div>
                      <div className="h-2.5 w-full bg-surface-variant rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full transition-all duration-1000" 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <Link to={`/mls/${track.id}`} className="mt-auto">
                      <Button className="w-full group-hover:bg-primary group-hover:text-on-primary transition-colors" variant={percent > 0 ? "default" : "outline"}>
                        {percent > 0 ? (percent === 100 ? 'Review Track' : 'Continue Learning') : 'Start Track'}
                        <ChevronRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

      </div>
    </AppLayout>
  );
}
