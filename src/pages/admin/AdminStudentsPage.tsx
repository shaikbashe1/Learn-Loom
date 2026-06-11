import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Zap, Flame, BookOpen, UserX, RefreshCw, MoreVertical, ShieldBan, Info } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  credits: number;
  streak_days: number;
  last_activity_date: string | null;
  created_at: string;
  enrollments_count: number;
  is_suspended: boolean;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, credits, streak_days, last_activity_date, created_at, is_suspended')
      .order('credits', { ascending: false })
      .limit(100);
    if (error) { toast.error('Failed to load students'); setLoading(false); return; }

    // Get enrollment counts
    const ids = (data ?? []).map(s => s.id);
    const { data: enrollData } = await supabase
      .from('user_course_enrollments')
      .select('user_id')
      .in('user_id', ids);

    const countMap: Record<string, number> = {};
    (enrollData ?? []).forEach(e => { countMap[e.user_id] = (countMap[e.user_id] ?? 0) + 1; });

    setStudents((data ?? []).map(s => ({ ...s, enrollments_count: countMap[s.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, []);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const toggleSuspend = async (student: Student) => {
    const newStatus = !student.is_suspended;
    const { error } = await supabase.from('profiles').update({ is_suspended: newStatus }).eq('id', student.id);
    if (error) {
      toast.error('Failed to update suspension status');
    } else {
      toast.success(`Student ${newStatus ? 'suspended' : 'unsuspended'} successfully`);
      fetchStudents();
    }
  };

  const filtered = students.filter(s =>
    (s.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const avgCredits = students.length > 0 ? Math.round(students.reduce((a, s) => a + s.credits, 0) / students.length) : 0;
  const totalEnrollments = students.reduce((a, s) => a + s.enrollments_count, 0);
  const recentlyActive = students.filter(s => s.last_activity_date && new Date(s.last_activity_date) > new Date(Date.now() - 7 * 86400000)).length;

  return (
    <AppLayout title="Student Management" isAdmin>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-foreground text-balance">Student Management</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchStudents} className="border border-border text-foreground hover:bg-accent h-9">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <span className="text-sm text-muted-foreground">{students.length} total students</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', value: students.length, color: 'text-chart-3', bg: 'bg-chart-3/10', icon: Users },
            { label: 'Avg. Credits', value: avgCredits, color: 'text-chart-4', bg: 'bg-chart-4/10', icon: Zap },
            { label: 'Active (7d)', value: recentlyActive, color: 'text-chart-5', bg: 'bg-chart-5/10', icon: Flame },
            { label: 'Total Enrollments', value: totalEnrollments, color: 'text-primary', bg: 'bg-primary/10', icon: BookOpen },
          ].map(stat => (
            <Card key={stat.label} className="bg-card border-border h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-foreground">{loading ? '—' : stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" className="pl-10 bg-input border-border text-foreground" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card className="bg-card border-border">
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Student', 'Credits', 'Streak', 'Enrollments', 'Last Active', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-10 w-full bg-muted" /></td></tr>
                      ))
                    : filtered.length === 0
                      ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No students found</td></tr>
                      : filtered.map(s => {
                          const name = s.full_name ?? 'Unknown';
                          const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                          return (
                            <tr key={s.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8 shrink-0">
                                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex items-center gap-2">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{name}</p>
                                      <p className="text-xs text-muted-foreground">{s.email ?? '—'}</p>
                                    </div>
                                    {s.is_suspended && <Badge variant="destructive" className="h-5 text-[10px]">Suspended</Badge>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-chart-4" />
                                  <span className="text-sm text-foreground">{s.credits}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-chart-5" />
                                  <span className="text-sm text-foreground">{s.streak_days}d</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{s.enrollments_count}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {s.last_activity_date ? formatDistanceToNow(new Date(s.last_activity_date), { addSuffix: true }) : 'Never'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedStudent(s); setDetailOpen(true); }}>
                                      <Info className="w-4 h-4 mr-2" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => toggleSuspend(s)} className={s.is_suspended ? 'text-green-600' : 'text-destructive'}>
                                      <ShieldBan className="w-4 h-4 mr-2" /> {s.is_suspended ? 'Unsuspend Student' : 'Suspend Student'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>
                {selectedStudent?.full_name} ({selectedStudent?.email})
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="text-sm font-medium">{new Date(selectedStudent.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedStudent.is_suspended ? 'destructive' : 'default'}>
                      {selectedStudent.is_suspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Credits</p>
                    <p className="text-sm font-medium">{selectedStudent.credits}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Enrollments</p>
                    <p className="text-sm font-medium">{selectedStudent.enrollments_count}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

