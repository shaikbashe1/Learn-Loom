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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Rewards Configuration</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Manage how many credits and experience points students earn for completing actions on the platform.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="glass-panel p-6 md:p-8 rounded-2xl border border-border-base shadow-sm space-y-6 mt-4">
            <Skeleton className="h-10 w-1/3 rounded-xl bg-surface-container" />
            <Skeleton className="h-40 w-full rounded-xl bg-surface-container" />
            <Skeleton className="h-40 w-full rounded-xl bg-surface-container" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-2">
              <form onSubmit={handleSave} className="glass-panel p-6 md:p-8 rounded-2xl border border-border-base shadow-sm flex flex-col gap-6">
                <div className="flex items-center gap-3 border-b border-border-base pb-4">
                  <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary border border-tertiary/20 shadow-inner">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h2 className="font-headline-md text-[20px] font-bold text-text-primary">Action Point Values</h2>
                </div>
                
                <div className="space-y-4">
                  {configs.map(config => (
                    <div key={config.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-surface border border-border-base rounded-xl shadow-sm hover:border-tertiary/50 transition-colors group">
                      <div className="mb-4 sm:mb-0">
                        <Label className="text-[15px] font-bold text-text-primary group-hover:text-tertiary transition-colors">{formatActionName(config.action_type)}</Label>
                        <p className="text-[12px] font-medium text-text-secondary mt-1 flex items-center gap-2">
                          System Action: <code className="bg-surface-container px-2 py-0.5 rounded border border-border-base font-mono text-[11px] text-text-primary shadow-inner">{config.action_type}</code>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Input 
                          type="number" 
                          min={0}
                          className="w-28 bg-surface-container border-border-base text-text-primary text-center font-bold text-[18px] focus:ring-2 focus:ring-tertiary shadow-inner h-12" 
                          value={config.points}
                          onChange={e => updateConfig(config.id, parseInt(e.target.value) || 0)}
                          required
                        />
                        <span className="text-[14px] font-bold text-tertiary bg-tertiary/10 px-3 py-1.5 rounded-md border border-tertiary/20">PTS</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-border-base flex justify-end mt-2">
                  <button type="submit" disabled={saving} className="w-full sm:w-auto bg-tertiary text-white font-bold py-3.5 px-8 flex items-center justify-center gap-2 rounded-xl shadow-sm hover:bg-tertiary/90 transition-all text-[15px] card-lift">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div className="glass-panel p-6 md:p-8 rounded-2xl border border-border-base shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
                    <Coins className="w-5 h-5 text-warning" />
                    Economy Stats
                  </h3>
                </div>
                <div className="space-y-6 relative z-10">
                  <div>
                    <p className="text-[12px] font-bold text-text-secondary uppercase tracking-widest mb-1">Total Points Issued</p>
                    <p className="text-[36px] font-bold text-text-primary leading-none">1,492,050</p>
                  </div>
                  <div className="pt-6 border-t border-border-base">
                    <p className="text-[12px] font-bold text-text-secondary uppercase tracking-widest mb-1">Avg Points / Student</p>
                    <p className="text-[28px] font-bold text-text-primary leading-none">450</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 md:p-8 rounded-2xl bg-gradient-to-br from-tertiary/10 to-surface border border-tertiary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-tertiary/10 opacity-50">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-tertiary" />
                    <h3 className="font-bold text-[16px] text-tertiary uppercase tracking-wider">Economy Tip</h3>
                  </div>
                  <p className="text-[14px] text-text-primary leading-relaxed font-medium">
                    Keeping problem-solving points high encourages active learning over passive video watching. Consider a <strong className="text-tertiary">5:1 ratio</strong> between solving problems and passing quizzes to drive deeper engagement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
