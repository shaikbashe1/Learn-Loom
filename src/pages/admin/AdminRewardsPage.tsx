import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Save, Loader2, Coins, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RewardConfig {
  id: string;
  action_type: string;
  points: number;
}

export default function AdminRewardsPage() {
  const [configs, setConfigs] = useState<RewardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('reward_configurations').select('*').order('action_type', { ascending: true });
    if (error) {
      toast.error('Failed to load reward configurations');
    } else {
      setConfigs(data as RewardConfig[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Upsert all configs
    const updates = configs.map(c => ({
      id: c.id,
      action_type: c.action_type,
      points: c.points,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('reward_configurations').upsert(updates);
    
    if (error) toast.error('Failed to update reward configurations');
    else toast.success('Reward configurations updated successfully');
    
    setSaving(false);
  };

  const updateConfig = (id: string, points: number) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, points } : c));
  };

  const formatActionName = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <AppLayout title="Rewards & Credits" isAdmin>
      <div className="max-w-[1000px] mx-auto w-full space-y-xl pb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Rewards Configuration</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Manage how many credits and experience points students earn for completing actions on the platform.</p>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel p-xl rounded-2xl space-y-6">
            <Skeleton className="h-10 w-1/3 rounded" />
            <Skeleton className="h-32 w-full rounded" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
            <div className="md:col-span-2">
              <form onSubmit={handleSave} className="glass-panel p-xl rounded-2xl flex flex-col gap-xl">
                <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
                  <Trophy className="w-6 h-6 text-tertiary" />
                  <h2 className="font-headline-md text-on-surface">Action Point Values</h2>
                </div>
                
                <div className="space-y-6">
                  {configs.map(config => (
                    <div key={config.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/40">
                      <div>
                        <Label className="text-base font-medium text-on-surface">{formatActionName(config.action_type)}</Label>
                        <p className="text-xs text-on-surface-variant mt-1">System Action: <code>{config.action_type}</code></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="number" 
                          min={0}
                          className="w-24 bg-surface-container-highest border-outline-variant text-on-surface text-center font-bold" 
                          value={config.points}
                          onChange={e => updateConfig(config.id, parseInt(e.target.value) || 0)}
                          required
                        />
                        <span className="text-sm font-bold text-tertiary">PTS</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-outline-variant/30 flex justify-end">
                  <Button type="submit" disabled={saving} className="bg-primary text-on-primary font-bold px-8 flex items-center gap-2 rounded-xl">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Configuration
                  </Button>
                </div>
              </form>
            </div>

            <div className="space-y-md">
              <div className="glass-panel p-lg rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-5 h-5 text-gold-tier" />
                  <h3 className="font-headline-md text-on-surface">Economy Stats</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-label-sm text-outline">Total Points Issued</p>
                    <p className="text-display font-bold mt-1 text-on-surface">1,492,050</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-outline">Avg Points / Student</p>
                    <p className="text-headline-md font-bold mt-1 text-on-surface">450</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-lg rounded-xl bg-tertiary/10 border-tertiary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-tertiary" />
                  <h3 className="font-label-md font-bold text-tertiary">Tip</h3>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Keeping problem-solving points high encourages active learning over passive video watching. Consider a 5:1 ratio between solving problems and passing quizzes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
