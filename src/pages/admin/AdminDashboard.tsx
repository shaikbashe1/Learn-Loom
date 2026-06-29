import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import type { AdminStats, DailyTrendData } from '@/types/types';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  Activity, 
  Plus, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  Filter, 
  ArrowRight,
  ChevronRight,
  Eye,
  Calendar,
  Settings
} from 'lucide-react';

interface RecentActivity { text: string; time: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; }
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
        acts.push({ icon: GraduationCap, iconColor: 'text-primary bg-primary/10 border-primary/20', text: `New enrollment in "${courseTitle}"`, time: new Date(e.created_at).toLocaleString() });
      });
      (postRes.data ?? []).forEach((p: { created_at: string; title: string }) => {
        acts.push({ icon: Activity, iconColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20', text: `New forum post: ${p.title}`, time: new Date(p.created_at).toLocaleString() });
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
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-8 w-full select-none">
        
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back, Admin
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed font-semibold">
              Here is what's happening with your platform today. Revenue and engagement are trending{' '}
              <span className="text-emerald-500 font-extrabold">upwards</span>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button className="px-5 py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted/50 transition-colors shadow-sm min-h-[40px]">
              Export Data
            </button>
            <Link 
              to="/admin/courses" 
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 min-h-[40px]"
            >
              <Plus className="h-4 w-4" />
              <span>New Course</span>
            </Link>
          </div>
        </section>

        {/* Top KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* KPI 1 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:border-border/85 transition-all relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Total Students</p>
                <h3 className="font-display text-2xl font-extrabold text-foreground mt-1.5">
                  {stats?.total_students?.toLocaleString() ?? 0}
                </h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <TrendingUp className="h-3 w-3" /> 12.5%
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold">vs last month</span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:border-border/85 transition-all relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Total Courses</p>
                <h3 className="font-display text-2xl font-extrabold text-foreground mt-1.5">
                  {stats?.published_courses?.toLocaleString() ?? 0}
                </h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center text-muted-foreground text-[10px] font-bold bg-muted px-2 py-0.5 rounded-lg border border-border">
                0.0%
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold">vs last month</span>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:border-border/85 transition-all relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Enrollments</p>
                <h3 className="font-display text-2xl font-extrabold text-foreground mt-1.5">
                  {stats?.total_enrollments?.toLocaleString() ?? 0}
                </h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <TrendingUp className="h-3 w-3" /> 8.2%
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold">vs last month</span>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:border-border/85 transition-all relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                   <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Live Signups (14d)</p>
                </div>
                <h3 className="font-display text-2xl font-extrabold text-foreground mt-1.5">{avgDaily}/day</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            {/* Sparkline */}
            <div className="w-full h-8 mt-2 flex items-end gap-1.5 opacity-80 relative z-10">
              {trendData.slice(-6).map((d, i) => {
                 const h = Math.max((d.signups / (peakSignups || 1)) * 100, 10);
                 return (
                   <div 
                     key={i} 
                     className="flex-grow bg-gradient-to-t from-primary/80 to-primary rounded-t-lg shadow-sm" 
                     style={{ height: `${h}%` }}
                   />
                 );
              })}
            </div>
          </div>
        </section>

        {/* Analytics & Management Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Enrollment Trend Chart */}
            <div className="bg-card rounded-3xl border border-border p-6 md:p-8 shadow-sm flex flex-col min-h-[400px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Enrollment Trends</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">Daily student signups for the last 14 days.</p>
                </div>
                <div className="flex bg-muted rounded-xl p-1 border border-border shadow-inner gap-1">
                  <button className="px-4 py-1.5 text-xs font-bold rounded-lg bg-card shadow-sm text-foreground">14D</button>
                  <button className="px-4 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground transition-all">30D</button>
                  <button className="px-4 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground transition-all">YTD</button>
                </div>
              </div>
              
              <div className="flex-grow flex items-end justify-between gap-3 h-64 pt-8 border-t border-l border-border relative mt-4">
                {trendData.length > 0 ? trendData.map((day, idx) => {
                  const maxVal = Math.max(peakSignups, 1);
                  const heightPercent = Math.max((day.signups / maxVal) * 100, 2);
                  const isMax = day.signups === peakSignups && day.signups > 0;
                  return (
                    <div key={idx} className="flex-grow flex flex-col items-center gap-3 group h-full justify-end z-10 relative">
                      <div className="w-full bg-muted rounded-t-lg relative flex items-end overflow-hidden h-full">
                        <div 
                          className={`w-full ${
                            isMax 
                              ? 'bg-gradient-to-t from-primary to-chart-4 shadow-sm shadow-primary/20' 
                              : 'bg-primary/40 group-hover:bg-primary transition-all'
                          } rounded-t-lg`} 
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${isMax ? 'text-primary' : 'text-muted-foreground'}`}>
                        {new Date(day.trend_date).getDate().toString().padStart(2, '0')}
                      </span>
                      {isMax && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card text-primary border border-primary/20 text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Peak
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs font-semibold">
                    Loading trend data...
                  </div>
                )}
                
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between opacity-10 z-0">
                  <div className="border-b border-dashed border-foreground h-0 w-full" />
                  <div className="border-b border-dashed border-foreground h-0 w-full" />
                  <div className="border-b border-dashed border-foreground h-0 w-full" />
                  <div className="border-b border-dashed border-foreground h-0 w-full" />
                </div>
              </div>
            </div>

            {/* Top Performing Courses Table */}
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Top Performing Courses</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">Based on student enrollments.</p>
                </div>
                <Link to="/admin/courses" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  <span>View All</span> <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Course Name</th>
                      <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Students</th>
                      <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {courses.map((course, idx) => {
                      const gradients = [
                        'from-blue-500/10 to-primary/20 text-primary border-primary/20',
                        'from-emerald-500/10 to-teal-500/20 text-emerald-500 border-emerald-500/20',
                        'from-purple-500/10 to-chart-4/20 text-chart-4 border-chart-4/20',
                        'from-amber-500/10 to-orange-500/20 text-amber-500 border-amber-500/20'
                      ];
                      const gradientClass = gradients[idx % gradients.length];
                      return (
                        <tr key={course.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-4 px-6 flex items-center gap-4">
                            {course.thumbnail_url ? (
                               <img src={course.thumbnail_url} alt={course.title} className="w-11 h-11 rounded-xl object-cover border border-border shadow-sm" />
                            ) : (
                               <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center font-bold text-sm border shadow-sm shrink-0`}>
                                  {course.title.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground line-clamp-1 leading-normal">
                                {course.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 font-semibold text-[10px] text-muted-foreground">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                                <span>{course.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 px-6 text-xs font-bold text-foreground">
                            {course.student_count.toLocaleString()}
                          </td>
                          <td className="p-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                              course.is_published 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                : 'bg-muted text-muted-foreground border-border'
                            }`}>
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
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-chart-4" />
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2.5 mb-6 relative z-10">
                <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-sm shrink-0">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-foreground tracking-tight">Loom Intelligence</h3>
              </div>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div className="bg-background rounded-2xl p-4 border border-border shadow-sm">
                  <h4 className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-amber-500" /> 
                    <span>Engagement Spike</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                    Machine Learning courses are seeing a 45% increase in active minutes today.
                  </p>
                </div>
                
                <div className="bg-background rounded-2xl p-4 border border-border shadow-sm">
                  <h4 className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 
                    <span>Milestone Reached</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                    The platform is on track to issue its 10,000th certificate this week.
                  </p>
                </div>
              </div>
            </div>

            {/* Activity Stream */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col flex-grow">
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                   <Activity className="h-4.5 w-4.5 text-primary" /> Activity Stream
                </h3>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide flex-grow max-h-[400px]">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-9 h-9 rounded-full shrink-0 bg-muted" />
                      <div className="flex-grow space-y-2 pt-1">
                        <Skeleton className="h-3 w-full bg-muted rounded-lg" />
                        <Skeleton className="h-2 w-20 bg-muted rounded-lg" />
                      </div>
                    </div>
                  ))
                ) : activity.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 font-semibold">No recent activity</p>
                ) : (
                  activity.map((a, i) => {
                    const ActivityIcon = a.icon;
                    return (
                      <div key={i} className="flex gap-4 relative group cursor-pointer">
                        {i < activity.length - 1 && (
                          <div className="absolute left-[17px] top-9 bottom-[-24px] w-0.5 bg-border group-hover:bg-primary/20 transition-colors" />
                        )}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center z-10 shrink-0 border shadow-sm ${a.iconColor} bg-card transition-transform group-hover:scale-105`}>
                          <ActivityIcon className="h-4 w-4" />
                        </div>
                        <div className="pt-0.5">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-normal">
                            {a.text}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                            {a.time}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <button className="w-full mt-6 py-2.5 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all shadow-sm bg-background min-h-[40px]">
                View Full Log
              </button>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}
