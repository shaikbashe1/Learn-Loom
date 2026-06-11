import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Download, Users, BookOpen, Award, Zap, BarChart3, Activity, RefreshCw } from 'lucide-react';
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
    <AppLayout title="Reports" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        {/* Action Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
          <div>
            <h2 className="font-display text-display text-on-surface leading-tight">Advanced Metrics</h2>
            <p className="font-body-lg text-on-surface-variant mt-2">Deep dive into performance, engagement, and completion data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-md">
            <Button variant="ghost" size="sm" onClick={fetchData} className="border border-outline-variant text-on-surface hover:bg-surface-variant h-11 w-11 rounded-xl">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center gap-2 bg-surface-container-high border border-outline-variant px-4 py-2 rounded-xl h-11">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
              <span className="text-label-md text-on-surface">All Time</span>
            </div>
            <button onClick={handleExport} disabled={loading || !stats} className="flex items-center gap-2 px-4 py-2 h-11 rounded-xl bg-surface-container-high border border-outline-variant hover:border-primary transition-all text-label-md text-on-surface disabled:opacity-50">
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-2xl">
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between transition-all hover:border-primary hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(192,193,255,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant font-label-md">Total Students</span>
              <span className="text-primary material-symbols-outlined">group</span>
            </div>
            <div>
              <div className="text-headline-md font-bold text-on-surface">{loading ? <Skeleton className="h-8 w-20 bg-surface-container-high" /> : stats?.total_students?.toLocaleString() ?? '—'}</div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between transition-all hover:border-primary hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(192,193,255,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant font-label-md">Completion Rate</span>
              <span className="text-secondary material-symbols-outlined">task_alt</span>
            </div>
            <div>
              <div className="text-headline-md font-bold text-on-surface">{loading ? <Skeleton className="h-8 w-16 bg-surface-container-high" /> : `${completionRate}%`}</div>
              <div className="w-full bg-surface-variant h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-secondary h-full shadow-[0_0_8px_rgba(221,183,255,0.6)]" style={{ width: `${completionRate}%` }}></div>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between transition-all hover:border-primary hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(192,193,255,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant font-label-md">Certificates Issued</span>
              <span className="text-gold-tier material-symbols-outlined">workspace_premium</span>
            </div>
            <div>
              <div className="text-headline-md font-bold text-on-surface">{loading ? <Skeleton className="h-8 w-16 bg-surface-container-high" /> : stats?.certificates_issued?.toLocaleString() ?? '—'}</div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between transition-all hover:border-primary hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(192,193,255,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant font-label-md">Avg Quiz Attempts</span>
              <span className="text-primary material-symbols-outlined">sync</span>
            </div>
            <div>
              <div className="text-headline-md font-bold text-on-surface">{loading ? <Skeleton className="h-8 w-12 bg-surface-container-high" /> : avgQuizAttempts}</div>
            </div>
          </div>
        </section>

        {/* Activity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-2xl">
          <div className="glass-panel rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <span className="material-symbols-outlined text-primary text-[24px]">bar_chart</span>
            </div>
            <div>
              <div className="text-headline-md font-bold text-on-surface">{loading ? '—' : (stats?.total_enrollments ?? 0).toLocaleString()}</div>
              <div className="text-body-md font-medium text-on-surface mt-1">Total Enrollments</div>
              <div className="text-label-sm text-on-surface-variant">All-time course enrollments</div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 border border-secondary/20">
              <span className="material-symbols-outlined text-secondary text-[24px]">assignment</span>
            </div>
            <div>
              <div className="text-headline-md font-bold text-on-surface">{loading ? '—' : (stats?.total_submissions ?? 0).toLocaleString()}</div>
              <div className="text-body-md font-medium text-on-surface mt-1">Assignment Submissions</div>
              <div className="text-label-sm text-on-surface-variant">Student submissions received</div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0 border border-tertiary/20">
              <span className="material-symbols-outlined text-tertiary text-[24px]">forum</span>
            </div>
            <div>
              <div className="text-headline-md font-bold text-on-surface">{loading ? '—' : (stats?.forum_posts_count ?? 0).toLocaleString()}</div>
              <div className="text-body-md font-medium text-on-surface mt-1">Community Posts</div>
              <div className="text-label-sm text-on-surface-variant">Forum discussions started</div>
            </div>
          </div>
        </div>

        {/* Course Engagement Table */}
        <section className="glass-panel rounded-xl overflow-hidden mb-xl">
          <div className="px-lg py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container/50">
            <h3 className="font-headline-md text-on-surface">Course Engagement</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-high/30">
                  <th className="px-lg py-4 font-label-md text-on-surface-variant uppercase tracking-wider">Course Name</th>
                  <th className="px-lg py-4 font-label-md text-on-surface-variant uppercase tracking-wider">Category</th>
                  <th className="px-lg py-4 font-label-md text-on-surface-variant uppercase tracking-wider text-center">Students</th>
                  <th className="px-lg py-4 font-label-md text-on-surface-variant uppercase tracking-wider text-center">Rating</th>
                  <th className="px-lg py-4 font-label-md text-on-surface-variant uppercase tracking-wider">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-lg py-4"><Skeleton className="h-8 w-full bg-surface-container" /></td></tr>
                    ))
                  : courses.map(c => {
                      const maxCount = courses[0]?.student_count ?? 1;
                      const pct = maxCount > 0 ? Math.round((c.student_count / maxCount) * 100) : 0;
                      return (
                        <tr key={c.id} className="hover:bg-surface-variant/20 transition-colors">
                          <td className="px-lg py-4">
                            <span className="font-body-md font-semibold text-on-surface max-w-[250px] truncate block">{c.title}</span>
                          </td>
                          <td className="px-lg py-4">
                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-label-sm border border-primary/20">{c.category || 'Uncategorized'}</span>
                          </td>
                          <td className="px-lg py-4 text-center text-on-surface font-label-md">{c.student_count?.toLocaleString() ?? 0}</td>
                          <td className="px-lg py-4 text-center text-chart-4 font-label-md flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">star</span>
                            {c.rating?.toFixed(1) ?? '—'}
                          </td>
                          <td className="px-lg py-4 min-w-[150px]">
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all shadow-[0_0_8px_rgba(192,193,255,0.4)]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-label-sm text-on-surface-variant w-8">{pct}%</span>
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

const monthlyData = [
  { month: 'Jan', students: 820, courses: 3, certs: 28 },
  { month: 'Feb', students: 950, courses: 3, certs: 35 },
  { month: 'Mar', students: 1050, courses: 4, certs: 44 },
  { month: 'Apr', students: 1180, courses: 4, certs: 58 },
  { month: 'May', students: 1248, courses: 5, certs: 72 },
];

const maxStudents = Math.max(...monthlyData.map(d => d.students));

