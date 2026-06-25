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
  if (rank === 1) return { name: 'Diamond', color: 'text-primary bg-primary/10 border-primary/30' };
  if (rank <= 3) return { name: 'Platinum', color: 'text-tertiary bg-tertiary/10 border-tertiary/20' };
  if (credits >= 10000) return { name: 'Gold', color: 'text-warning bg-warning/10 border-warning/30' };
  return { name: 'Silver', color: 'text-text-secondary bg-surface-container border-border-base' };
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

  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  const currentXP = myEntry?.credits ?? 0;
  const nextTierXP = currentXP < 5000 ? 5000 : currentXP < 10000 ? 10000 : currentXP < 15000 ? 15000 : 20000;
  const xpNeeded = nextTierXP - currentXP;
  const progressPercent = Math.min(100, Math.max(0, (currentXP / nextTierXP) * 100));
  const myTier = getTier(myEntry?.rank ?? 999, myEntry?.credits ?? 0);

  return (
    <AppLayout title="Leaderboard & Gamification">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg w-full relative">
        
        {/* Hero Section: Stats */}
        <section className="mb-stack-lg relative z-10">
          <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden ai-gradient-border shadow-sm card-lift">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-tertiary-container/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-6">
              <div className="text-center xl:text-left">
                <h2 className="font-headline-lg text-[28px] sm:text-[32px] font-bold text-primary mb-2">Student Leaderboard</h2>
                <p className="font-body-lg text-sm sm:text-[16px] text-text-secondary">Track performance, earn XP, and unlock exclusive rewards.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:w-auto">
                {/* Stat Card 1 */}
                <div className="bg-surface rounded-xl p-4 border border-border-base shadow-sm flex items-center gap-4 min-w-[160px] card-lift">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-[11px] font-bold text-text-secondary uppercase tracking-widest">Current Rank</p>
                    <p className="font-headline-md text-[24px] text-text-primary font-bold">{myEntry ? `#${myEntry.rank}` : '-'}</p>
                  </div>
                </div>
                {/* Stat Card 2 */}
                <div className="bg-surface rounded-xl p-4 border border-border-base shadow-sm flex items-center gap-4 min-w-[160px] card-lift">
                  <div className="w-12 h-12 rounded-full bg-tertiary-container/10 flex items-center justify-center text-tertiary shadow-inner">
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-[11px] font-bold text-text-secondary uppercase tracking-widest">Total XP</p>
                    <p className="font-headline-md text-[24px] text-text-primary font-bold">{currentXP.toLocaleString()}</p>
                  </div>
                </div>
                {/* Stat Card 3 */}
                <div className="bg-surface rounded-xl p-4 border border-border-base shadow-sm flex items-center gap-4 min-w-[160px] card-lift">
                  <div className="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary shadow-inner">
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-[11px] font-bold text-text-secondary uppercase tracking-widest">Streak</p>
                    <p className="font-headline-md text-[24px] text-text-primary font-bold">{myEntry?.streak_days ?? 0} Days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-surface border border-border-base rounded-2xl shadow-sm" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border-base rounded-2xl bg-surface/50 text-text-secondary shadow-sm">
            <span className="material-symbols-outlined text-[48px] opacity-30 mb-4">emoji_events</span>
            <p className="font-headline-md text-[20px] font-bold text-text-primary">No rankings yet</p>
            <p className="font-body-md text-[15px] mt-2">Complete modules to earn credits and appear here.</p>
          </div>
        ) : (
          <>
            {/* Podium & Global Rankings Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-stack-lg relative z-10">
              
              {/* Podium Area */}
              <div className="lg:col-span-7 glass-panel rounded-2xl border border-border-base shadow-sm p-6 sm:p-8 flex flex-col items-center justify-end min-h-[400px] relative overflow-hidden">
                <h3 className="font-headline-md text-[24px] font-bold text-primary absolute top-6 left-6 sm:left-8">Top Scholars</h3>
                <div className="flex flex-col sm:flex-row sm:items-end justify-center gap-4 sm:gap-8 w-full h-auto sm:h-[300px] mt-10 sm:mt-12 pb-4">
                  {/* Silver (2nd) */}
                  {second && (
                    <div className="flex sm:flex-col items-center justify-between sm:justify-end w-full sm:w-1/3 sm:max-w-[120px] p-3 sm:p-0 bg-surface sm:bg-transparent border sm:border-0 border-border-base rounded-xl relative z-10 group card-lift order-2 sm:order-1">
                      <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:mb-3 transition-transform group-hover:-translate-y-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-gray-300 overflow-hidden shadow-md relative bg-surface flex items-center justify-center">
                          {second.avatar_url ? <img src={second.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-bold text-lg sm:text-[20px] text-text-secondary">{initials(second.full_name)}</span>}
                          <div className="absolute -bottom-1 -right-1 bg-gray-300 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-[12px] font-bold text-gray-800 border-2 border-white shadow-sm">2</div>
                        </div>
                        <div className="text-left sm:text-center">
                          <p className="font-label-md text-[14px] font-bold text-text-primary truncate max-w-[100px] sm:max-w-none">{second.full_name ?? 'Student'}</p>
                          <p className="font-label-sm text-[12px] text-text-secondary font-bold">{second.credits >= 1000 ? `${(second.credits/1000).toFixed(1)}k` : second.credits} XP</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex w-full bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-xl h-[120px] border border-gray-300 border-b-0 shadow-[0_0_20px_rgba(156,163,175,0.4)] items-start justify-center pt-4">
                        <span className="material-symbols-outlined text-gray-400 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                      </div>
                    </div>
                  )}
                  {/* Gold (1st) */}
                  {first && (
                    <div className="flex sm:flex-col items-center justify-between sm:justify-end w-full sm:w-1/3 sm:max-w-[140px] p-3 sm:p-0 bg-surface sm:bg-transparent border sm:border-0 border-border-base rounded-xl relative z-20 group card-lift order-1 sm:order-2">
                      <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:mb-3 transition-transform group-hover:-translate-y-2">
                        <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full border-2 sm:border-4 border-yellow-400 overflow-hidden shadow-lg relative bg-surface flex items-center justify-center">
                          {first.avatar_url ? <img src={first.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-bold text-lg sm:text-[24px] text-text-secondary">{initials(first.full_name)}</span>}
                          <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-[13px] font-bold text-yellow-900 border-2 border-white shadow-sm">1</div>
                        </div>
                        <div className="text-left sm:text-center">
                          <p className="font-label-md text-[14px] sm:text-[15px] font-bold text-text-primary truncate max-w-[100px] sm:max-w-none">{first.full_name ?? 'Student'}</p>
                          <p className="font-label-sm text-[12px] sm:text-[13px] text-yellow-600 font-bold">{first.credits >= 1000 ? `${(first.credits/1000).toFixed(1)}k` : first.credits} XP</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex w-full bg-gradient-to-t from-yellow-200 to-yellow-100 rounded-t-xl h-[160px] border border-yellow-300 border-b-0 shadow-[0_0_30px_rgba(250,204,21,0.4)] items-start justify-center pt-4">
                        <span className="material-symbols-outlined text-yellow-500 text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                      </div>
                    </div>
                  )}
                  {/* Bronze (3rd) */}
                  {third && (
                    <div className="flex sm:flex-col items-center justify-between sm:justify-end w-full sm:w-1/3 sm:max-w-[120px] p-3 sm:p-0 bg-surface sm:bg-transparent border sm:border-0 border-border-base rounded-xl relative z-10 group card-lift order-3 sm:order-3">
                      <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:mb-3 transition-transform group-hover:-translate-y-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-amber-600 overflow-hidden shadow-md relative bg-surface flex items-center justify-center">
                          {third.avatar_url ? <img src={third.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-bold text-lg sm:text-[20px] text-text-secondary">{initials(third.full_name)}</span>}
                          <div className="absolute -bottom-1 -right-1 bg-amber-600 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-[12px] font-bold text-white border-2 border-white shadow-sm">3</div>
                        </div>
                        <div className="text-left sm:text-center">
                          <p className="font-label-md text-[14px] font-bold text-text-primary truncate max-w-[100px] sm:max-w-none">{third.full_name ?? 'Student'}</p>
                          <p className="font-label-sm text-[12px] text-text-secondary font-bold">{third.credits >= 1000 ? `${(third.credits/1000).toFixed(1)}k` : third.credits} XP</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex w-full bg-gradient-to-t from-amber-200/50 to-amber-100/50 rounded-t-xl h-[90px] border border-amber-300 border-b-0 shadow-[0_0_20px_rgba(180,83,9,0.4)] items-start justify-center pt-4">
                        <span className="material-symbols-outlined text-amber-700 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Global Rankings List */}
              <div className="lg:col-span-5 glass-panel rounded-2xl border border-border-base shadow-sm flex flex-col h-[400px]">
                <div className="p-6 border-b border-border-base flex justify-between items-center bg-surface-bright/50 rounded-t-2xl">
                  <h3 className="font-headline-md text-[20px] font-bold text-primary">Global Rankings</h3>
                  <button className="text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-label-sm text-[12px] font-bold uppercase tracking-wider bg-surface border border-border-base px-2 py-1 rounded shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">filter_list</span> Filter
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {tableEntries.map(entry => {
                    const isMe = entry.user_id === user?.id;
                    return (
                      <div key={entry.user_id} className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer group shadow-sm border ${isMe ? 'bg-primary/5 border-primary/30 card-lift' : 'bg-surface border-border-base hover:border-primary/30 hover:shadow-md'}`}>
                        <span className={`font-label-md text-[15px] w-6 text-center font-bold ${isMe ? 'text-primary' : 'text-text-secondary'}`}>{entry.rank}</span>
                        {entry.avatar_url ? (
                           <img src={entry.avatar_url} alt="Avatar" className={`w-10 h-10 rounded-full object-cover border ${isMe ? 'border-primary' : 'border-border-base'}`} />
                        ) : (
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] border ${isMe ? 'bg-primary/20 text-primary border-primary' : 'bg-surface-container text-text-secondary border-border-base'}`}>
                             {initials(entry.full_name)}
                           </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-body-md text-[15px] font-bold text-text-primary truncate flex items-center gap-2">
                            {entry.full_name ?? 'Student'} {isMe && <span className="bg-primary text-white text-[10px] font-label-sm px-2 py-0.5 rounded-full uppercase tracking-wider">You</span>}
                          </p>
                          <p className="font-body-sm text-[12px] text-text-secondary truncate">Courses: {entry.courses_completed}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-label-md text-[14px] font-bold ${isMe ? 'text-primary' : 'text-text-primary group-hover:text-primary transition-colors'}`}>{entry.credits.toLocaleString()} XP</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Achievement System & Rewards Grid */}
            <section className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
              
              {/* Achievements */}
              <div className="md:col-span-7 glass-panel rounded-2xl p-6 md:p-8 ai-gradient-border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline-md text-[20px] font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">military_tech</span> Achievement Badges
                  </h3>
                  <button className="font-label-sm text-[12px] font-bold text-primary hover:text-primary-container transition-colors uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">View All</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Badge 1 */}
                  <div className="bg-surface rounded-xl p-5 border border-border-base shadow-sm flex flex-col items-center text-center card-lift">
                    <div className="w-14 h-14 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary mb-3 border border-secondary-container shadow-inner">
                      <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
                    </div>
                    <h4 className="font-label-md text-[14px] font-bold text-text-primary mb-1">Coding Master</h4>
                    <p className="font-body-sm text-[11px] text-text-secondary leading-tight">Complete 50 coding exercises</p>
                  </div>
                  {/* Badge 2 */}
                  <div className="bg-surface rounded-xl p-5 border border-border-base shadow-sm flex flex-col items-center text-center card-lift">
                    <div className="w-14 h-14 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary mb-3 border border-tertiary/30 shadow-inner">
                      <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    </div>
                    <h4 className="font-label-md text-[14px] font-bold text-text-primary mb-1">AI Explorer</h4>
                    <p className="font-body-sm text-[11px] text-text-secondary leading-tight">Finish AI Foundations course</p>
                  </div>
                  {/* Badge 3 (Locked) */}
                  <div className="bg-surface/50 rounded-xl p-5 border border-dashed border-border-base flex flex-col items-center text-center opacity-70">
                    <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-secondary mb-3 border border-border-base shadow-inner">
                      <span className="material-symbols-outlined text-[28px]">lock</span>
                    </div>
                    <h4 className="font-label-md text-[14px] font-bold text-text-secondary mb-1">Team Player</h4>
                    <p className="font-body-sm text-[11px] text-text-secondary leading-tight">Help 10 peers in forums</p>
                  </div>
                </div>
              </div>

              {/* Rewards Store */}
              <div className="md:col-span-5 glass-panel rounded-2xl border border-border-base shadow-sm p-6 md:p-8 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline-md text-[20px] font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Rewards Store
                  </h3>
                  <div className="bg-surface-container-low px-3 py-1.5 rounded-full border border-primary/20 shadow-sm">
                    <span className="font-label-sm text-[12px] text-primary font-bold tracking-wide">Bal: {currentXP.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  {/* Reward Item 1 */}
                  <div className="flex items-center justify-between p-4 bg-surface border border-border-base rounded-xl hover:border-primary/50 transition-colors shadow-sm card-lift">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary shadow-inner border border-border-base">
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>card_membership</span>
                      </div>
                      <div>
                        <h4 className="font-body-md text-[15px] font-bold text-text-primary mb-0.5">1-on-1 Mentoring</h4>
                        <p className="font-body-sm text-[12px] text-text-secondary">30 min with expert</p>
                      </div>
                    </div>
                    <button className="bg-primary/10 text-primary font-label-sm text-[12px] font-bold px-3 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center gap-1 border border-primary/20 shadow-sm">
                      1,500 <span className="material-symbols-outlined text-[14px]">stars</span>
                    </button>
                  </div>
                  {/* Reward Item 2 */}
                  <div className="flex items-center justify-between p-4 bg-surface border border-border-base rounded-xl hover:border-primary/50 transition-colors shadow-sm card-lift">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary shadow-inner border border-border-base">
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>extension</span>
                      </div>
                      <div>
                        <h4 className="font-body-md text-[15px] font-bold text-text-primary mb-0.5">Advanced Module</h4>
                        <p className="font-body-sm text-[12px] text-text-secondary">Access hidden content</p>
                      </div>
                    </div>
                    <button className="bg-primary/10 text-primary font-label-sm text-[12px] font-bold px-3 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center gap-1 border border-primary/20 shadow-sm">
                      800 <span className="material-symbols-outlined text-[14px]">stars</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
