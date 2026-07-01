import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  earned: boolean;
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const { data: allBadges, error: bError } = await supabase.from('badges').select('*');
        if (bError) throw bError;

        let userBadgeIds = new Set<string>();
        if (user) {
          const { data: userBadges, error: uError } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', user.id);
          if (!uError && userBadges) {
            userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
          }
        }

        const formatted = allBadges.map((b: any) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          icon_url: b.icon_url,
          earned: userBadgeIds.has(b.id)
        }));

        setAchievements(formatted);
      } catch (e: any) {
        toast.error('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    }
    fetchBadges();
  }, [user]);

  return (
    <AppLayout title="Achievements">
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Achievements & Badges</h1>
          <p className="text-on-surface-variant font-label-md mt-1">Unlock badges by completing milestones and demonstrating your skills.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {achievements.map((a, i) => {
              const bg = a.earned ? 'bg-primary/20' : 'bg-surface-variant/50';
              const color = a.earned ? 'text-primary' : 'text-on-surface-variant';
              
              return (
                <Card key={i} className={`border-outline-variant/60 transition-all ${a.earned ? 'glass-panel shadow-sm hover:shadow-md' : 'bg-surface-variant/30 opacity-60 grayscale hover:grayscale-0'}`}>
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className={`w-20 h-20 rounded-full ${bg} flex items-center justify-center ${color} shadow-inner`}>
                      <span className="material-symbols-outlined text-[40px]">{a.icon_url}</span>
                    </div>
                    <div>
                      <h3 className="font-bold font-display text-lg text-on-surface">{a.name}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">{a.description}</p>
                    </div>
                    {a.earned && (
                      <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Earned</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
