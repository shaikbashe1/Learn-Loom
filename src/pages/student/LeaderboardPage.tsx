import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Zap, Flame, Medal } from 'lucide-react';
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

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

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
        setMyRank(me?.rank ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  const rankEmoji = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  const initials = (name: string | null) => (name ?? 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppLayout title="Leaderboard">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground text-balance">Global Leaderboard</h2>
          {myRank !== null && (
            <Badge className="bg-primary/15 text-primary border-primary/30">Your Rank: #{myRank}</Badge>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-muted rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-foreground">No rankings yet</p>
            <p className="text-sm">Complete modules to earn credits and appear here</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length >= 3 && (
              <div className="grid grid-cols-3 gap-4">
                {/* 2nd */}
                <div className="flex flex-col items-center pt-8">
                  <div className="relative mb-3">
                    <Avatar className="w-14 h-14 border-2 border-muted-foreground">
                      <AvatarFallback className="bg-muted text-muted-foreground text-lg font-bold">
                        {initials(topThree[1]?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -top-2 -right-2 text-lg">🥈</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground text-center text-balance">{topThree[1]?.full_name ?? 'Student'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className="w-3 h-3 text-chart-4" /><span className="text-xs font-bold text-chart-4">{topThree[1]?.credits ?? 0}</span>
                  </div>
                  <div className="w-full mt-3 bg-muted/50 rounded-t-lg h-16 flex items-end justify-center pb-2">
                    <span className="text-2xl font-bold text-muted-foreground">2</span>
                  </div>
                </div>
                {/* 1st */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <Avatar className="w-[72px] h-[72px] border-4 border-chart-4">
                      <AvatarFallback className="bg-chart-4/20 text-chart-4 text-xl font-bold">
                        {initials(topThree[0]?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -top-3 -right-2 text-xl">🥇</span>
                  </div>
                  <p className="text-sm font-bold text-foreground text-center text-balance">{topThree[0]?.full_name ?? 'Student'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className="w-3 h-3 text-chart-4" /><span className="text-xs font-bold text-chart-4">{topThree[0]?.credits ?? 0}</span>
                  </div>
                  <div className="w-full mt-3 bg-chart-4/20 rounded-t-lg h-24 flex items-end justify-center pb-2">
                    <span className="text-3xl font-bold text-chart-4">1</span>
                  </div>
                </div>
                {/* 3rd */}
                <div className="flex flex-col items-center pt-12">
                  <div className="relative mb-3">
                    <Avatar className="w-14 h-14 border-2 border-chart-5/60">
                      <AvatarFallback className="bg-chart-5/20 text-chart-5 text-lg font-bold">
                        {initials(topThree[2]?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -top-2 -right-2 text-lg">🥉</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground text-center text-balance">{topThree[2]?.full_name ?? 'Student'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className="w-3 h-3 text-chart-4" /><span className="text-xs font-bold text-chart-4">{topThree[2]?.credits ?? 0}</span>
                  </div>
                  <div className="w-full mt-3 bg-chart-5/15 rounded-t-lg h-12 flex items-end justify-center pb-2">
                    <span className="text-2xl font-bold text-chart-5/60">3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Full Rankings Table */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <Medal className="w-4 h-4 text-chart-4" /> Full Rankings
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {['Rank', 'Student', 'Credits', 'Streak', 'Courses', 'Certs'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(entry => (
                        <tr key={entry.user_id} className={`border-b border-border transition-colors ${entry.user_id === user?.id ? 'bg-primary/10' : 'hover:bg-muted/30'}`}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-sm font-bold ${Number(entry.rank) <= 3 ? 'text-chart-4' : 'text-muted-foreground'}`}>
                              {Number(entry.rank) <= 3 ? rankEmoji(Number(entry.rank)) : `#${entry.rank}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7 shrink-0">
                                <AvatarFallback className={`text-[10px] font-bold ${entry.user_id === user?.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  {initials(entry.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-foreground">{entry.full_name ?? 'Student'}</span>
                              {entry.user_id === user?.id && <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 py-0 h-4">You</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-chart-4" />
                              <span className="text-sm font-semibold text-chart-4">{entry.credits}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Flame className="w-3 h-3 text-chart-5" />
                              <span className="text-sm text-foreground">{entry.streak_days}d</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-foreground">{entry.courses_completed}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-foreground">{entry.certificates_earned}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
