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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-foreground text-balance">Platform Reports</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchData} className="border border-border text-foreground hover:bg-accent h-9">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" onClick={handleExport} disabled={loading || !stats} className="border border-border text-foreground hover:bg-accent">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', value: stats?.total_students?.toLocaleString() ?? '—', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Completion Rate', value: `${completionRate}%`, icon: BookOpen, color: 'text-chart-2', bg: 'bg-chart-2/10' },
            { label: 'Certificates Issued', value: stats?.certificates_issued?.toLocaleString() ?? '—', icon: Award, color: 'text-chart-3', bg: 'bg-chart-3/10' },
            { label: 'Avg Quiz Attempts', value: avgQuizAttempts, icon: Zap, color: 'text-chart-4', bg: 'bg-chart-4/10' },
          ].map(stat => (
            <Card key={stat.label} className="bg-card border-border h-full">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-foreground">{loading ? <Skeleton className="h-7 w-16 bg-muted" /> : stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Enrollments', value: stats?.total_enrollments ?? 0, icon: BarChart3, color: 'text-primary', desc: 'All-time course enrollments' },
            { label: 'Assignment Submissions', value: stats?.total_submissions ?? 0, icon: Activity, color: 'text-chart-2', desc: 'Student submissions received' },
            { label: 'Community Posts', value: stats?.forum_posts_count ?? 0, icon: TrendingUp, color: 'text-chart-4', desc: 'Forum discussions started' },
          ].map(m => (
            <Card key={m.label} className="bg-card border-border h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{loading ? '—' : m.value.toLocaleString()}</div>
                  <div className="text-sm font-medium text-foreground mt-0.5">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Course engagement table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Course Engagement</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Course', 'Category', 'Students', 'Rating', 'Engagement'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-8 w-full bg-muted" /></td></tr>
                      ))
                    : courses.map(c => {
                        const maxCount = courses[0]?.student_count ?? 1;
                        const pct = maxCount > 0 ? Math.round((c.student_count / maxCount) * 100) : 0;
                        return (
                          <tr key={c.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-foreground max-w-[200px] truncate block">{c.title}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">{c.category}</Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{c.student_count?.toLocaleString() ?? 0}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-chart-4">★ {c.rating?.toFixed(1) ?? '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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

