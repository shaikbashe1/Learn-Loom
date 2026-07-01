import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Skeleton } from '@/components/ui/skeleton';
// Replace Recharts with simple visual elements or we could install it.
// Assuming simple CSS bars for charts if Recharts isn't available, or I can just use placeholder divs.

export default function DashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    solved: 0,
    streak: 0,
    rating: 1500,
    accuracy: 0,
    xp: 0
  });

  useEffect(() => {
    // In a real implementation we would fetch from coding_progress
    const fetchStats = async () => {
      setLoading(true);
      try {
        if (!profile?.id) return;
        const { data, error } = await supabase
          .from('coding_progress')
          .select('*')
          .eq('user_id', profile.id)
          .single();
        
        if (data) {
          setStats({
            solved: data.problems_solved,
            streak: profile.streak_days || 0,
            rating: 1500, // Fetch from leaderboards ideally
            accuracy: data.accuracy_rate || 0,
            xp: data.total_xp
          });
        }
      } catch (e) {
        console.error("Error fetching stats:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [profile]);

  return (
    <AppLayout title="Coding Dashboard">
      <div className="flex flex-col gap-6 p-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Coding Dashboard</h1>
            <p className="text-on-surface-variant font-label-md">Welcome back, {profile?.full_name || 'Coder'}! Keep up the great work.</p>
          </div>
          <Link to="/coding/practice">
            <Button className="bg-primary text-on-primary">
              <span className="material-symbols-outlined mr-2 text-[18px]">terminal</span>
              Practice Now
            </Button>
          </Link>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard title="Problems Solved" value={stats.solved.toString()} icon="task_alt" color="text-[#4ade80]" loading={loading} />
          <StatCard title="Current Streak" value={`${stats.streak} Days`} icon="local_fire_department" color="text-tertiary" loading={loading} />
          <StatCard title="Contest Rating" value={stats.rating.toString()} icon="military_tech" color="text-primary" loading={loading} />
          <StatCard title="Accuracy" value={`${stats.accuracy}%`} icon="track_changes" color="text-[#a78bfa]" loading={loading} />
          <StatCard title="XP Earned" value={stats.xp.toString()} icon="stars" color="text-[#facc15]" loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Activity Chart Placeholder */}
            <Card className="glass-panel border-outline-variant/60 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display text-lg">Weekly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 border-b border-l border-outline-variant/30 pb-2 pl-2">
                  {[4, 7, 2, 9, 12, 5, 8].map((val, i) => (
                    <div key={i} className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-sm relative group cursor-pointer transition-colors" style={{ height: `${(val / 15) * 100}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity border border-outline-variant/30 shadow-md">
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-on-surface-variant font-label-sm">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Today's Challenge */}
              <Card className="glass-panel border-outline-variant/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary">today</span>
                    <CardTitle className="font-display text-lg">Daily Challenge</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-bold text-on-surface mb-2">Two Sum - O(n) Solution</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-primary/10 text-primary border-0">Easy</Badge>
                    <span className="text-xs text-on-surface-variant">+20 XP</span>
                  </div>
                  <Link to="/coding/daily">
                    <Button variant="outline" className="w-full text-primary border-primary hover:bg-primary/10">Start Challenge</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* AI Recommendation */}
              <Card className="glass-panel border-outline-variant/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">smart_toy</span>
                    <CardTitle className="font-display text-lg">AI Recommended</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-bold text-on-surface mb-2">Binary Search Trees</h3>
                  <p className="text-xs text-on-surface-variant mb-4">Based on your recent struggles with Graph traversal, try this foundational topic.</p>
                  <Link to="/coding/practice?q=trees">
                    <Button variant="outline" className="w-full text-on-surface hover:bg-surface-variant/50">View Problems</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
            
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            
            {/* Difficulty Breakdown */}
            <Card className="glass-panel border-outline-variant/60 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display text-lg">Difficulty</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DifficultyBar label="Easy" solved={stats.solved > 0 ? Math.floor(stats.solved * 0.5) : 0} total={150} color="bg-[#4ade80]" />
                <DifficultyBar label="Medium" solved={stats.solved > 0 ? Math.floor(stats.solved * 0.3) : 0} total={250} color="bg-tertiary" />
                <DifficultyBar label="Hard" solved={stats.solved > 0 ? Math.floor(stats.solved * 0.2) : 0} total={100} color="bg-error" />
              </CardContent>
            </Card>

            {/* Upcoming Contest */}
            <Card className="bg-primary/5 border border-primary/20 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">emoji_events</span>
                  <CardTitle className="font-display text-lg text-primary-fixed-dim">Upcoming Contest</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-bold text-on-surface mb-1">Weekly Coder Challenge #42</h3>
                <p className="text-xs text-on-surface-variant mb-4 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> Starts in 2d 14h</p>
                <Link to="/coding/contests">
                  <Button className="w-full bg-primary text-on-primary">Register Now</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="glass-panel border-outline-variant/60 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { title: 'Solved "Reverse Linked List"', time: '2 hours ago', icon: 'check_circle', color: 'text-[#4ade80]' },
                    { title: 'Attempted "Merge K Sorted Lists"', time: '5 hours ago', icon: 'cancel', color: 'text-error' },
                    { title: 'Earned "7 Day Streak" Badge', time: '1 day ago', icon: 'workspace_premium', color: 'text-[#facc15]' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-[18px] mt-0.5 ${activity.color}`}>{activity.icon}</span>
                      <div>
                        <p className="text-sm text-on-surface font-medium">{activity.title}</p>
                        <p className="text-xs text-on-surface-variant">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon, color, loading }: { title: string, value: string, icon: string, color: string, loading: boolean }) {
  return (
    <Card className="glass-panel border-outline-variant/60 shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-full bg-surface-variant/50 ${color}`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant font-label-sm uppercase tracking-wider">{title}</p>
          {loading ? (
             <Skeleton className="h-6 w-16 mt-1" />
          ) : (
            <h4 className="text-2xl font-bold font-display text-on-surface">{value}</h4>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DifficultyBar({ label, solved, total, color }: { label: string, solved: number, total: number, color: string }) {
  const percent = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-on-surface font-medium">{label}</span>
        <span className="text-on-surface-variant">{solved} / {total}</span>
      </div>
      <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
