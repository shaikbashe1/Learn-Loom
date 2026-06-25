import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Map, Trophy, Target, BookOpen, ChevronRight, Activity, Zap } from 'lucide-react';
import type { DBCourse, DBEnrollment, DBModule, DBUserRoadmap, DBRoadmapStage } from '@/types/types';

type EnrollWithCourse = DBEnrollment & {
  course: DBCourse;
  last_module: DBModule | null;
};

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollWithCourse[]>([]);
  const [recommended, setRecommended] = useState<DBCourse[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<(DBUserRoadmap & { stages: DBRoadmapStage[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    
    const load = async () => {
      const [enrollRes, rankRes, roadmapRes] = await Promise.all([
        supabase
          .from('user_course_enrollments')
          .select(`*, course:courses!user_course_enrollments_course_id_fkey(*), last_module:course_modules!user_course_enrollments_last_module_id_fkey(*)`)
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false })
          .limit(4),
        supabase
          .from('leaderboard_view')
          .select('rank')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_roadmaps')
          .select('*, roadmap_stages(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      const enrollList = Array.isArray(enrollRes.data) ? (enrollRes.data as unknown as EnrollWithCourse[]) : [];
      setEnrollments(enrollList);

      if (rankRes.data) setMyRank((rankRes.data as { rank: number }).rank);

      if (roadmapRes.data && roadmapRes.data.length > 0) {
        const rm = roadmapRes.data[0];
        setActiveRoadmap({ ...rm, stages: rm.roadmap_stages || [] });
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

  // Mock weekly activity for the chart
  const weeklyActivity = [40, 70, 45, 90, 60, 20, 85]; // Mon - Sun percentage

  return (
    <AppLayout title="Dashboard">
      <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 bg-background">
        
        {/* Hero Welcome Banner */}
        <section className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-chart-4/10 to-surface border border-primary/20 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 group shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none rounded-r-2xl"></div>
          <div className="relative z-10 space-y-2">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-on-surface">Welcome back, {displayName}!</h2>
            <p className="text-on-surface-variant font-body-lg max-w-2xl">
              You've completed <span className="text-primary font-bold">{completedCount}</span> course{completedCount !== 1 ? 's' : ''}. Keep the momentum going!
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <Link to="/courses" className="bg-gradient-to-r from-primary to-chart-4 text-on-primary px-6 py-3 rounded-xl font-label-md font-bold hover:brightness-110 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 shadow-sm">
              <Zap className="w-5 h-5" />
              Jump Back In
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left Column) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI Roadmap Status Widget */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-heading font-bold text-on-surface flex items-center gap-2">
                  <Map className="w-6 h-6 text-primary" /> Active AI Roadmap
                </h3>
                <Link to="/ai-roadmap" className="text-primary font-label-sm hover:underline flex items-center">
                  View full <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              
              {!activeRoadmap ? (
                <div className="bg-surface border border-outline-variant rounded-2xl p-8 text-center flex flex-col items-center shadow-sm">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Target className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-lg font-bold text-on-surface mb-2">No Roadmap Generated</h4>
                  <p className="text-on-surface-variant mb-6">Let Loomie generate a personalized career path for you.</p>
                  <Link to="/ai-roadmap" className="bg-primary/10 text-primary px-6 py-2 rounded-lg font-bold hover:bg-primary/20 transition-colors">
                    Create Roadmap
                  </Link>
                </div>
              ) : (
                <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm group hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                        {activeRoadmap.difficulty}
                      </span>
                      <h4 className="text-2xl font-bold text-on-surface">{activeRoadmap.title}</h4>
                      <p className="text-on-surface-variant">{activeRoadmap.target_role}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">
                        {activeRoadmap.stages.filter(s => s.status === 'completed').length}
                        <span className="text-lg text-on-surface-variant">/{activeRoadmap.stages.length}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider">Stages</p>
                    </div>
                  </div>
                  
                  {/* Visual Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant font-bold">Overall Progress</span>
                      <span className="text-primary font-bold">
                        {Math.round((activeRoadmap.stages.filter(s => s.status === 'completed').length / activeRoadmap.stages.length) * 100) || 0}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-chart-4 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(37,99,235,0.3)]" 
                        style={{ width: `${Math.round((activeRoadmap.stages.filter(s => s.status === 'completed').length / activeRoadmap.stages.length) * 100) || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Continue Learning */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-heading font-bold text-on-surface flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-secondary" /> Continue Learning
                </h3>
                <Link to="/courses" className="text-secondary font-label-sm hover:underline">View All</Link>
              </div>
              
              {enrollments.length === 0 ? (
                 <div className="bg-surface border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
                   <p className="text-on-surface-variant">You haven't enrolled in any courses yet.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrollments.map((e) => (
                    <Link key={e.id} to={`/courses/${e.course_id}`} className="bg-surface border border-outline-variant rounded-xl p-4 flex gap-4 hover:border-secondary/50 transition-colors shadow-sm">
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                        {e.course?.thumbnail_url && <img src={e.course.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <h4 className="font-bold text-on-surface line-clamp-2 leading-tight">{e.course?.title}</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-on-surface-variant">Progress</span>
                            <span className="text-secondary font-bold">{e.progress_percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-secondary" style={{ width: `${e.progress_percent}%` }} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Content (Right Column) */}
          <div className="space-y-8">
            
            {/* Quick Stats */}
            <section className="grid grid-cols-2 gap-4">
              <div className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center text-center hover:-translate-y-1 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5 text-tertiary" />
                </div>
                <p className="text-2xl font-bold text-on-surface">#{myRank ?? '-'}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Global Rank</p>
              </div>
              <div className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center text-center hover:-translate-y-1 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center mb-2">
                  <Activity className="w-5 h-5 text-error" />
                </div>
                <p className="text-2xl font-bold text-on-surface">{streak}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Day Streak</p>
              </div>
            </section>

            {/* Weekly Activity Chart */}
            <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-on-surface mb-6">Weekly Activity</h3>
              <div className="flex items-end justify-between h-32 gap-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="w-full bg-surface-container rounded-t-sm relative flex items-end h-full">
                      <div 
                        className="w-full bg-primary/80 group-hover:bg-primary transition-colors rounded-t-sm"
                        style={{ height: `${weeklyActivity[i]}%` }}
                      />
                    </div>
                    <span className="text-xs text-on-surface-variant font-bold">{day}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommended Paths */}
            {recommended.length > 0 && (
              <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-on-surface mb-4">Recommended</h3>
                <div className="space-y-4">
                  {recommended.map((c) => (
                    <Link key={c.id} to={`/courses/${c.id}`} className="group flex gap-3 items-center p-2 -mx-2 rounded-xl hover:bg-surface-container/50 transition-colors">
                      <div className="w-12 h-12 rounded bg-surface-container overflow-hidden shrink-0">
                        {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/10"></div>}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{c.title}</h4>
                        <p className="text-xs text-on-surface-variant">{c.level ?? 'All Levels'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
