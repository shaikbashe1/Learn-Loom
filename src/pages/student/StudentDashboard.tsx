import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Zap, Flame, Trophy, BookOpen, Brain, Code2, Target,
  ChevronRight, TrendingUp, Clock, Play, ArrowRight, CheckCircle,
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { DBCourse, DBEnrollment, DBModule, LeaderboardEntry } from '@/types/types';

type EnrollWithCourse = DBEnrollment & {
  course: DBCourse;
  last_module: DBModule | null;
};

const quickActions = [
  { label: 'AI Mentor',       path: '/ai-mentor',   icon: Brain,   color: 'bg-primary/10 text-primary' },
  { label: 'AI Roadmap',      path: '/ai-roadmap',  icon: Target,  color: 'bg-chart-4/10 text-chart-4' },
  { label: 'Coding Practice', path: '/coding',      icon: Code2,   color: 'bg-chart-3/10 text-chart-3' },
  { label: 'Leaderboard',     path: '/leaderboard', icon: Trophy,  color: 'bg-chart-5/10 text-chart-5' },
];

function initials(name: string | null) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollWithCourse[]>([]);
  const [recommended, setRecommended] = useState<DBCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [topLeaders, setTopLeaders] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const [enrollRes, leadRes] = await Promise.all([
        supabase
          .from('user_course_enrollments')
          .select(`*, course:courses!user_course_enrollments_course_id_fkey(*), last_module:course_modules!user_course_enrollments_last_module_id_fkey(*)`)
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false })
          .limit(4),
        supabase
          .from('leaderboard_view')
          .select('user_id,full_name,avatar_url,credits,streak_days,courses_completed,certificates_earned,rank')
          .order('rank', { ascending: true })
          .limit(5),
      ]);

      const enrollList = Array.isArray(enrollRes.data) ? (enrollRes.data as unknown as EnrollWithCourse[]) : [];
      setEnrollments(enrollList);

      const leaders = Array.isArray(leadRes.data) ? (leadRes.data as LeaderboardEntry[]) : [];
      setTopLeaders(leaders);
      const me = leaders.find(l => l.user_id === user.id);
      if (me) setMyRank(me.rank);
      else {
        // rank not in top5 — fetch separately
        const { data: myEntry } = await supabase
          .from('leaderboard_view')
          .select('rank')
          .eq('user_id', user.id)
          .maybeSingle();
        if (myEntry) setMyRank((myEntry as { rank: number }).rank);
      }

      const enrolledIds = enrollList.map(e => e.course_id);
      const { data: recData } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .not('id', 'in', enrolledIds.length > 0 ? `(${enrolledIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
        .order('student_count', { ascending: false })
        .limit(3);
      setRecommended(Array.isArray(recData) ? (recData as DBCourse[]) : []);

      setLoading(false);
    };
    void load();
  }, [user]);

  const completedCount = enrollments.filter(e => !!e.completed_at).length;
  const displayName = profile?.full_name?.split(' ')[0] ?? 'there';
  const credits  = profile?.credits ?? 0;
  const streak   = profile?.streak_days ?? 0;

  return (
    <AppLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-xl p-5 md:p-6 bg-secondary">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white text-balance">
                Hi {displayName}, welcome back! 👋
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                You have completed <span className="text-primary font-semibold">{completedCount}</span> course{completedCount !== 1 ? 's' : ''} so far. Keep it up!
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Zap className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Credits</p>
                  <p className="text-base font-bold text-white">{credits}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Streak</p>
                  <p className="text-base font-bold text-white">{streak}d</p>
                </div>
              </div>
              {myRank !== null && (
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Rank</p>
                    <p className="text-base font-bold text-white">#{myRank}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(a => (
            <Link key={a.path} to={a.path}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border">
                <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{a.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Courses */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">My Courses</h2>
              <Link to="/courses" className="text-sm text-primary hover:underline flex items-center gap-1">
                Browse <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-xl border border-border">
                    <Skeleton className="w-12 h-12 rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-muted" />
                      <Skeleton className="h-2 w-full bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : enrollments.length === 0 ? (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">You haven't enrolled in any courses yet.</p>
                  <Link to="/courses">
                    <Button size="sm">Browse Courses</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {enrollments.map(e => {
                  const c = e.course;
                  return (
                    <Card key={e.id} className="border-border hover:shadow-sm transition-shadow">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c?.title ?? 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Progress value={e.progress_percent ?? 0} className="h-1.5 flex-1" />
                            <span className="text-[11px] text-muted-foreground shrink-0">{e.progress_percent ?? 0}%</span>
                          </div>
                          {e.completed_at && (
                            <div className="flex items-center gap-1 mt-1">
                              <CheckCircle className="w-3 h-3 text-chart-2" />
                              <span className="text-[11px] text-chart-2">Completed</span>
                            </div>
                          )}
                        </div>
                        <Link to={`/courses/${e.course_id}`} className="shrink-0">
                          <Button size="sm" variant="ghost" aria-label="Continue learning" className="text-primary hover:bg-primary/10">
                            <Play className="w-3.5 h-3.5 mr-1" />
                            <span className="hidden sm:inline">Continue</span>
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Recommended */}
            {recommended.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="text-base font-semibold text-foreground">Recommended for You</h2>
                {recommended.map(c => (
                  <Card key={c.id} className="border-border hover:shadow-sm transition-shadow">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        {c.thumbnail_url
                          ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-primary" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">{c.duration_hours ?? c.duration_weeks}h • {c.level ?? c.difficulty}</span>
                        </div>
                      </div>
                      <Link to={`/courses/${c.id}`} className="shrink-0">
                        <Button size="sm" variant="outline" className="text-xs">Enroll</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Top Learners</h2>
              <Link to="/leaderboard" className="text-sm text-primary hover:underline flex items-center gap-1">
                Full <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <Card className="border-border h-full">
              <CardContent className="p-4 space-y-3">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="w-7 h-7 rounded-full bg-muted" />
                      <Skeleton className="flex-1 h-4 bg-muted" />
                      <Skeleton className="w-12 h-4 bg-muted" />
                    </div>
                  ))
                ) : topLeaders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                ) : (
                  topLeaders.map((l) => (
                    <div key={l.user_id} className={`flex items-center gap-3 p-2 rounded-lg ${l.user_id === user?.id ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}>
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">#{l.rank}</span>
                      <Avatar className="w-7 h-7 shrink-0">
                        {l.avatar_url && <AvatarImage src={l.avatar_url} alt={l.full_name ?? ''} />}
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials(l.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 min-w-0 text-xs text-foreground truncate">{l.full_name ?? 'Anonymous'}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Zap className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-foreground">{l.credits}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
