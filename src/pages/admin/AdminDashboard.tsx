import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import type { AdminStats, DailyTrendData } from '@/types/types';

interface RecentActivity { text: string; time: string; icon: string; iconColor: string; }
interface CourseRow {
  id: string; title: string; category: string;
  student_count: number; is_published: boolean; thumbnail_url: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [courses, setCourses]   = useState<CourseRow[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [trendData, setTrendData] = useState<DailyTrendData[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const [statsRes, coursesRes, enrollRes, postRes, trendRes] = await Promise.all([
        supabase.rpc('get_admin_stats').single(),
        supabase.from('courses')
          .select('id,title,category,student_count,is_published,thumbnail_url')
          .order('student_count', { ascending: false }).limit(4),
        supabase.from('user_course_enrollments')
          .select('created_at, courses!user_course_enrollments_course_id_fkey(title)')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('forum_posts')
          .select('created_at, title')
          .order('created_at', { ascending: false }).limit(3),
        supabase.rpc('get_admin_enrollment_trends', { days_ago: 14 })
      ]);

      if (statsRes.data) setStats(statsRes.data as AdminStats);
      if (coursesRes.data) setCourses(coursesRes.data as CourseRow[]);
      if (trendRes.data) setTrendData(trendRes.data as DailyTrendData[]);

      const acts: RecentActivity[] = [];
      (enrollRes.data ?? []).forEach((e: { created_at: string; courses: unknown }) => {
        const c = e.courses;
        const courseTitle = Array.isArray(c)
          ? (c[0] as { title: string } | undefined)?.title ?? 'a course'
          : (c as { title: string } | null)?.title ?? 'a course';
        acts.push({ icon: 'school', iconColor: 'text-primary bg-primary/10 border-primary/20', text: `New enrollment in "${courseTitle}"`, time: new Date(e.created_at).toLocaleString() });
      });
      (postRes.data ?? []).forEach((p: { created_at: string; title: string }) => {
        acts.push({ icon: 'forum', iconColor: 'text-secondary bg-secondary/10 border-secondary/20', text: `New forum post: ${p.title}`, time: new Date(p.created_at).toLocaleString() });
      });
      acts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(acts.slice(0, 8));

      setLoading(false);
    })();
  }, []);

  // Derived Trend Metrics
  const avgDaily = trendData.length > 0 ? Math.round(trendData.reduce((acc, curr) => acc + curr.signups, 0) / trendData.length) : 0;
  const peakSignups = trendData.length > 0 ? Math.max(...trendData.map(t => t.signups)) : 0;
  
  const totalSignupsPeriod = trendData.reduce((acc, curr) => acc + curr.signups, 0);
  const totalEnrollmentsPeriod = trendData.reduce((acc, curr) => acc + curr.enrollments, 0);
  const conversionRate = totalSignupsPeriod > 0 ? ((totalEnrollmentsPeriod / totalSignupsPeriod) * 100).toFixed(1) : '0.0';

  const last7 = trendData.slice(-7).reduce((acc, curr) => acc + curr.signups, 0);
  const prev7 = trendData.slice(-14, -7).reduce((acc, curr) => acc + curr.signups, 0);
  let growthRate = 0;
  if (prev7 > 0) {
    growthRate = ((last7 - prev7) / prev7) * 100;
  }

  return (
    <AppLayout title="Admin Dashboard" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        
        {/* Welcome Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-display text-on-surface">System Overview</h2>
            <p className="font-body-lg text-on-surface-variant max-w-2xl">Good morning, Admin. Here is what is happening across LearnLoom today.</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant rounded-lg font-label-md text-label-md hover:bg-surface-variant/50 transition-all text-on-surface">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-all">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Sync Data
            </button>
          </div>
        </section>

        {/* Quick Stats Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="glass-panel p-lg rounded-xl h-[160px]">
                <Skeleton className="h-8 w-8 rounded bg-surface border border-outline-variant/30 mb-4" />
                <Skeleton className="h-4 w-24 bg-surface border border-outline-variant/30 mb-2" />
                <Skeleton className="h-8 w-16 bg-surface border border-outline-variant/30" />
              </div>
            ))
          ) : (
            <>
              {/* Stat 1: Students */}
              <Link to="/admin/students" className="glass-panel p-lg rounded-xl flex flex-col justify-between h-[160px] group hover:scale-[1.02] hover:border-primary/50 transition-all cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                </div>
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Total Students</p>
                  <h3 className="font-display text-headline-lg">{stats?.total_students?.toLocaleString() ?? 0}</h3>
                </div>
              </Link>
              
              {/* Stat 2: Courses */}
              <Link to="/admin/courses" className="glass-panel p-lg rounded-xl flex flex-col justify-between h-[160px] group hover:scale-[1.02] hover:border-secondary/50 transition-all cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                    <span className="material-symbols-outlined">library_books</span>
                  </div>
                </div>
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Published Courses</p>
                  <h3 className="font-display text-headline-lg">{stats?.published_courses?.toLocaleString() ?? 0}</h3>
                </div>
              </Link>
              
              {/* Stat 3: Enrollments */}
              <Link to="/admin/reports" className="glass-panel p-lg rounded-xl flex flex-col justify-between h-[160px] group hover:scale-[1.02] hover:border-tertiary/50 transition-all cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-tertiary-container/10 rounded-lg text-tertiary">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                </div>
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Total Enrollments</p>
                  <h3 className="font-display text-headline-lg">{stats?.total_enrollments?.toLocaleString() ?? 0}</h3>
                </div>
              </Link>
              
              {/* Stat 4: Server / Certificates */}
              <Link to="/admin/certificates" className="glass-panel p-lg rounded-xl flex flex-col justify-between h-[160px] group hover:scale-[1.02] transition-all cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary-fixed-dim/10 rounded-lg text-primary-fixed-dim">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse shadow-[0_0_8px_#4ade80]"></div>
                    <span className="text-[#4ade80] font-label-sm">Healthy</span>
                  </div>
                </div>
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Active Certificates</p>
                  <h3 className="font-display text-headline-lg">{stats?.active_certificates?.toLocaleString() ?? 0}</h3>
                </div>
              </Link>
            </>
          )}
        </section>

        {/* Main Data Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* Enrollment Trend Chart (Left/Center Column) */}
          <div className="lg:col-span-2 glass-panel rounded-xl p-lg flex flex-col">
            <div className="flex items-center justify-between mb-xl">
              <div>
                <h4 className="font-headline-md text-on-surface">Enrollment Trends</h4>
                <p className="font-label-md text-on-surface-variant">Daily student signups for the last 14 days</p>
              </div>
              <select className="bg-surface-container-high border border-outline-variant text-label-md rounded-lg px-2 py-1 focus:ring-primary focus:border-primary text-on-surface">
                <option>Last 14 Days</option>
                <option>Last 30 Days</option>
                <option>This Quarter</option>
              </select>
            </div>
            
            <div className="flex-1 flex items-end justify-between gap-2 h-64 pt-8">
              {/* Dynamic Bar chart visualization */}
              {trendData.length > 0 ? trendData.map((day, idx) => {
                const maxVal = Math.max(peakSignups, 1);
                const heightPercent = Math.max((day.signups / maxVal) * 100, 2);
                const isMax = day.signups === peakSignups && day.signups > 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full">
                    <div className="w-full bg-surface-container-highest rounded-t-sm relative flex items-end overflow-hidden h-full">
                      <div 
                        className={`chart-bar w-full ${isMax ? 'bg-primary shadow-[0_0_8px_rgba(192,193,255,0.4)]' : 'bg-primary/40 group-hover:bg-primary transition-all'} rounded-t-sm`} 
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    </div>
                    <span className={`font-label-sm text-[10px] ${isMax ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                      {new Date(day.trend_date).getDate().toString().padStart(2, '0')}
                    </span>
                  </div>
                );
              }) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-label-md">Loading trend data...</div>
              )}
            </div>
            
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-outline-variant/30 pt-6">
              <div>
                <p className="text-label-sm text-on-surface-variant">Average Daily</p>
                <p className="text-headline-md font-bold text-on-surface">{avgDaily}</p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Peak Signups</p>
                <p className="text-headline-md font-bold text-on-surface">{peakSignups.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Conversion Rate</p>
                <p className="text-headline-md font-bold text-on-surface">{conversionRate}%</p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Growth Rate</p>
                <p className={`text-headline-md font-bold ${growthRate >= 0 ? 'text-[#4ade80]' : 'text-error'}`}>
                  {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed (Right Column) */}
          <div className="glass-panel rounded-xl p-lg flex flex-col">
            <div className="flex items-center justify-between mb-lg">
              <h4 className="font-headline-md text-on-surface">Recent Activity</h4>
              <Link to="/admin/reports" className="text-primary font-label-md hover:underline">View All</Link>
            </div>
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0 bg-surface border border-outline-variant/30" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-full bg-surface border border-outline-variant/30" />
                      <Skeleton className="h-3 w-24 bg-surface border border-outline-variant/30" />
                    </div>
                  </div>
                ))
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${a.iconColor}`}>
                        <span className="material-symbols-outlined text-[20px]">{a.icon}</span>
                      </div>
                      {i < activity.length - 1 && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1px] h-6 bg-outline-variant/30"></div>
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-body-md text-on-surface text-pretty">{a.text}</p>
                      <p className="text-label-sm text-on-surface-variant">{a.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Top Courses Row */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-lg pb-10">
          <div className="col-span-full">
            <div className="flex items-center justify-between">
              <h4 className="font-headline-md text-on-surface">Top Courses</h4>
              <Link to="/admin/courses" className="text-primary font-label-md hover:underline">Manage All</Link>
            </div>
          </div>
          
          {loading ? (
             [...Array(2)].map((_, i) => (
              <div key={i} className="glass-panel p-lg rounded-xl flex items-center gap-6">
                 <Skeleton className="w-24 h-24 flex-shrink-0 rounded-lg bg-surface border border-outline-variant/30" />
                 <div className="flex-1 space-y-2">
                   <Skeleton className="h-4 w-16 bg-surface border border-outline-variant/30" />
                   <Skeleton className="h-6 w-48 bg-surface border border-outline-variant/30" />
                   <Skeleton className="h-3 w-32 bg-surface border border-outline-variant/30" />
                 </div>
              </div>
             ))
          ) : (
            courses.slice(0, 4).map((c, i) => {
              const isFirst = i % 2 === 0;
              const colorTheme = isFirst ? 'primary' : 'secondary';
              const maxStudents = courses.length > 0 ? courses[0].student_count : 1;
              const progressWidth = `${Math.max((c.student_count / Math.max(maxStudents, 1)) * 100, 5)}%`;
              
              return (
                <div key={c.id} className={`glass-panel p-lg rounded-xl flex items-center gap-6 group hover:border-${colorTheme} transition-all`}>
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-highest">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-[32px]">image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`bg-${colorTheme}/20 text-${colorTheme} text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-widest`}>
                      {c.is_published ? 'Published' : 'Draft'}
                    </span>
                    <h5 className="text-headline-md mt-1 text-on-surface line-clamp-1">{c.title}</h5>
                    <p className="text-label-sm text-on-surface-variant mb-3">{c.student_count} Students • {c.category}</p>
                    <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                      <div className={`bg-${colorTheme} h-full rounded-full glow-${colorTheme}`} style={{ width: progressWidth }}></div>
                    </div>
                  </div>
                  <Link to={`/admin/courses/${c.id}/edit`} className={`p-3 bg-surface-container-high rounded-full group-hover:bg-${colorTheme} group-hover:text-on-${colorTheme} transition-all text-on-surface-variant`}>
                    <span className="material-symbols-outlined">edit</span>
                  </Link>
                </div>
              )
            })
          )}
        </section>

      </div>
    </AppLayout>
  );
}
