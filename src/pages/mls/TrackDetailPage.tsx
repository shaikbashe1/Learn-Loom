import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, BarChart, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import type { DBMLSTrack, DBMLSModule, DBMLSUserProgress } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrackDetailPage() {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [track, setTrack] = useState<DBMLSTrack | null>(null);
  const [modules, setModules] = useState<DBMLSModule[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrackData = async () => {
      if (!trackId) return;
      setLoading(true);
      try {
        const { data: trackData, error: trackErr } = await supabase
          .from('mls_tracks')
          .select('*')
          .eq('id', trackId)
          .single();
          
        if (trackErr || !trackData) {
          navigate('/mls');
          return;
        }
        setTrack(trackData);

        const { data: modsData } = await supabase
          .from('mls_modules')
          .select('*')
          .eq('track_id', trackId)
          .eq('is_published', true)
          .order('order_index', { ascending: true });

        if (modsData) {
          setModules(modsData);
          
          if (user) {
            const { data: progData } = await supabase
              .from('mls_user_progress')
              .select('module_id, status')
              .eq('user_id', user.id);
              
            if (progData) {
              const pMap: Record<string, string> = {};
              progData.forEach(p => pMap[p.module_id] = p.status);
              setProgress(pMap);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching track data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrackData();
  }, [trackId, navigate, user]);

  if (loading) {
    return (
      <AppLayout title="Loading Track...">
        <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-4">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-32 w-full mb-8" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!track) return null;

  const totalModules = modules.length;
  const completedModules = modules.filter(m => progress[m.id] === 'completed').length;
  const percentComplete = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <AppLayout title={track.title}>
      <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full bg-background space-y-8">
        
        {/* Back navigation & Header */}
        <div>
          <Link to="/mls" className="inline-flex items-center text-sm text-on-surface-variant hover:text-primary transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Hub
          </Link>
          
          <div className="bg-surface border border-outline-variant rounded-2xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-heading font-bold text-on-surface mb-2">{track.title}</h1>
              <p className="text-on-surface-variant text-lg max-w-2xl">{track.description}</p>
            </div>
            
            <div className="w-full md:w-64 bg-surface-container rounded-xl p-5 shadow-inner">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-on-surface">Your Progress</span>
                <span className="text-xl font-bold text-primary">{percentComplete}%</span>
              </div>
              <div className="h-2.5 w-full bg-surface-variant rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-1000" 
                  style={{ width: `${percentComplete}%` }}
                ></div>
              </div>
              <p className="text-xs text-on-surface-variant text-right">{completedModules} of {totalModules} completed</p>
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div>
          <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-tertiary" />
            Learning Modules
          </h2>
          
          <div className="space-y-4">
            {modules.length === 0 ? (
              <div className="text-center py-12 bg-surface rounded-xl border border-outline-variant text-on-surface-variant">
                No modules have been added to this track yet.
              </div>
            ) : (
              modules.map((mod, idx) => {
                const status = progress[mod.id] || 'not_started';
                const isCompleted = status === 'completed';
                const isStarted = status === 'started';
                
                return (
                  <Card key={mod.id} className="glass-panel border-outline-variant/60 shadow-sm hover:border-primary/40 transition-colors group">
                    <CardContent className="p-0 flex flex-col md:flex-row items-stretch">
                      
                      {/* Status Indicator Area */}
                      <div className={`w-16 flex flex-col items-center justify-center border-r border-outline-variant/50 p-4 transition-colors ${
                        isCompleted ? 'bg-green-500/10 text-green-500' : 
                        isStarted ? 'bg-yellow-500/10 text-yellow-600' : 
                        'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-8 h-8" />
                        ) : (
                          <div className="font-mono font-bold text-lg">{idx + 1}</div>
                        )}
                      </div>
                      
                      {/* Content Area */}
                      <div className="p-5 flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{mod.title}</h3>
                            {isStarted && <Badge variant="outline" className="text-yellow-600 border-yellow-600/30 bg-yellow-600/5">In Progress</Badge>}
                          </div>
                          <p className="text-sm text-on-surface-variant line-clamp-2 max-w-3xl">{mod.description}</p>
                          
                          <div className="flex items-center gap-4 mt-3 text-xs text-on-surface-variant font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {mod.estimated_time_mins} mins
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart className="w-3.5 h-3.5" />
                              {mod.difficulty || 'All Levels'}
                            </span>
                          </div>
                        </div>
                        
                        <Link to={`/mls/${track.id}/${mod.id}`} className="w-full md:w-auto shrink-0 mt-4 md:mt-0">
                          <Button variant={isCompleted ? "outline" : "default"} className="w-full">
                            {isCompleted ? 'Review Module' : isStarted ? 'Continue' : 'Start Module'}
                          </Button>
                        </Link>
                      </div>
                      
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
