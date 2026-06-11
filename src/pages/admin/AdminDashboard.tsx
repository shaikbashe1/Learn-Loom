import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen, Users, FileText, Award, TrendingUp, ChevronRight,
  GraduationCap, Zap, MessageSquare, BarChart3,
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import type { AdminStats } from '@/types/types';

interface RecentActivity { text: string; time: string; icon: string; }
interface CourseRow {
  id: string; title: string; category: string;
  student_count: number; is_published: boolean; thumbnail_url: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [courses, setCourses]   = useState<CourseRow[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const [statsRes, coursesRes, enrollRes, postRes] = await Promise.all([
        supabase.rpc('get_admin_stats').single(),
        supabase.from('courses')
          .select('id,title,category,student_count,is_published,thumbnail_url')
          .order('student_count', { ascending: false }).limit(8),
        supabase.from('user_course_enrollments')
          .select('created_at, courses!user_course_enrollments_course_id_fkey(title)')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('forum_posts')
          .select('created_at, title')
          .order('created_at', { ascending: false }).limit(3),
      ]);

      if (statsRes.data) setStats(statsRes.data as AdminStats);
      if (coursesRes.data) setCourses(coursesRes.data as CourseRow[]);

      const acts: RecentActivity[] = [];
      (enrollRes.data ?? []).forEach((e: { created_at: string; courses: unknown }) => {
        const c = e.courses;
        const courseTitle = Array.isArray(c)
          ? (c[0] as { title: string } | undefined)?.title ?? 'a course'
          : (c as { title: string } | null)?.title ?? 'a course';
        acts.push({ icon: '📚', text: `New enrollment in "${courseTitle}"`, time: new Date(e.created_at).toLocaleString() });
      });
      (postRes.data ?? []).forEach((p: { created_at: string; title: string }) => {
        acts.push({ icon: '💬', text: `New forum post: ${p.title}`, time: new Date(p.created_at).toLocaleString() });
      });
      acts.sort((a, b) => b.time.localeCompare(a.time));
      setActivity(acts.slice(0, 8));

      setLoading(false);
    })();
  }, []);

  const statCards = stats ? [
    { label: 'Published Courses', value: stats.published_courses, total: stats.total_courses, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10', link: '/admin/courses' },
    { label: 'Total Students',    value: stats.total_students,    total: null, icon: Users,         color: 'text-chart-4', bg: 'bg-chart-4/10', link: '/admin/students' },
    { label: 'Total Enrollments', value: stats.total_enrollments, total: null, icon: TrendingUp,    color: 'text-chart-3', bg: 'bg-chart-3/10', link: '/admin/students' },
    { label: 'Active Certificates', value: stats.active_certificates, total: null, icon: Award,    color: 'text-chart-5', bg: 'bg-chart-5/10', link: '/admin/certificates' },
    { label: 'Total Quizzes',     value: stats.total_quizzes,     total: null, icon: FileText,      color: 'text-chart-2', bg: 'bg-chart-2/10', link: '/admin/reports' },
    { label: 'Total Assignments', value: stats.total_assignments, total: null, icon: GraduationCap, color: 'text-primary', bg: 'bg-primary/10', link: '/admin/courses' },
    { label: 'Grand Test Passes', value: stats.grand_test_passes, total: null, icon: Zap,           color: 'text-chart-3', bg: 'bg-chart-3/10', link: '/admin/reports' },
    { label: 'Reports Center',    value: null,                    total: null, icon: BarChart3,      color: 'text-chart-4', bg: 'bg-chart-4/10', link: '/admin/reports' },
  ] : [];

  return (
    <AppLayout title="Admin Dashboard" isAdmin>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground text-balance">Admin Dashboard</h1>
          <Badge className="bg-primary/10 text-primary border-0">Admin</Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-8 w-8 rounded-lg bg-muted" />
                  <Skeleton className="h-7 w-16 bg-muted" />
                  <Skeleton className="h-4 w-24 bg-muted" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((s, i) => (
              <Link key={i} to={s.link}>
                <Card className="border-border hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.bg}`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {s.value !== null ? s.value.toLocaleString() : '→'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    {s.total !== null && (
                      <p className="text-[11px] text-muted-foreground">of {s.total} total</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Courses */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Top Courses</h2>
              <Link to="/admin/courses">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7">
                  Manage Courses <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <Card className="border-border">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Course Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Category</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Students</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-40 bg-muted" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20 bg-muted" /></td>
                          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-12 bg-muted ml-auto" /></td>
                          <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-14 rounded bg-muted mx-auto" /></td>
                        </tr>
                      ))
                    ) : courses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No courses yet</td>
                      </tr>
                    ) : (
                      courses.map(c => (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap max-w-[200px] truncate">{c.title}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.category}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{c.student_count.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <Badge className={c.is_published ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : 'bg-muted text-muted-foreground border-border'}>
                              {c.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
              <Link to="/admin/reports">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7">
                  View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="w-7 h-7 rounded bg-muted shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-full bg-muted" />
                        <Skeleton className="h-2.5 w-24 bg-muted" />
                      </div>
                    </div>
                  ))
                ) : activity.length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  activity.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground text-pretty">{a.text}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
