import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  Download, 
  Calendar, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Award, 
  BarChart, 
  FileText, 
  MessageSquare, 
  Star 
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface ReportStats {
  total_students: number;
  total_courses: number;
  total_enrollments: number;
  completed_enrollments: number;
  certificates_issued: number;
  total_quiz_attempts: number;
  total_submissions: number;
  forum_posts_count: number;
}

interface CourseEngagement {
  id: string;
  title: string;
  category: string;
  student_count: number;
  rating: number;
}

export default function AdminReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [courses, setCourses] = useState<CourseEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [statsRes, coursesRes] = await Promise.all([
      supabase.rpc('get_admin_stats').single(),
      supabase.from('courses')
        .select('id, title, category, student_count, rating')
        .order('student_count', { ascending: false })
        .limit(8),
    ]);
    if (statsRes.error) toast.error('Failed to load report data');
    setStats(statsRes.data as ReportStats | null);
    setCourses(coursesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const completionRate = stats && stats.total_enrollments > 0
    ? Math.round((stats.completed_enrollments / stats.total_enrollments) * 100)
    : 0;

  const avgQuizAttempts = stats && stats.total_students > 0
    ? (stats.total_quiz_attempts / stats.total_students).toFixed(1)
    : '0';

  const handleExport = () => {
    if (!stats) return;
    const csv = [
      'Metric,Value',
      `Total Students,${stats.total_students}`,
      `Total Courses,${stats.total_courses}`,
      `Total Enrollments,${stats.total_enrollments}`,
      `Completed Enrollments,${stats.completed_enrollments}`,
      `Course Completion Rate,${completionRate}%`,
      `Certificates Issued,${stats.certificates_issued}`,
      `Total Quiz Attempts,${stats.total_quiz_attempts}`,
      `Total Submissions,${stats.total_submissions}`,
      `Forum Posts,${stats.forum_posts_count}`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quovexi-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  };

  return (
    <AppLayout title="Advanced Reports" isAdmin>
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Advanced Reports</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Deep dive into performance, engagement, and completion data across the platform.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={fetchData} 
               className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all shadow-sm"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             
             <div className="flex items-center gap-2 bg-card border border-border px-4 py-2.5 rounded-xl h-10 shadow-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">All Time</span>
             </div>
             
             <Button 
               onClick={handleExport} 
               disabled={loading || !stats} 
               className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99] text-xs font-bold shadow-md shadow-primary/10 transition-all min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
             >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
             </Button>
          </div>
        </section>

        {/* Core KPIs Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* KPI 1 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Total Students</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Skeleton className="h-9 w-24 bg-muted" /> : stats?.total_students?.toLocaleString() ?? '—'}
              </div>
              <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1">
                +12.5% <span className="text-muted-foreground font-semibold">vs last month</span>
              </p>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Completion Rate</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Skeleton className="h-9 w-20 bg-muted" /> : `${completionRate}%`}
              </div>
              <div className="w-full bg-muted h-2 rounded-full mt-4 overflow-hidden border border-border">
                <div 
                  className="bg-gradient-to-r from-primary to-chart-4 h-full rounded-full transition-all duration-1000 ease-out shadow-sm shadow-primary/10" 
                  style={{ width: `${completionRate}%` }} 
                />
              </div>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Certificates</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Skeleton className="h-9 w-20 bg-muted" /> : stats?.certificates_issued?.toLocaleString() ?? '—'}
              </div>
              <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1">
                +4.2% <span className="text-muted-foreground font-semibold">vs last month</span>
              </p>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Avg Quiz Tries</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Skeleton className="h-9 w-16 bg-muted" /> : avgQuizAttempts}
              </div>
              <p className="text-[10px] text-muted-foreground font-bold mt-2">Optimal engagement range</p>
            </div>
          </div>
        </section>

        {/* Activity Deep Dive */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-start gap-5 hover:border-border/80 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/25 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
              <BarChart className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground leading-none mb-1">
                {loading ? <Skeleton className="h-7 w-20 bg-muted" /> : (stats?.total_enrollments ?? 0).toLocaleString()}
              </div>
              <div className="text-xs font-bold text-foreground">Total Enrollments</div>
              <div className="text-[10px] text-muted-foreground font-semibold mt-1">All-time course enrollments</div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-start gap-5 hover:border-border/80 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/25 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
              <FileText className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground leading-none mb-1">
                {loading ? <Skeleton className="h-7 w-20 bg-muted" /> : (stats?.total_submissions ?? 0).toLocaleString()}
              </div>
              <div className="text-xs font-bold text-foreground">Assignment Submissions</div>
              <div className="text-[10px] text-muted-foreground font-semibold mt-1">Student submissions received</div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-start gap-5 hover:border-border/80 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/25 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
              <MessageSquare className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-foreground leading-none mb-1">
                {loading ? <Skeleton className="h-7 w-20 bg-muted" /> : (stats?.forum_posts_count ?? 0).toLocaleString()}
              </div>
              <div className="text-xs font-bold text-foreground">Community Posts</div>
              <div className="text-[10px] text-muted-foreground font-semibold mt-1">Forum discussions started</div>
            </div>
          </div>
        </div>

        {/* Course Engagement Table */}
        <section className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/20">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <GraduationCap className="w-4.5 h-4.5 text-primary" />
              Top Course Engagement
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Course Name</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-center">Students</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-center">Rating</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-6 py-4">
                          <Skeleton className="h-10 w-full bg-muted rounded-xl" />
                        </td>
                      </tr>
                    ))
                  : courses.map(c => {
                      const maxCount = courses[0]?.student_count ?? 1;
                      const pct = maxCount > 0 ? Math.round((c.student_count / maxCount) * 100) : 0;
                      return (
                        <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-foreground max-w-[250px] truncate block">
                              {c.title}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-extrabold border border-primary/20">
                              {c.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-bold text-foreground">
                            {c.student_count?.toLocaleString() ?? 0}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1 text-xs font-bold text-amber-500">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>{c.rating?.toFixed(1) ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 min-w-[150px]">
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 bg-muted border border-border rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-chart-4 rounded-full transition-all duration-1000 ease-out shadow-sm" 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                              <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
