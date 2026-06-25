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
        acts.push({ icon: 'person_add', iconColor: 'text-primary bg-primary/10 border-primary/20', text: `New enrollment in "${courseTitle}"`, time: new Date(e.created_at).toLocaleString() });
      });
      (postRes.data ?? []).forEach((p: { created_at: string; title: string }) => {
        acts.push({ icon: 'forum', iconColor: 'text-warning bg-warning/10 border-warning/20', text: `New forum post: ${p.title}`, time: new Date(p.created_at).toLocaleString() });
      });
      acts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(acts.slice(0, 8));

      setLoading(false);
    })();
  }, []);

  const avgDaily = trendData.length > 0 ? Math.round(trendData.reduce((acc, curr) => acc + curr.signups, 0) / trendData.length) : 0;
  const peakSignups = trendData.length > 0 ? Math.max(...trendData.map(t => t.signups)) : 0;

  return (
    <AppLayout title="Admin Dashboard" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Welcome back, Admin</h2>
            <p className="font-body-lg text-[16px] text-text-secondary mt-2 max-w-2xl">Here is what's happening with your platform today. Revenue and engagement are trending <span className="text-success font-medium">upwards</span>.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button className="px-5 py-2.5 bg-surface border border-border-base rounded-xl font-label-md text-[14px] font-bold text-text-primary hover:bg-surface-container transition-colors shadow-sm card-lift min-h-[44px]">Export Data</button>
            <Link to="/admin/courses" className="px-5 py-2.5 bg-primary text-white rounded-xl font-label-md text-[14px] font-bold hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center justify-center gap-2 card-lift min-h-[44px]">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Course
            </Link>
          </div>
        </section>

        {/* Top KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-label-sm text-[11px] text-text-secondary font-bold uppercase tracking-widest">Total Students</p>
                <h3 className="font-headline-lg text-[32px] font-bold text-text-primary mt-1">{stats?.total_students?.toLocaleString() ?? 0}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">group</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center text-success font-label-sm text-[11px] font-bold bg-success/10 px-2 py-0.5 rounded border border-success/20">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 12.5%
              </span>
              <span className="font-body-sm text-[12px] text-text-secondary font-medium">vs last month</span>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-label-sm text-[11px] text-text-secondary font-bold uppercase tracking-widest">Total Courses</p>
                <h3 className="font-headline-lg text-[32px] font-bold text-text-primary mt-1">{stats?.published_courses?.toLocaleString() ?? 0}</h3>
              </div>
              <div className="p-3 bg-tertiary/10 rounded-xl text-tertiary border border-tertiary/20 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">library_books</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center text-text-secondary font-label-sm text-[11px] font-bold bg-surface-container px-2 py-0.5 rounded border border-border-base">
                <span className="material-symbols-outlined text-[14px]">drag_handle</span> 0.0%
              </span>
              <span className="font-body-sm text-[12px] text-text-secondary font-medium">vs last month</span>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-label-sm text-[11px] text-text-secondary font-bold uppercase tracking-widest">Enrollments</p>
                <h3 className="font-headline-lg text-[32px] font-bold text-text-primary mt-1">{stats?.total_enrollments?.toLocaleString() ?? 0}</h3>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl text-secondary border border-secondary/20 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">school</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center text-success font-label-sm text-[11px] font-bold bg-success/10 px-2 py-0.5 rounded border border-success/20">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 8.2%
              </span>
              <span className="font-body-sm text-[12px] text-text-secondary font-medium">vs last month</span>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group ai-gradient-border">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                   <p className="font-label-sm text-[11px] text-text-secondary font-bold uppercase tracking-widest">Live Signups (14d)</p>
                </div>
                <h3 className="font-headline-lg text-[32px] font-bold text-text-primary mt-1">{avgDaily}/day</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">sensors</span>
              </div>
            </div>
            <div className="w-full h-8 mt-2 flex items-end gap-1.5 opacity-80 relative z-10">
              {trendData.slice(-6).map((d, i) => {
                 const h = Math.max((d.signups / (peakSignups || 1)) * 100, 10);
                 return <div key={i} className="flex-1 bg-gradient-to-t from-primary/80 to-primary rounded-t-sm shadow-inner" style={{ height: `${h}%` }}></div>;
              })}
            </div>
          </div>
        </section>

        {/* Analytics & Management Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Enrollment Trend Chart */}
            <div className="glass-panel rounded-2xl border border-border-base p-6 md:p-8 shadow-sm flex flex-col min-h-[400px] card-lift">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h3 className="font-headline-md text-[24px] font-bold text-text-primary">Enrollment Trends</h3>
                  <p className="font-body-sm text-[14px] text-text-secondary mt-1">Daily student signups for the last 14 days.</p>
                </div>
                <div className="flex bg-surface-container rounded-lg p-1 border border-border-base shadow-inner">
                  <button className="px-4 py-1.5 text-label-sm text-[12px] font-bold rounded-md bg-surface shadow-sm text-text-primary">14D</button>
                  <button className="px-4 py-1.5 text-label-sm text-[12px] font-bold rounded-md text-text-secondary hover:text-text-primary transition-colors">30D</button>
                  <button className="px-4 py-1.5 text-label-sm text-[12px] font-bold rounded-md text-text-secondary hover:text-text-primary transition-colors">YTD</button>
                </div>
              </div>
              
              <div className="flex-1 flex items-end justify-between gap-3 h-64 pt-8 border-t border-l border-border-base relative mt-4">
                {trendData.length > 0 ? trendData.map((day, idx) => {
                  const maxVal = Math.max(peakSignups, 1);
                  const heightPercent = Math.max((day.signups / maxVal) * 100, 2);
                  const isMax = day.signups === peakSignups && day.signups > 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end z-10 relative">
                      <div className="w-full bg-surface-container rounded-t-md relative flex items-end overflow-hidden h-full border border-border-base border-b-0 shadow-inner">
                        <div 
                          className={`w-full ${isMax ? 'bg-gradient-to-t from-primary to-secondary shadow-[0_0_12px_rgba(37,99,235,0.4)]' : 'bg-primary/40 group-hover:bg-primary transition-all'} rounded-t-md`} 
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                      </div>
                      <span className={`font-label-sm text-[11px] ${isMax ? 'text-primary font-bold' : 'text-text-secondary font-medium'}`}>
                        {new Date(day.trend_date).getDate().toString().padStart(2, '0')}
                      </span>
                      {isMax && <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-primary border border-primary/20 text-[10px] font-bold px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">Peak</div>}
                    </div>
                  );
                }) : (
                  <div className="absolute inset-0 flex items-center justify-center text-text-secondary font-label-md text-[14px]">Loading trend data...</div>
                )}
                <div className="absolute inset-0 flex flex-col justify-between opacity-30 z-0">
                  <div className="border-b border-dashed border-border-base h-0 w-full"></div>
                  <div className="border-b border-dashed border-border-base h-0 w-full"></div>
                  <div className="border-b border-dashed border-border-base h-0 w-full"></div>
                  <div className="border-b border-dashed border-border-base h-0 w-full"></div>
                </div>
              </div>
            </div>

            {/* Top Performing Courses Table */}
            <div className="glass-panel rounded-2xl border border-border-base shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-border-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface/30">
                <div>
                  <h3 className="font-headline-md text-[24px] font-bold text-text-primary">Top Performing Courses</h3>
                  <p className="font-body-sm text-[14px] text-text-secondary mt-1">Based on student enrollments.</p>
                </div>
                <Link to="/admin/courses" className="text-primary font-label-sm text-[13px] font-bold hover:underline flex items-center gap-1">
                   View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-container/50 border-b border-border-base">
                      <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Course Name</th>
                      <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Students</th>
                      <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-base">
                    {courses.map((course, idx) => {
                      const gradients = [
                        'from-tertiary-container to-primary',
                        'from-secondary to-primary-container',
                        'from-primary to-tertiary',
                        'from-warning to-error'
                      ];
                      const gradient = gradients[idx % gradients.length];
                      return (
                        <tr key={course.id} className="hover:bg-surface-container/30 transition-colors group">
                          <td className="p-4 px-6 flex items-center gap-4">
                            {course.thumbnail_url ? (
                               <img src={course.thumbnail_url} alt={course.title} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-border-base" />
                            ) : (
                               <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-[16px] shadow-sm`}>
                                  {course.title.substring(0, 2).toUpperCase()}
                               </div>
                            )}
                            <div>
                              <p className="font-body-md text-[15px] font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">{course.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-secondary-container"></span>
                                <span className="text-[12px] text-text-secondary font-medium">{course.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 px-6 font-body-md text-[15px] font-bold text-text-primary">{course.student_count.toLocaleString()}</td>
                          <td className="p-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wider border ${course.is_published ? 'bg-success/10 text-success border-success/20' : 'bg-surface-container text-text-secondary border-border-base'}`}>
                              {course.is_published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            
            {/* Loom Intelligence Brief */}
            <div className="glass-panel rounded-2xl border border-border-base p-6 shadow-sm relative overflow-hidden card-lift">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-tertiary"></div>
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-tertiary/10 blur-3xl rounded-full pointer-events-none"></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-primary/10 rounded-lg text-primary shadow-inner border border-primary/20">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <h3 className="font-headline-md text-[20px] font-bold ai-gradient-text">Loom Intelligence</h3>
              </div>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div className="bg-surface rounded-xl p-4 border border-border-base shadow-sm">
                  <h4 className="font-label-md text-[13px] font-bold text-text-primary mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span> Engagement Spike
                  </h4>
                  <p className="font-body-sm text-[13px] text-text-secondary leading-relaxed">Machine Learning courses are seeing a 45% increase in active minutes today.</p>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-border-base shadow-sm">
                  <h4 className="font-label-md text-[13px] font-bold text-text-primary mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-success" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span> Milestone
                  </h4>
                  <p className="font-body-sm text-[13px] text-text-secondary leading-relaxed">The platform is on track to issue its 10,000th certificate this week.</p>
                </div>
              </div>
            </div>

            {/* Activity Stream */}
            <div className="glass-panel rounded-2xl border border-border-base p-6 shadow-sm flex flex-col flex-1 card-lift">
              <div className="flex items-center justify-between mb-6 border-b border-border-base pb-4">
                <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
                   <span className="material-symbols-outlined text-text-secondary">history</span> Activity Stream
                </h3>
                <button className="text-text-secondary hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                </button>
              </div>
              
              <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[400px]">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-10 h-10 rounded-full shrink-0 bg-surface border border-border-base" />
                      <div className="flex-1 space-y-2 pt-1">
                        <Skeleton className="h-4 w-full bg-surface border border-border-base" />
                        <Skeleton className="h-3 w-24 bg-surface border border-border-base" />
                      </div>
                    </div>
                  ))
                ) : activity.length === 0 ? (
                  <p className="text-[14px] text-text-secondary text-center py-4 font-medium">No recent activity</p>
                ) : (
                  activity.map((a, i) => (
                    <div key={i} className="flex gap-4 relative group cursor-pointer">
                      {i < activity.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-surface-container-highest group-hover:bg-primary/30 transition-colors"></div>
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0 border shadow-sm ${a.iconColor} bg-surface transition-transform group-hover:scale-110`}>
                        <span className="material-symbols-outlined text-[18px]">{a.icon}</span>
                      </div>
                      <div className="pt-1">
                        <p className="font-body-sm text-[14px] text-text-primary font-medium group-hover:text-primary transition-colors">{a.text}</p>
                        <p className="font-label-sm text-[11px] text-text-secondary mt-1 font-bold">{a.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full mt-6 py-2.5 border border-border-base rounded-xl font-label-sm text-[13px] font-bold text-text-secondary hover:bg-surface hover:text-text-primary transition-colors shadow-sm bg-surface/50 min-h-[44px]">
                View Full Log
              </button>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}
