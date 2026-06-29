import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Loading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  Trophy, 
  Zap, 
  Flame, 
  Filter, 
  Lock, 
  Award, 
  Coins, 
  Terminal, 
  Brain,
  Crown
} from 'lucide-react';

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

  return (
    <AppLayout>
      <div className="max-w-container-max mx-auto w-full space-y-8 animate-fade-in select-none">
        
        {/* Hero Banner Section */}
        <section className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-chart-4/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-6">
            <div className="text-center xl:text-left space-y-1.5">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Gamification</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Student Leaderboard</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Track performance, earn XP, and unlock exclusive rewards.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:w-auto">
              {/* Stat Card 1 */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border shadow-sm flex items-center gap-4 min-w-[160px] card-lift">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Rank</p>
                  <p className="text-lg text-foreground font-bold">{myEntry ? `#${myEntry.rank}` : '-'}</p>
                </div>
              </div>
              {/* Stat Card 2 */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border shadow-sm flex items-center gap-4 min-w-[160px] card-lift">
                <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center text-chart-4 shadow-inner">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total XP</p>
                  <p className="text-lg text-foreground font-bold">{currentXP.toLocaleString()}</p>
                </div>
              </div>
              {/* Stat Card 3 */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border shadow-sm flex items-center gap-4 min-w-[160px] card-lift">
                <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center text-chart-3 shadow-inner">
                  <Flame size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Streak</p>
                  <p className="text-lg text-foreground font-bold">{myEntry?.streak_days ?? 0} Days</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Loading key={i} variant="skeleton" className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No rankings yet"
            description="Complete modules to earn credits and appear here on the global leaderboard."
          />
        ) : (
          <>
            {/* Podium & Global Rankings Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Podium Area */}
              <div className="lg:col-span-7 bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col items-center justify-end min-h-[400px] relative overflow-hidden">
                <h3 className="text-base font-bold text-foreground absolute top-6 left-6 sm:left-8 flex items-center gap-2">
                  <Crown className="text-chart-3 w-5 h-5" /> Top Scholars
                </h3>
                
                <div className="flex flex-col sm:flex-row sm:items-end justify-center gap-4 sm:gap-8 w-full h-auto sm:h-[300px] mt-12 pb-4">
                  {/* Silver (2nd) */}
                  {second && (
                    <div className="flex sm:flex-col items-center justify-between sm:justify-end w-full sm:w-1/3 sm:max-w-[120px] p-3 sm:p-0 bg-muted/20 sm:bg-transparent border sm:border-0 border-border rounded-xl relative z-10 group card-lift order-2 sm:order-1">
                      <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:mb-3 transition-transform group-hover:-translate-y-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-muted overflow-hidden shadow-md relative bg-card flex items-center justify-center">
                          <UserAvatar src={second.avatar_url} name={second.full_name || ''} size="lg" />
                          <div className="absolute -bottom-1 -right-1 bg-muted text-muted-foreground rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-[12px] font-bold border-2 border-card shadow-sm">
                            2
                          </div>
                        </div>
                        <div className="text-left sm:text-center min-w-0">
                          <p className="text-xs font-bold text-foreground truncate max-w-[100px] sm:max-w-none">{second.full_name ?? 'Student'}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{second.credits >= 1000 ? `${(second.credits/1000).toFixed(1)}k` : second.credits} XP</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex w-full bg-gradient-to-t from-muted/50 to-muted/20 rounded-t-xl h-[120px] border border-border border-b-0 shadow-inner items-start justify-center pt-4">
                        <Award className="text-muted-foreground/40 w-8 h-8" />
                      </div>
                    </div>
                  )}

                  {/* Gold (1st) */}
                  {first && (
                    <div className="flex sm:flex-col items-center justify-between sm:justify-end w-full sm:w-1/3 sm:max-w-[140px] p-3 sm:p-0 bg-muted/20 sm:bg-transparent border sm:border-0 border-border rounded-xl relative z-20 group card-lift order-1 sm:order-2">
                      <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:mb-3 transition-transform group-hover:-translate-y-2">
                        <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full border-2 sm:border-4 border-chart-3 overflow-hidden shadow-lg relative bg-card flex items-center justify-center">
                          <UserAvatar src={first.avatar_url} name={first.full_name || ''} size="xl" />
                          <div className="absolute -bottom-1 -right-1 bg-chart-3 text-white rounded-full w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-[13px] font-bold border-2 border-card shadow-sm">
                            1
                          </div>
                        </div>
                        <div className="text-left sm:text-center min-w-0">
                          <p className="text-sm font-bold text-foreground truncate max-w-[110px] sm:max-w-none">{first.full_name ?? 'Student'}</p>
                          <p className="text-[10px] text-chart-3 font-bold">{first.credits >= 1000 ? `${(first.credits/1000).toFixed(1)}k` : first.credits} XP</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex w-full bg-gradient-to-t from-chart-3/20 to-chart-3/5 rounded-t-xl h-[160px] border border-chart-3/20 border-b-0 shadow-inner items-start justify-center pt-4">
                        <Crown className="text-chart-3 w-10 h-10" />
                      </div>
                    </div>
                  )}

                  {/* Bronze (3rd) */}
                  {third && (
                    <div className="flex sm:flex-col items-center justify-between sm:justify-end w-full sm:w-1/3 sm:max-w-[120px] p-3 sm:p-0 bg-muted/20 sm:bg-transparent border sm:border-0 border-border rounded-xl relative z-10 group card-lift order-3 sm:order-3">
                      <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:mb-3 transition-transform group-hover:-translate-y-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-orange-500/80 overflow-hidden shadow-md relative bg-card flex items-center justify-center">
                          <UserAvatar src={third.avatar_url} name={third.full_name || ''} size="lg" />
                          <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-[12px] font-bold border-2 border-card shadow-sm">
                            3
                          </div>
                        </div>
                        <div className="text-left sm:text-center min-w-0">
                          <p className="text-xs font-bold text-foreground truncate max-w-[100px] sm:max-w-none">{third.full_name ?? 'Student'}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{third.credits >= 1000 ? `${(third.credits/1000).toFixed(1)}k` : third.credits} XP</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex w-full bg-gradient-to-t from-orange-500/20 to-orange-500/5 rounded-t-xl h-[90px] border border-orange-500/20 border-b-0 shadow-inner items-start justify-center pt-4">
                        <Award className="text-orange-500/40 w-8 h-8" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Global Rankings List */}
              <div className="lg:col-span-5 bg-card border border-border rounded-2xl shadow-sm flex flex-col h-[400px]">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                  <h3 className="text-sm font-bold text-foreground">Global Rankings</h3>
                  <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-card border border-border px-2.5 py-1 rounded-lg shadow-sm">
                    <Filter size={12} /> Filter
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                  {tableEntries.map(entry => {
                    const isMe = entry.user_id === user?.id;
                    return (
                      <div key={entry.user_id} className={cn(
                        "flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer border shadow-sm",
                        isMe ? 'bg-primary/5 border-primary/25 card-lift' : 'bg-card border-border hover:border-primary/20 hover:shadow-md'
                      )}>
                        <span className={cn("text-xs w-6 text-center font-bold", isMe ? 'text-primary' : 'text-muted-foreground')}>{entry.rank}</span>
                        <UserAvatar src={entry.avatar_url} name={entry.full_name || ''} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate flex items-center gap-2">
                            {entry.full_name ?? 'Student'} 
                            {isMe && <span className="bg-primary text-primary-foreground text-[8px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider">You</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">Courses: {entry.courses_completed}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("text-xs font-bold", isMe ? 'text-primary' : 'text-foreground')}>{entry.credits.toLocaleString()} XP</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Achievement System & Rewards Grid */}
            <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Achievements */}
              <div className="md:col-span-7 bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Award className="text-primary w-5 h-5" /> Achievement Badges
                  </h3>
                  <button className="text-[10px] font-bold text-primary hover:opacity-80 transition-opacity uppercase tracking-wider bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/10">
                    View All
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Badge 1 */}
                  <div className="bg-muted/20 rounded-xl p-4 border border-border shadow-sm flex flex-col items-center text-center card-lift">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-inner">
                      <Terminal size={22} />
                    </div>
                    <h4 className="text-xs font-bold text-foreground mb-1">Coding Master</h4>
                    <p className="text-[10px] text-muted-foreground leading-snug">Complete 50 coding exercises</p>
                  </div>
                  {/* Badge 2 */}
                  <div className="bg-muted/20 rounded-xl p-4 border border-border shadow-sm flex flex-col items-center text-center card-lift">
                    <div className="w-12 h-12 rounded-xl bg-chart-4/10 flex items-center justify-center text-chart-4 mb-3 shadow-inner">
                      <Brain size={22} />
                    </div>
                    <h4 className="text-xs font-bold text-foreground mb-1">AI Explorer</h4>
                    <p className="text-[10px] text-muted-foreground leading-snug">Finish AI Foundations course</p>
                  </div>
                  {/* Badge 3 (Locked) */}
                  <div className="bg-muted/10 rounded-xl p-4 border border-dashed border-border flex flex-col items-center text-center opacity-60">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-3 shadow-inner">
                      <Lock size={20} />
                    </div>
                    <h4 className="text-xs font-bold text-muted-foreground mb-1">Team Player</h4>
                    <p className="text-[10px] text-muted-foreground/80 leading-snug">Help 10 peers in forums</p>
                  </div>
                </div>
              </div>

              {/* Rewards Store */}
              <div className="md:col-span-5 bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Coins className="text-chart-3 w-5 h-5" /> Rewards Store
                  </h3>
                  <div className="bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 shadow-sm">
                    <span className="text-[10px] text-primary font-bold tracking-wider">BAL: {currentXP.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  {/* Reward Item 1 */}
                  <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/30 transition-all duration-300 shadow-sm card-lift">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center text-primary shadow-inner border border-border shrink-0">
                        <Award size={20} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground mb-0.5 truncate">1-on-1 Mentoring</h4>
                        <p className="text-[10px] text-muted-foreground truncate">30 min with expert</p>
                      </div>
                    </div>
                    <button className="bg-primary/10 text-primary font-bold text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1 border border-primary/10 shadow-sm shrink-0">
                      1,500 <Coins size={10} />
                    </button>
                  </div>
                  {/* Reward Item 2 */}
                  <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/30 transition-all duration-300 shadow-sm card-lift">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center text-primary shadow-inner border border-border shrink-0">
                        <Brain size={20} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground mb-0.5 truncate">Advanced Module</h4>
                        <p className="text-[10px] text-muted-foreground truncate">Access hidden content</p>
                      </div>
                    </div>
                    <button className="bg-primary/10 text-primary font-bold text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1 border border-primary/10 shadow-sm shrink-0">
                      800 <Coins size={10} />
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
