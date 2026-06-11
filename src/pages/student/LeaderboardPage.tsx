import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  streak_days: number;
  courses_completed: number;
  certificates_earned: number;
  rank: number;
}

function initials(name: string | null) {
  return (name ?? 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getTier(rank: number, credits: number) {
  if (rank === 1) return { name: 'Diamond', color: 'text-primary bg-primary/20 border-primary/30' };
  if (rank <= 3) return { name: 'Platinum', color: 'text-tertiary bg-tertiary/10 border-tertiary/20' };
  if (credits >= 10000) return { name: 'Gold', color: 'text-on-surface-variant bg-surface-container-highest border-outline-variant/50' };
  return { name: 'Silver', color: 'text-on-surface-variant bg-surface-container-highest border-outline-variant/50' };
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('leaderboard_view')
        .select('*')
        .limit(50);
      setEntries(Array.isArray(data) ? data : []);
      if (user && data) {
        const me = (data as LeaderboardEntry[]).find(e => e.user_id === user.id);
        setMyEntry(me ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  const topThree = entries.slice(0, 3);
  const tableEntries = entries.slice(3);

  // If topThree doesn't have 3, we just map what we have, but the design expects exactly 3 for the podium.
  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  const currentXP = myEntry?.credits ?? 0;
  const nextTierXP = currentXP < 5000 ? 5000 : currentXP < 10000 ? 10000 : currentXP < 15000 ? 15000 : 20000;
  const xpNeeded = nextTierXP - currentXP;
  const progressPercent = Math.min(100, Math.max(0, (currentXP / nextTierXP) * 100));
  const myTier = getTier(myEntry?.rank ?? 999, myEntry?.credits ?? 0);

  return (
    <AppLayout title="Leaderboard">
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        {/* Hero Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-surface mb-2 tracking-tight">Leaderboard</h1>
            <p className="text-body-md font-body-md text-on-surface-variant flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-surface-container-high border border-outline-variant/30 text-on-surface">Season 4, Week 2</span>
              <span className="flex items-center gap-1 text-tertiary-fixed-dim text-sm">
                <span className="material-symbols-outlined text-[16px]">schedule</span> 3d 14h remaining
              </span>
            </p>
          </div>
          {/* View Tabs */}
          <div className="flex p-1 bg-surface-container border border-outline-variant/30 rounded-lg w-full md:w-auto overflow-x-auto no-scrollbar">
            <button className="flex-1 md:flex-none px-4 py-1.5 text-label-md font-label-md bg-surface-container-high text-primary rounded shadow-sm border border-outline-variant/50 whitespace-nowrap">Global</button>
            <button className="flex-1 md:flex-none px-4 py-1.5 text-label-md font-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 rounded transition-colors whitespace-nowrap">Community</button>
            <button className="flex-1 md:flex-none px-4 py-1.5 text-label-md font-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 rounded transition-colors whitespace-nowrap">Friends</button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-surface border border-outline-variant/30 rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-outline-variant/60 rounded-xl bg-surface-container-low text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] opacity-40 mb-3">emoji_events</span>
            <p className="font-headline-sm text-on-surface">No rankings yet</p>
            <p className="text-body-sm mt-1">Complete modules to earn credits and appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
            {/* Main Content Column */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-xl">
              {/* Top 3 Podium (Bento Grid Style) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md items-end pt-8">
                {/* 2nd Place */}
                {second && (
                  <div className="glass-panel podium-glow-2 rounded-2xl p-6 flex flex-col items-center relative order-2 md:order-1 transform transition-transform hover:-translate-y-1">
                    <div className="absolute -top-6 bg-surface-container-high border border-outline-variant/50 w-12 h-12 rounded-full flex items-center justify-center text-secondary font-bold font-mono text-lg z-10 shadow-lg">2</div>
                    {second.avatar_url ? (
                       <img src={second.avatar_url} alt="2nd Place User" className="w-20 h-20 rounded-full border-2 border-secondary/50 mb-4 object-cover" />
                    ) : (
                       <div className="w-20 h-20 rounded-full border-2 border-secondary/50 mb-4 bg-surface-container-high flex items-center justify-center text-on-surface font-bold text-2xl">{initials(second.full_name)}</div>
                    )}
                    <h3 className="text-body-lg font-body-lg text-on-surface font-semibold mb-1">{second.full_name ?? 'Student'}</h3>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono border mb-3 uppercase tracking-wider ${getTier(2, second.credits).color}`}>{getTier(2, second.credits).name}</span>
                    <div className="text-center w-full pt-3 border-t border-outline-variant/30">
                      <span className="text-headline-md font-headline-md text-on-surface font-bold">{second.credits.toLocaleString()}</span>
                      <span className="text-label-sm font-label-sm text-on-surface-variant block mt-0.5 font-mono">XP</span>
                    </div>
                  </div>
                )}
                
                {/* 1st Place */}
                {first && (
                  <div className="glass-panel podium-glow-1 rounded-2xl p-8 flex flex-col items-center relative order-1 md:order-2 border-primary/40 bg-primary/5 md:-mt-8 transform transition-transform hover:-translate-y-2">
                    <div className="absolute -top-8 bg-surface-container-highest border-2 border-primary w-16 h-16 rounded-full flex items-center justify-center text-primary font-bold font-mono text-xl z-10 shadow-xl shadow-primary/20">
                      <span className="material-symbols-outlined text-[28px] fill">emoji_events</span>
                    </div>
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse opacity-50 blur-sm"></div>
                      {first.avatar_url ? (
                         <img src={first.avatar_url} alt="1st Place User" className="w-24 h-24 rounded-full border-4 border-primary relative z-10 object-cover" />
                      ) : (
                         <div className="w-24 h-24 rounded-full border-4 border-primary relative z-10 bg-surface-container-highest flex items-center justify-center text-primary font-bold text-3xl">{initials(first.full_name)}</div>
                      )}
                    </div>
                    <h3 className="text-headline-md font-headline-md text-on-surface font-bold mb-1 text-center">{first.full_name ?? 'Student'}</h3>
                    <span className={`px-3 py-1 rounded text-[11px] font-mono border mb-4 uppercase tracking-wider font-semibold ${getTier(1, first.credits).color}`}>{getTier(1, first.credits).name}</span>
                    <div className="text-center w-full pt-4 border-t border-primary/20">
                      <span className="text-display font-display text-primary font-bold text-[36px]">{first.credits.toLocaleString()}</span>
                      <span className="text-label-sm font-label-sm text-on-surface-variant block mt-1 font-mono">XP</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {third && (
                  <div className="glass-panel podium-glow-3 rounded-2xl p-6 flex flex-col items-center relative order-3 md:order-3 transform transition-transform hover:-translate-y-1">
                    <div className="absolute -top-6 bg-surface-container-high border border-outline-variant/50 w-12 h-12 rounded-full flex items-center justify-center text-tertiary font-bold font-mono text-lg z-10 shadow-lg">3</div>
                    {third.avatar_url ? (
                       <img src={third.avatar_url} alt="3rd Place User" className="w-20 h-20 rounded-full border-2 border-tertiary/50 mb-4 object-cover" />
                    ) : (
                       <div className="w-20 h-20 rounded-full border-2 border-tertiary/50 mb-4 bg-surface-container-high flex items-center justify-center text-on-surface font-bold text-2xl">{initials(third.full_name)}</div>
                    )}
                    <h3 className="text-body-lg font-body-lg text-on-surface font-semibold mb-1">{third.full_name ?? 'Student'}</h3>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono border mb-3 uppercase tracking-wider ${getTier(3, third.credits).color}`}>{getTier(3, third.credits).name}</span>
                    <div className="text-center w-full pt-3 border-t border-outline-variant/30">
                      <span className="text-headline-md font-headline-md text-on-surface font-bold">{third.credits.toLocaleString()}</span>
                      <span className="text-label-sm font-label-sm text-on-surface-variant block mt-0.5 font-mono">XP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ranking Table */}
              <div className="bg-surface-container border border-outline-variant/40 rounded-xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/40 bg-surface-container-low/50">
                        <th className="px-6 py-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-mono w-16">Rank</th>
                        <th className="px-6 py-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-mono">Developer</th>
                        <th className="px-6 py-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-mono hidden sm:table-cell">Tier</th>
                        <th className="px-6 py-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-mono hidden md:table-cell text-right">Courses</th>
                        <th className="px-6 py-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-mono text-right">Total XP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {tableEntries.map(entry => {
                        const isMe = entry.user_id === user?.id;
                        const tierInfo = getTier(Number(entry.rank), entry.credits);
                        return (
                          <tr key={entry.user_id} className={`transition-colors group ${isMe ? 'bg-primary/5 border-l-2 border-primary hover:bg-primary/10 relative' : 'hover:bg-surface-container-high/50'}`}>
                            <td className={`px-6 py-4 text-body-md font-mono ${isMe ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{entry.rank}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {entry.avatar_url ? (
                                  <img src={entry.avatar_url} alt="Avatar" className={`w-8 h-8 rounded-full object-cover border ${isMe ? 'border-primary/50' : 'border-outline-variant/50'}`} />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full border ${isMe ? 'border-primary/50 bg-primary/20 text-primary' : 'border-outline-variant/50 bg-surface-container-high text-on-surface'} flex items-center justify-center text-xs font-bold`}>
                                    {initials(entry.full_name)}
                                  </div>
                                )}
                                <span className={`text-body-md font-body-md font-medium transition-colors ${isMe ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'}`}>
                                  {entry.full_name ?? 'Student'} {isMe && '(You)'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${tierInfo.color}`}>
                                {tierInfo.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell text-right text-body-sm font-mono text-on-surface-variant">{entry.courses_completed}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-body-md font-mono font-bold ${isMe ? 'text-primary' : 'text-on-surface'}`}>{entry.credits.toLocaleString()}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {tableEntries.length > 0 && (
                  <div className="p-4 border-t border-outline-variant/30 flex justify-center bg-surface-container-low/30">
                    <button className="text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                      Load More <span className="material-symbols-outlined text-[16px]">expand_more</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Progress Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="sticky top-24 flex flex-col gap-md">
                
                {/* Your Stats Card */}
                {user && (
                  <div className="bg-surface-container border border-outline-variant/40 rounded-xl p-6 relative overflow-hidden">
                    {/* Background accent */}
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                    <h2 className="text-headline-md font-headline-md text-on-surface mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">person</span> Your Status
                    </h2>
                    
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-mono mb-1">Current Rank</p>
                        <div className="flex items-end gap-1">
                          <span className="text-display font-display text-on-surface font-bold">{myEntry ? `#${myEntry.rank}` : '-'}</span>
                          {myEntry && (
                            <span className="text-sm text-tertiary mb-1.5 flex items-center">
                              <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 3
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-mono mb-1">Tier</p>
                        <span className={`px-3 py-1 rounded text-xs font-mono border uppercase tracking-wider inline-block ${myTier.color}`}>
                          {myTier.name}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-label-sm font-label-sm mb-2 font-mono">
                        <span className="text-primary font-semibold">{currentXP.toLocaleString()} XP</span>
                        <span className="text-on-surface-variant">{nextTierXP.toLocaleString()} XP ({currentXP >= 10000 ? 'Diamond' : currentXP >= 5000 ? 'Gold' : 'Silver'})</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/20 relative">
                        <div 
                          className="absolute top-0 left-0 h-full bg-primary rounded-full shadow-[0_0_10px_rgba(192,193,255,0.5)] transition-all duration-1000"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-2 font-mono">{xpNeeded.toLocaleString()} XP needed for next tier</p>
                    </div>

                    {/* Weekly Growth Sparkline (SVG) */}
                    <div className="pt-4 border-t border-outline-variant/30">
                      <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-mono mb-3">Weekly Growth</p>
                      <div className="h-16 w-full relative">
                        <svg className="w-full h-full overflow-visible preserve-aspect-ratio=none" viewBox="0 0 100 40">
                          <path className="text-primary sparkline-path" d="M0,35 L10,30 L20,32 L30,20 L40,25 L50,15 L60,18 L70,5 L80,10 L90,2 L100,0" fill="none" stroke="currentColor" strokeWidth="2"></path>
                          <path d="M0,35 L10,30 L20,32 L30,20 L40,25 L50,15 L60,18 L70,5 L80,10 L90,2 L100,0 L100,40 L0,40 Z" fill="url(#sparkline-gradient)" opacity="0.1"></path>
                          <defs>
                            <linearGradient id="sparkline-gradient" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="var(--color-primary)"></stop>
                              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0"></stop>
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mini Promo/Info Card */}
                <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-5">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center shrink-0 text-tertiary">
                      <span className="material-symbols-outlined">rocket_launch</span>
                    </div>
                    <div>
                      <h3 className="text-label-md font-label-md text-on-surface font-semibold mb-1">Weekend Boost</h3>
                      <p className="text-body-sm font-body-sm text-on-surface-variant mb-3">Earn 1.5x XP on all Advanced Algorithm courses this weekend.</p>
                      <a href="/student/courses" className="text-label-sm font-label-sm text-tertiary hover:underline font-mono inline-flex items-center gap-1">
                        View Courses <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
