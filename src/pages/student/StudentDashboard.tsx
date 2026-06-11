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
      <div className="flex-1 p-md md:p-xl lg:p-2xl max-w-[1440px] mx-auto w-full space-y-xl">
        
        {/* Hero Welcome Banner */}
        <section className="relative overflow-hidden bg-surface-container-low border border-outline-variant/60 rounded-xl p-lg md:p-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-lg group">
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
          <div className="relative z-10 space-y-xs">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Welcome back, {displayName}! 👋</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              You have completed <span className="text-primary font-bold">{completedCount}</span> course{completedCount !== 1 ? 's' : ''} so far. Keep the momentum going!
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <Link to="/courses" className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md text-label-md font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-sm">
              <span className="material-symbols-outlined">rocket_launch</span>
              Jump Back In
            </Link>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {/* Card 1: Rank */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-md hover:border-border transition-colors group flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="flex justify-between items-start">
              <span className="font-label-md text-label-md text-on-surface-variant">Current Rank</span>
              <span className="material-symbols-outlined text-tertiary">workspace_premium</span>
            </div>
            <div>
              <div className="font-headline-md text-headline-md text-on-surface flex items-baseline gap-sm">
                #{myRank ?? '-'}
                <span className="font-label-sm text-label-sm text-tertiary px-2 py-0.5 rounded-full bg-tertiary/10 border border-tertiary/20">Global</span>
              </div>
            </div>
          </div>

          {/* Card 2: Streak */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-md hover:border-border transition-colors group flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-label-md text-on-surface-variant">Learning Streak</span>
              <span className="material-symbols-outlined text-secondary">local_fire_department</span>
            </div>
            <div>
              <div className="font-headline-md text-headline-md text-on-surface flex items-baseline gap-sm">
                {streak} <span className="font-body-sm text-body-sm text-on-surface-variant">days</span>
              </div>
            </div>
          </div>

          {/* Card 3: Credits */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-md hover:border-border transition-colors group flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-label-md text-on-surface-variant">Earned Credits</span>
              <span className="material-symbols-outlined text-primary">monetization_on</span>
            </div>
            <div>
              <div className="font-headline-md text-headline-md text-on-surface flex items-baseline gap-sm">
                {credits.toLocaleString()}
              </div>
            </div>
          </div>
        </section>

        {/* Continue Learning */}
        <section>
          <div className="flex items-center justify-between mb-lg border-b border-outline-variant/40 pb-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">play_circle</span>
              Continue Learning
            </h3>
            <Link to="/courses" className="font-label-sm text-label-sm text-primary hover:text-primary-fixed-dim transition-colors">View All</Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
              {[1, 2].map(i => (
                <div key={i} className="h-40 bg-surface-container-low animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-xl text-center flex flex-col items-center gap-md">
              <span className="material-symbols-outlined text-[48px] text-outline-variant">menu_book</span>
              <p className="font-body-md text-body-md text-on-surface-variant">You haven't enrolled in any courses yet.</p>
              <Link to="/courses" className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md text-label-md font-bold mt-sm">Browse Catalog</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
              {enrollments.map((e, index) => {
                const c = e.course;
                const colors = [
                  { bg: 'from-[#20232a] to-[#282c34]', text: 'text-primary' },
                  { bg: 'from-[#1c2128] to-[#0d1117]', text: 'text-secondary' },
                  { bg: 'from-[#2a1b1b] to-[#1a0f0f]', text: 'text-tertiary' },
                  { bg: 'from-[#1b2a24] to-[#0f1a14]', text: 'text-primary-fixed' }
                ];
                const color = colors[index % colors.length];

                return (
                  <div key={e.id} className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden hover:border-outline transition-colors group flex flex-col sm:flex-row">
                    <div className={`w-full sm:w-48 h-40 sm:h-auto bg-gradient-to-br ${color.bg} relative shrink-0`}>
                      {c?.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                          <div className={`w-24 h-24 border-4 border-current ${color.text} rounded-full animate-spin-slow`}></div>
                        </div>
                      )}
                      {e.last_module && (
                        <div className={`absolute bottom-sm left-sm bg-surface-container-lowest/80 backdrop-blur border border-outline-variant/60 px-2 py-1 rounded font-label-sm text-label-sm ${color.text}`}>
                          {e.last_module.title.substring(0, 15)}...
                        </div>
                      )}
                    </div>
                    
                    <div className="p-md flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-headline-sm text-headline-sm text-on-surface mb-xs group-hover:text-primary transition-colors line-clamp-2">
                          {c?.title ?? 'Untitled Course'}
                        </h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-xs">
                          <span className="material-symbols-outlined text-[16px]">person</span>
                          {c?.level ?? 'All Levels'}
                        </p>
                      </div>
                      
                      <div className="mt-md">
                        <div className="flex justify-between items-end mb-xs font-label-sm text-label-sm">
                          <span className="text-on-surface-variant">Progress</span>
                          <span className={color.text}>{e.progress_percent ?? 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden mb-md">
                          <div className={`h-full bg-current ${color.text} rounded-full`} style={{ width: `${e.progress_percent ?? 0}%` }}></div>
                        </div>
                        <div className="flex justify-end">
                          <Link to={`/courses/${e.course_id}`} className="px-md py-sm bg-surface-container-high border border-outline-variant/60 hover:border-primary/50 text-on-surface font-label-sm text-label-sm rounded-lg transition-all active:scale-95 flex items-center gap-xs">
                            {e.progress_percent === 100 ? 'Review Course' : 'Resume Lesson'}
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recommended for You */}
        {recommended.length > 0 && (
          <section>
            <div className="flex items-center gap-sm mb-lg border-b border-outline-variant/40 pb-sm">
              <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Recommended Paths</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {recommended.map((c, index) => {
                const colors = [
                  { icon: 'database', bg: 'bg-primary/10 text-primary', hue: 'primary' },
                  { icon: 'architecture', bg: 'bg-secondary/10 text-secondary', hue: 'secondary' },
                  { icon: 'code', bg: 'bg-tertiary/10 text-tertiary', hue: 'tertiary' }
                ];
                const color = colors[index % colors.length];

                return (
                  <Link key={c.id} to={`/courses/${c.id}`} className={`bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-md flex flex-col gap-md hover:bg-surface-container-low transition-colors group cursor-pointer ${index === 2 ? 'hidden lg:flex' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className={`w-10 h-10 rounded ${color.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <span className="material-symbols-outlined">{color.icon}</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/60">{c.level ?? 'All Levels'}</span>
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface mb-xs line-clamp-2">{c.title}</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{c.description ?? 'A comprehensive course to advance your skills.'}</p>
                    </div>
                    <div className="mt-auto pt-sm flex justify-between items-center border-t border-outline-variant/30">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{c.duration_hours ? `${c.duration_hours} hrs` : c.duration_weeks ? `${c.duration_weeks} wks` : 'Self-paced'}</span>
                      <span className={`material-symbols-outlined text-${color.hue} opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0`}>arrow_forward</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="h-xl"></div>
      </div>
    </AppLayout>
  );
}
