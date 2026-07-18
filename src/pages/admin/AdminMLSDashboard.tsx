import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { Plus, Edit, Trash2, Layers, Video, FileText, LayoutDashboard, ChevronDown, ChevronRight } from 'lucide-react';
import type { DBMLSTrack, DBMLSModule } from '@/types/types';
import { toast } from 'sonner';

export default function AdminMLSDashboard() {
  const [tracks, setTracks] = useState<DBMLSTrack[]>([]);
  const [modules, setModules] = useState<Record<string, DBMLSModule[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: tData } = await supabase.from('mls_tracks').select('*').order('order_index');
      if (tData) {
        setTracks(tData);
        if (tData.length > 0) setExpandedTrack(tData[0].id);
        
        const { data: mData } = await supabase.from('mls_modules').select('*').order('order_index');
        
        if (mData) {
          const mGroup: Record<string, DBMLSModule[]> = {};
          tData.forEach(t => mGroup[t.id] = []);
          mData.forEach(m => {
            if (mGroup[m.track_id]) {
              mGroup[m.track_id].push(m);
            }
          });
          setModules(mGroup);
        }
      }
    } catch (err) {
      toast.error("Failed to load MLS data");
    } finally {
      setLoading(false);
    }
  };

  const createMockModule = async (trackId: string) => {
    const title = window.prompt("Enter new module title:");
    if (!title) return;
    
    const { data, error } = await supabase.from('mls_modules').insert({
      track_id: trackId,
      title,
      description: 'New module description',
      difficulty: 'Beginner',
      estimated_time_mins: 30,
      is_published: true
    }).select().single();
    
    if (error) {
      toast.error("Failed to create module");
    } else if (data) {
      toast.success("Module created!");
      setModules(prev => ({
        ...prev,
        [trackId]: [...(prev[trackId] || []), data]
      }));
    }
  };

  const deleteModule = async (trackId: string, moduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this module?")) return;
    
    const { error } = await supabase.from('mls_modules').delete().eq('id', moduleId);
    if (error) {
      toast.error("Failed to delete module");
    } else {
      toast.success("Module deleted!");
      setModules(prev => ({
        ...prev,
        [trackId]: prev[trackId].filter(m => m.id !== moduleId)
      }));
    }
  };

  return (
    <AppLayout title="Admin Modular Learning" isAdmin>
      <div className="flex-1 p-6 md:p-8 w-full bg-background space-y-6">
        
        <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-on-surface">Modular Learning System</h1>
              <p className="text-sm text-on-surface-variant">Manage Tracks, Modules, and Materials</p>
            </div>
          </div>
          <Button onClick={() => toast.info("Track creation coming soon!")}>
            <Plus className="w-4 h-4 mr-2" /> Add Track
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">Loading tracks...</div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-outline-variant text-on-surface-variant">
            No tracks found. Get started by adding a track.
          </div>
        ) : (
          <div className="space-y-4">
            {tracks.map(track => {
              const isExpanded = expandedTrack === track.id;
              const trackModules = modules[track.id] || [];
              
              return (
                <Card key={track.id} className="border-outline-variant/60 shadow-sm overflow-hidden">
                  <div 
                    className={`bg-surface p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'border-b border-outline-variant/50 bg-surface-container-lowest' : 'hover:bg-surface-container-lowest'}`}
                    onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-on-surface-variant" /> : <ChevronRight className="w-5 h-5 text-on-surface-variant" />}
                      <div>
                        <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          {track.title}
                          {!track.is_published && <Badge variant="outline" className="text-yellow-600 border-yellow-600">Draft</Badge>}
                        </h2>
                        <p className="text-sm text-on-surface-variant">{trackModules.length} Modules</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => toast.info("Edit Track coming soon!")}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="default" size="sm" onClick={() => createMockModule(track.id)}>
                        <Plus className="w-4 h-4 mr-1" /> Add Module
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 bg-surface-container-lowest">
                      {trackModules.length === 0 ? (
                        <div className="text-center py-8 text-on-surface-variant text-sm border border-dashed border-outline-variant rounded-xl">
                          No modules in this track. Click "Add Module" to create one.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {trackModules.map(mod => (
                            <div key={mod.id} className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col hover:border-primary/50 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-on-surface line-clamp-1 flex-1 pr-2" title={mod.title}>{mod.title}</h3>
                                {!mod.is_published && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Draft</Badge>}
                              </div>
                              <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 flex-1">{mod.description}</p>
                              
                              <div className="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/50">
                                <span className="text-xs font-mono text-on-surface-variant">{mod.estimated_time_mins} mins</span>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="w-7 h-7 text-primary" onClick={() => toast.info("Manage Materials coming soon!")} title="Manage Materials">
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="w-7 h-7 text-tertiary" onClick={() => toast.info("Edit Module coming soon!")} title="Edit Module">
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="w-7 h-7 text-error" onClick={() => deleteModule(track.id, mod.id)} title="Delete Module">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
