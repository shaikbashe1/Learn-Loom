import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';

export default function AchievementsPage() {
  const achievements = [
    { title: 'First Problem', desc: 'Solve your first problem', icon: 'flag', color: 'text-[#4ade80]', bg: 'bg-[#4ade80]/10', earned: true },
    { title: '10 Problems', desc: 'Solve 10 problems', icon: 'looks_one', color: 'text-primary', bg: 'bg-primary/10', earned: true },
    { title: '50 Problems', desc: 'Solve 50 problems', icon: 'looks_5', color: 'text-tertiary', bg: 'bg-tertiary/10', earned: false },
    { title: '100 Problems', desc: 'Solve 100 problems', icon: '100', color: 'text-[#facc15]', bg: 'bg-[#facc15]/10', earned: false },
    { title: '7 Day Streak', desc: 'Maintain a 7-day coding streak', icon: 'local_fire_department', color: 'text-error', bg: 'bg-error/10', earned: true },
    { title: '30 Day Streak', desc: 'Maintain a 30-day coding streak', icon: 'whatshot', color: 'text-error', bg: 'bg-error/10', earned: false },
    { title: 'Java Master', desc: 'Solve 50 problems in Java', icon: 'coffee', color: 'text-[#b45309]', bg: 'bg-[#b45309]/10', earned: false },
    { title: 'DSA Master', desc: 'Complete the DSA roadmap', icon: 'account_tree', color: 'text-primary', bg: 'bg-primary/10', earned: false },
    { title: 'Contest Winner', desc: 'Rank #1 in a weekly contest', icon: 'emoji_events', color: 'text-[#facc15]', bg: 'bg-[#facc15]/10', earned: false },
  ];

  return (
    <AppLayout title="Achievements">
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Achievements & Badges</h1>
          <p className="text-on-surface-variant font-label-md mt-1">Unlock badges by completing milestones and demonstrating your skills.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {achievements.map((a, i) => (
            <Card key={i} className={`border-outline-variant/60 transition-all ${a.earned ? 'glass-panel shadow-sm hover:shadow-md' : 'bg-surface-variant/30 opacity-60 grayscale hover:grayscale-0'}`}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className={`w-20 h-20 rounded-full ${a.bg} flex items-center justify-center ${a.color} shadow-inner`}>
                  <span className="material-symbols-outlined text-[40px]">{a.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold font-display text-lg text-on-surface">{a.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-1">{a.desc}</p>
                </div>
                {a.earned && (
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Earned</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
