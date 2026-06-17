import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Download, Calendar, Group, School, TaskAlt, WorkspacePremium, Bolt, BarChart, Assignment, Forum, Star } from 'lucide-react';
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
    a.download = `learnloom-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  };

  return (
    <AppLayout title="Advanced Reports" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Advanced Reports</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Deep dive into performance, engagement, and completion data across the platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={fetchData} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <div className="flex items-center gap-2 bg-surface-container border border-border-base px-4 py-2.5 rounded-xl h-11 shadow-inner">
               <Calendar className="w-4 h-4 text-primary" />
               <span className="text-label-md text-[13px] font-bold text-text-primary">All Time</span>
             </div>
             <button onClick={handleExport} disabled={loading || !stats} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-label-md text-[14px] font-bold shadow-sm transition-all card-lift disabled:opacity-50 disabled:cursor-not-allowed">
                <Download className="w-4 h-4" />
                Export CSV
             </button>
          </div>
        </section>

        {/* Core KPIs Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Total Students</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-inner">
                <Group className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">{loading ? <Skeleton className="h-10 w-24 bg-surface-container" /> : stats?.total_students?.toLocaleString() ?? '—'}</div>
              <p className="text-[12px] text-success font-bold mt-2 flex items-center gap-1">+12.5% <span className="text-text-secondary font-medium">vs last month</span></p>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Completion Rate</span>
              <div className="p-2.5 bg-secondary/10 rounded-xl text-secondary border border-secondary/20 shadow-inner">
                <TaskAlt className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">{loading ? <Skeleton className="h-10 w-20 bg-surface-container" /> : `${completionRate}%`}</div>
              <div className="w-full bg-surface-container h-1.5 rounded-full mt-3 overflow-hidden border border-border-base/50">
                <div className="bg-gradient-to-r from-primary to-secondary h-full shadow-[0_0_8px_rgba(221,183,255,0.6)] rounded-full transition-all duration-1000 ease-out" style={{ width: `${completionRate}%` }}></div>
              </div>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Certificates</span>
              <div className="p-2.5 bg-warning/10 rounded-xl text-warning border border-warning/20 shadow-inner">
                <WorkspacePremium className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">{loading ? <Skeleton className="h-10 w-20 bg-surface-container" /> : stats?.certificates_issued?.toLocaleString() ?? '—'}</div>
              <p className="text-[12px] text-success font-bold mt-2 flex items-center gap-1">+4.2% <span className="text-text-secondary font-medium">vs last month</span></p>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Avg Quiz Tries</span>
              <div className="p-2.5 bg-error/10 rounded-xl text-error border border-error/20 shadow-inner">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">{loading ? <Skeleton className="h-10 w-16 bg-surface-container" /> : avgQuizAttempts}</div>
              <p className="text-[12px] text-text-secondary font-medium mt-2 flex items-center gap-1">Optimal engagement range</p>
            </div>
          </div>
        </section>

        {/* Activity Deep Dive */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm flex items-start gap-5 hover:bg-surface-container/20 transition-colors">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shrink-0 shadow-inner text-white">
              <BarChart className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-text-primary leading-none mb-1">{loading ? <Skeleton className="h-8 w-20 bg-surface-container" /> : (stats?.total_enrollments ?? 0).toLocaleString()}</div>
              <div className="text-[15px] font-bold text-text-primary mb-1">Total Enrollments</div>
              <div className="text-[13px] text-text-secondary">All-time course enrollments</div>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm flex items-start gap-5 hover:bg-surface-container/20 transition-colors">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-tertiary-container flex items-center justify-center shrink-0 shadow-inner text-white">
              <Assignment className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-text-primary leading-none mb-1">{loading ? <Skeleton className="h-8 w-20 bg-surface-container" /> : (stats?.total_submissions ?? 0).toLocaleString()}</div>
              <div className="text-[15px] font-bold text-text-primary mb-1">Assignment Submissions</div>
              <div className="text-[13px] text-text-secondary">Student submissions received</div>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm flex items-start gap-5 hover:bg-surface-container/20 transition-colors">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-warning to-error flex items-center justify-center shrink-0 shadow-inner text-white">
              <Forum className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-text-primary leading-none mb-1">{loading ? <Skeleton className="h-8 w-20 bg-surface-container" /> : (stats?.forum_posts_count ?? 0).toLocaleString()}</div>
              <div className="text-[15px] font-bold text-text-primary mb-1">Community Posts</div>
              <div className="text-[13px] text-text-secondary">Forum discussions started</div>
            </div>
          </div>
        </div>

        {/* Course Engagement Table */}
        <section className="glass-panel border border-border-base rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 md:px-8 py-5 border-b border-border-base flex justify-between items-center bg-surface/50">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              Top Course Engagement
            </h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container/30 border-b border-border-base">
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Course Name</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-center">Students</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-center">Rating</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base bg-surface/20">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-10 w-full bg-surface-container rounded-lg" /></td></tr>
                    ))
                  : courses.map(c => {
                      const maxCount = courses[0]?.student_count ?? 1;
                      const pct = maxCount > 0 ? Math.round((c.student_count / maxCount) * 100) : 0;
                      return (
                        <tr key={c.id} className="hover:bg-surface-container/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-body-md text-[15px] font-bold text-text-primary max-w-[250px] truncate block">{c.title}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[12px] font-bold border border-primary/20">{c.category || 'Uncategorized'}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-[15px] font-bold text-text-primary">{c.student_count?.toLocaleString() ?? 0}</td>
                          <td className="px-6 py-4 text-center text-warning font-bold flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 fill-warning text-warning" />
                            {c.rating?.toFixed(1) ?? '—'}
                          </td>
                          <td className="px-6 py-4 min-w-[150px]">
                            <div className="flex items-center gap-3">
                              <div className="h-2.5 flex-1 bg-surface-container border border-border-base/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(192,193,255,0.4)]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[12px] font-bold text-text-secondary w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
