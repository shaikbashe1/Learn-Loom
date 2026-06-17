import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { DBCourse, DBEnrollment, DBModule, LeaderboardEntry } from '@/types/types';

type EnrollWithCourse = DBEnrollment & {
  course: DBCourse;
  last_module: DBModule | null;
};

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollWithCourse[]>([]);
  const [recommended, setRecommended] = useState<DBCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const [enrollRes, rankRes] = await Promise.all([
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
      ]);

      const enrollList = Array.isArray(enrollRes.data) ? (enrollRes.data as unknown as EnrollWithCourse[]) : [];
      setEnrollments(enrollList);

      if (rankRes.data) setMyRank((rankRes.data as { rank: number }).rank);

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
      <div className="flex-1 p-gutter lg:p-margin-desktop bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="max-w-container-max mx-auto flex flex-col gap-stack-lg">
          {/* Welcome Banner */}
          <section className="glass-panel rounded-2xl p-stack-lg relative overflow-hidden border-t-2 border-t-tertiary">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="font-display-lg text-display-lg text-text-primary mb-2">Welcome back, {displayName}.</h1>
                <p className="font-body-lg text-body-lg text-text-secondary">"The expert in anything was once a beginner." Keep pushing forward.</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-warning">local_fire_department</span>
                  <span className="font-headline-md text-headline-md text-text-primary">{streak} Day Streak</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-label-sm text-label-sm text-text-secondary">Rank</span>
                  <span className="font-label-sm text-label-sm font-bold text-primary">#{myRank ?? '-'}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-label-sm text-label-sm text-text-secondary">Credits</span>
                  <span className="font-label-sm text-label-sm font-bold text-secondary">{credits.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {/* Left Column (Wider) */}
            <div className="lg:col-span-2 flex flex-col gap-stack-lg">
              {/* Continue Learning */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-headline-md text-headline-md text-text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">play_circle</span> Continue Learning
                  </h2>
                  <Link to="/courses" className="font-label-sm text-label-sm text-primary hover:underline">View All</Link>
                </div>
                
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(i => <div key={i} className="h-40 bg-surface-container-low animate-pulse rounded-xl"></div>)}
                  </div>
                ) : enrollments.length === 0 ? (
                  <div className="glass-panel p-stack-md rounded-2xl text-center flex flex-col items-center gap-md">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant">menu_book</span>
                    <p className="font-body-md text-body-md text-text-secondary">You haven't enrolled in any courses yet.</p>
                    <Link to="/courses" className="bg-primary-container text-on-primary px-lg py-sm rounded-lg font-label-md text-label-md font-bold mt-sm hover:bg-surface-tint transition-colors">Browse Catalog</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {enrollments.map((e, index) => {
                      const c = e.course;
                      return (
                        <div key={e.id} className="bg-surface rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-all border border-border-base flex flex-col gap-4 relative overflow-hidden group">
                          {index % 2 !== 0 && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tertiary to-secondary-container"></div>
                          )}
                          <div className="flex justify-between items-start">
                            <div className={`w-12 h-12 rounded-lg ${index % 2 === 0 ? 'bg-surface-container-low text-primary' : 'bg-tertiary-fixed text-on-tertiary-fixed'} flex items-center justify-center`}>
                              <span className="material-symbols-outlined">{index % 2 === 0 ? 'data_object' : 'psychology'}</span>
                            </div>
                            <span className={`px-2 py-1 ${index % 2 === 0 ? 'bg-surface-container-high text-primary' : 'bg-secondary-container text-on-secondary-container'} text-xs rounded-full font-label-sm font-bold flex items-center gap-1`}>
                              {index % 2 !== 0 && <span className="material-symbols-outlined text-[12px]">spark</span>}
                              {e.progress_percent === 100 ? 'Completed' : 'In Progress'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-headline-md text-body-md font-semibold text-text-primary mb-1 line-clamp-1">{c?.title ?? 'Untitled Course'}</h3>
                            <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2">{e.last_module?.title ?? c?.description ?? 'Resume your learning'}</p>
                          </div>
                          <div className="mt-auto pt-4 border-t border-border-base flex justify-between items-center">
                            <div className="flex flex-col gap-1 w-2/3">
                              <div className="flex justify-between font-label-sm text-label-sm">
                                <span className="text-text-secondary">Progress</span>
                                <span className="text-text-primary">{e.progress_percent ?? 0}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div className={`h-full ${index % 2 === 0 ? 'bg-primary' : 'bg-tertiary'} rounded-full`} style={{ width: `${e.progress_percent ?? 0}%` }}></div>
                              </div>
                            </div>
                            <Link to={`/courses/${e.course_id}`} className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity">
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Recommended for You */}
              {recommended.length > 0 && (
                <section className="mt-stack-lg">
                  <h2 className="font-headline-md text-headline-md text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary-container">auto_awesome</span> Recommended Paths
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommended.map((c, index) => {
                      if (index > 1) return null; // limit to 2 for space
                      const colors = [
                        { icon: 'database', bg: 'bg-primary/10 text-primary', hue: 'primary' },
                        { icon: 'architecture', bg: 'bg-secondary/10 text-secondary', hue: 'secondary' },
                      ];
                      const color = colors[index % colors.length];

                      return (
                        <Link key={c.id} to={`/courses/${c.id}`} className="glass-panel p-5 rounded-xl border border-border-base hover:border-primary/50 transition-colors group flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div className={`w-10 h-10 rounded ${color.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                              <span className="material-symbols-outlined">{color.icon}</span>
                            </div>
                            <span className="font-label-sm text-label-sm text-text-secondary px-2 py-0.5 rounded border border-outline-variant/60">{c.level ?? 'All Levels'}</span>
                          </div>
                          <div>
                            <h4 className="font-headline-sm text-headline-sm text-text-primary mb-xs line-clamp-2">{c.title}</h4>
                            <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2">{c.description ?? 'A comprehensive course to advance your skills.'}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column (Sidebar Widgets) */}
            <div className="flex flex-col gap-stack-lg">
              {/* AI Recommendations */}
              <section className="glass-panel rounded-xl p-5">
                <h3 className="font-headline-md text-body-md font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary-container">auto_awesome</span> Mentor Suggestions
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0 mt-1">
                      <span className="material-symbols-outlined text-sm">menu_book</span>
                    </div>
                    <div>
                      <p className="font-body-sm text-body-sm text-text-primary font-medium">Review Data Structures</p>
                      <p className="font-label-sm text-label-sm text-text-secondary mt-1">You struggled with Binary Trees in yesterday's quiz. Want to review?</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start border-t border-border-base pt-4">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-tertiary shrink-0 mt-1">
                      <span className="material-symbols-outlined text-sm">code</span>
                    </div>
                    <div>
                      <p className="font-body-sm text-body-sm text-text-primary font-medium">Daily Coding Challenge</p>
                      <p className="font-label-sm text-label-sm text-text-secondary mt-1">Complete today's challenge to maintain your streak.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
