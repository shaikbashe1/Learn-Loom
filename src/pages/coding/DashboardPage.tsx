import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Flame, Target, Star, Zap, Clock, Code2, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [progress, setProgress] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [streaks, setStreaks] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch progress
        const { data: prog } = await supabase.from('coding_progress').select('*').eq('user_id', user.id).single();
        if (prog) setProgress(prog);

        // Fetch statistics
        const { data: stat } = await supabase.from('coding_statistics').select('*').eq('user_id', user.id).single();
        if (stat) setStatistics(stat);

        // Fetch streaks
        const { data: strk } = await supabase.from('coding_streaks').select('*').eq('user_id', user.id).single();
        if (strk) setStreaks(strk);

        // Fetch user badges
        const { data: userBadges } = await supabase.from('coding_user_badges').select('*, coding_badges(*)').eq('user_id', user.id);
        if (userBadges) setBadges(userBadges.map(b => b.coding_badges));
        
        // Fetch all badges for reference
        const { data: allB } = await supabase.from('coding_badges').select('*');
        if (allB) setAllBadges(allB);

      } catch (e) {
        console.error("Error fetching dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  const totalProblems = 1000; // From our 1000 dataset
  const solvedCount = progress?.problems_solved || 0;
  const completionPercentage = Math.round((solvedCount / totalProblems) * 100);

  // Generate heatmap data (mocked from current streak logic)
  const today = new Date();
  const heatmapDays = Array.from({ length: 60 }).map((_, i) => {
    const date = subDays(today, 59 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    // Assuming streaks.activity_heatmap has { '2026-07-18': 3 } (problems solved count)
    // We'll mock it if not present, but using actual if we had it.
    // For now, let's just make it visually active based on current_streak
    const isActive = streaks && streaks.current_streak > 0 && i >= (60 - streaks.current_streak);
    return { date: dateStr, active: isActive };
  });

  return (
    <AppLayout title="Coding Progress Dashboard">
      <div className="flex flex-col gap-6 p-4 max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm">
          <div>
            <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Coding Progress Dashboard</h1>
            <p className="text-on-surface-variant font-label-md mt-1">Track your algorithm mastery and interview preparation.</p>
          </div>
          <Link to="/coding/practice">
            <Button className="bg-primary text-on-primary rounded-xl px-6">
              <Code2 className="mr-2 w-5 h-5" />
              Practice Now
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column: Circular Progress & Difficulties */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-panel border-outline-variant/60 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center">
                <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-variant" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                      className="text-primary transition-all duration-1000 ease-in-out" 
                      strokeDasharray="283" 
                      strokeDashoffset={283 - (283 * completionPercentage) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-on-surface">{solvedCount}</span>
                    <span className="text-xs text-on-surface-variant">/ {totalProblems}</span>
                  </div>
                </div>
                <h3 className="font-bold text-on-surface text-lg mb-1">Total Solved</h3>
                <p className="text-sm text-on-surface-variant mb-6 text-center">You have solved {completionPercentage}% of all problems.</p>
                
                <div className="w-full space-y-4">
                  <DifficultyBar label="Easy" solved={progress?.easy_solved || 0} total={330} color="bg-green-500" />
                  <DifficultyBar label="Medium" solved={progress?.medium_solved || 0} total={340} color="bg-yellow-500" />
                  <DifficultyBar label="Hard" solved={progress?.hard_solved || 0} total={330} color="bg-red-500" />
                </div>
              </CardContent>
            </Card>

            {/* Badges Preview */}
            <Card className="glass-panel border-outline-variant/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-outline-variant/50">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-tertiary" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {allBadges.map((badge, idx) => {
                    const isEarned = badges.some(b => b?.slug === badge.slug);
                    return (
                      <div 
                        key={idx} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${isEarned ? 'bg-tertiary/20 border-tertiary text-tertiary' : 'bg-surface-variant border-transparent text-on-surface-variant opacity-50'}`}
                        title={badge.name}
                      >
                        {badge.icon_name === 'Target' && <Target className="w-6 h-6" />}
                        {badge.icon_name === 'Flame' && <Flame className="w-6 h-6" />}
                        {badge.icon_name === 'Star' && <Star className="w-6 h-6" />}
                        {badge.icon_name === 'Trophy' && <Trophy className="w-6 h-6" />}
                        {badge.icon_name === 'Zap' && <Zap className="w-6 h-6" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Heatmap, Stats, Topics */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox title="Current Streak" value={streaks?.current_streak || 0} suffix="Days" icon={<Flame className="text-orange-500" />} />
              <StatBox title="Max Streak" value={streaks?.max_streak || 0} suffix="Days" icon={<Trophy className="text-yellow-500" />} />
              <StatBox title="Total Submissions" value={statistics?.total_submissions || 0} icon={<Code2 className="text-primary" />} />
              <StatBox title="Acceptance Rate" value={statistics?.acceptance_rate ? parseFloat(statistics.acceptance_rate).toFixed(1) : 0} suffix="%" icon={<Target className="text-green-500" />} />
            </div>

            {/* Heatmap Activity */}
            <Card className="glass-panel border-outline-variant/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg flex items-center justify-between">
                  <span>Activity Heatmap</span>
                  <span className="text-sm font-normal text-on-surface-variant">{solvedCount} submissions in the past 60 days</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-[3px] p-2 bg-surface-container rounded-lg">
                  {heatmapDays.map((day, idx) => (
                    <div 
                      key={idx} 
                      className={`w-[14px] h-[14px] rounded-[2px] ${day.active ? 'bg-green-500' : 'bg-surface-variant hover:bg-outline-variant'} transition-colors cursor-pointer`}
                      title={day.date}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Topic Progress */}
            <Card className="glass-panel border-outline-variant/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg">Topic Proficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {['Arrays', 'Strings', 'Dynamic Programming', 'Trees', 'Graphs', 'Two Pointers'].map((topic, i) => {
                    const topicSolved = progress?.topic_progress?.[topic] || 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-on-surface">{topic}</span>
                          <span className="text-on-surface-variant text-xs">{topicSolved} / 50</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (topicSolved / 50) * 100)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatBox({ title, value, suffix = "", icon }: { title: string, value: string | number, suffix?: string, icon: React.ReactNode }) {
  return (
    <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
      <div className="p-3 bg-surface-variant rounded-lg shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">{title}</p>
        <p className="text-2xl font-bold font-display text-on-surface">
          {value}
          <span className="text-sm font-normal text-on-surface-variant ml-1">{suffix}</span>
        </p>
      </div>
    </div>
  );
}

function DifficultyBar({ label, solved, total, color }: { label: string, solved: number, total: number, color: string }) {
  const percent = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-on-surface font-medium">{label}</span>
        <span className="text-on-surface-variant">{solved} <span className="text-on-surface-variant/50">/ {total}</span></span>
      </div>
      <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
