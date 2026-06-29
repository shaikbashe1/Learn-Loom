import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Save, 
  Loader2, 
  Coins, 
  TrendingUp 
} from 'lucide-react';
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
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Rewards Configuration</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Manage how many credits and experience points students earn for completing actions on the platform.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm space-y-6 mt-4">
            <Skeleton className="h-10 w-1/3 rounded-xl bg-muted" />
            <Skeleton className="h-40 w-full rounded-xl bg-muted" />
            <Skeleton className="h-40 w-full rounded-xl bg-muted" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-2">
              <form onSubmit={handleSave} className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm flex flex-col gap-6">
                <div className="flex items-center gap-2.5 border-b border-border pb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                    <Trophy className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">Action Point Values</h2>
                </div>
                
                <div className="space-y-4">
                  {configs.map(config => (
                    <div 
                      key={config.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-background border border-border rounded-2xl shadow-sm hover:border-border/80 transition-colors group"
                    >
                      <div className="mb-4 sm:mb-0">
                        <Label className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {formatActionName(config.action_type)}
                        </Label>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2 font-semibold">
                          <span>System Action:</span>
                          <code className="bg-muted px-2 py-0.5 rounded border border-border font-mono text-[9px] text-foreground font-bold">
                            {config.action_type}
                          </code>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Input 
                          type="number" 
                          min={0}
                          className="w-28 bg-background border-border text-foreground text-center font-bold text-sm focus:ring-primary/20 shadow-inner h-11 rounded-xl" 
                          value={config.points}
                          onChange={e => updateConfig(config.id, parseInt(e.target.value) || 0)}
                          required
                        />
                        <span className="text-[10px] font-extrabold text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                          PTS
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-border flex justify-end mt-2">
                  <Button 
                    type="submit" 
                    disabled={saving} 
                    className="w-full sm:w-auto bg-primary text-primary-foreground font-bold py-3.5 px-8 flex items-center justify-center gap-2 rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.99] transition-all text-xs min-h-[44px]"
                  >
                    {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                    <span>Save Configuration</span>
                  </Button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Coins className="w-4.5 h-4.5 text-amber-500" />
                    <span>Economy Stats</span>
                  </h3>
                </div>
                
                <div className="space-y-6 relative z-10">
                  <div>
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Total Points Issued</p>
                    <p className="text-3xl font-extrabold text-foreground leading-none">1,492,050</p>
                  </div>
                  <div className="pt-6 border-t border-border">
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Avg Points / Student</p>
                    <p className="text-2xl font-extrabold text-foreground leading-none">450</p>
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-primary/5 opacity-50">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4.5 h-4.5 text-primary" />
                    <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Economy Tip</h3>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Keeping problem-solving points high encourages active learning over passive video watching. Consider a{' '}
                    <strong className="text-primary font-bold">5:1 ratio</strong> between solving problems and passing quizzes to drive deeper engagement.
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
