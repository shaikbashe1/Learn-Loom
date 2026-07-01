import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'Global' | 'College' | 'Friends'>('Global');

  const leaders = [
    { rank: 1, name: 'Alex Johnson', avatar: 'A', rating: 2450, solved: 450, xp: 12500 },
    { rank: 2, name: 'Sarah Williams', avatar: 'S', rating: 2320, solved: 412, xp: 11200 },
    { rank: 3, name: 'Michael Chen', avatar: 'M', rating: 2180, solved: 380, xp: 9800 },
    { rank: 4, name: 'Emily Davis', avatar: 'E', rating: 2050, solved: 310, xp: 8400 },
    { rank: 5, name: 'David Smith', avatar: 'D', rating: 1950, solved: 295, xp: 7600 },
  ];

  return (
    <AppLayout title="Coding Leaderboard">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="text-center space-y-2 mb-8">
          <span className="material-symbols-outlined text-[48px] text-[#facc15] drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">trophy</span>
          <h1 className="text-3xl font-bold font-display text-on-surface">Leaderboard</h1>
          <p className="text-on-surface-variant font-label-md">Compete with the best and climb the ranks.</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {['Global', 'College', 'Friends'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`px-4 py-2 rounded-full font-label-sm text-sm transition-colors ${tab === t ? 'bg-primary text-on-primary font-bold shadow-md' : 'bg-surface border border-outline-variant/60 text-on-surface-variant hover:text-on-surface'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <Card className="glass-panel border-outline-variant/60 overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 p-4 border-b border-outline-variant/60 bg-surface-container-lowest font-bold text-xs text-on-surface-variant uppercase tracking-wider">
            <div className="text-center">Rank</div>
            <div>User</div>
            <div className="text-center">Rating</div>
            <div className="text-center">Solved</div>
            <div className="text-right">XP</div>
          </div>
          
          <div className="divide-y divide-outline-variant/30">
            {leaders.map(l => (
              <div key={l.rank} className="grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 p-4 items-center hover:bg-surface-variant/20 transition-colors">
                <div className="text-center font-bold font-display text-lg">
                  {l.rank === 1 ? <span className="text-[#facc15]">1</span> : 
                   l.rank === 2 ? <span className="text-[#94a3b8]">2</span> :
                   l.rank === 3 ? <span className="text-[#b45309]">3</span> : l.rank}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                    {l.avatar}
                  </div>
                  <span className="font-medium text-on-surface">{l.name}</span>
                </div>
                <div className="text-center">
                  <Badge className="bg-primary/10 text-primary border-0">{l.rating}</Badge>
                </div>
                <div className="text-center text-sm font-medium text-on-surface-variant">
                  {l.solved}
                </div>
                <div className="text-right text-sm font-bold text-[#facc15]">
                  {l.xp.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
