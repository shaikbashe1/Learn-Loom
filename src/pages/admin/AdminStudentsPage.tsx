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
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        {/* Page Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Student Directory</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Manage your learner ecosystem. Monitor engagement levels, track curriculum progress, and manage administrative permissions across your technical community.</p>
          </div>
          <div className="flex gap-md items-center">
            <Button variant="ghost" size="sm" onClick={fetchStudents} className="border border-outline-variant text-on-surface hover:bg-surface-variant h-11 w-11 rounded-xl">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <button className="px-lg py-md rounded-xl bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-2 font-label-md">
              <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
            </button>
            <button className="px-lg py-md rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_0_8px_rgba(192,193,255,0.3)]">
              <span className="material-symbols-outlined text-[18px]">person_add</span> Invite Student
            </button>
          </div>
        </div>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-2xl">
          <div className="glass-panel p-lg rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">group</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Active</p>
              <h3 className="font-headline-md text-headline-md text-on-surface">{loading ? '—' : students.length}</h3>
            </div>
          </div>
          <div className="glass-panel p-lg rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Avg Credits</p>
              <h3 className="font-headline-md text-headline-md text-on-surface">{loading ? '—' : avgCredits}</h3>
            </div>
          </div>
          <div className="glass-panel p-lg rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">local_fire_department</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Active (7d)</p>
              <h3 className="font-headline-md text-headline-md text-on-surface">{loading ? '—' : recentlyActive}</h3>
            </div>
          </div>
          <div className="glass-panel p-lg rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
              <span className="material-symbols-outlined">library_books</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Enrollments</p>
              <h3 className="font-headline-md text-headline-md text-on-surface">{loading ? '—' : totalEnrollments}</h3>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
          {/* Table Filter Bar */}
          <div className="p-lg border-b border-outline-variant/60 flex flex-col lg:flex-row gap-lg justify-between items-center bg-surface-container-low/40">
            <div className="relative w-full lg:w-[400px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input 
                className="w-full bg-surface-container-high/50 border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-all" 
                placeholder="Filter by name, email..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-md w-full lg:w-auto overflow-x-auto no-scrollbar">
              <select className="bg-surface-container-high/50 border border-outline-variant/40 rounded-lg px-4 py-2.5 text-label-md text-on-surface focus:outline-none focus:border-primary flex-1 lg:flex-none">
                <option>Status: All</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
              <button className="bg-surface-container-high/50 border border-outline-variant/40 text-on-surface-variant px-md py-2.5 rounded-lg flex items-center justify-center hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container-high/30 border-b border-outline-variant/40">
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Student</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Credits</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Streak</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Enrollments</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Last Active</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-lg py-4"><Skeleton className="h-10 w-full bg-surface border border-outline-variant/40" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-lg py-16 text-center text-sm text-on-surface-variant">No students found</td>
                  </tr>
                ) : (
                  filtered.map(s => {
                    const name = s.full_name ?? 'Unknown';
                    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <tr key={s.id} className="hover:bg-surface-variant/20 transition-colors group">
                        <td className="px-lg py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 shrink-0 border border-outline-variant/40">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex flex-col justify-center">
                              <div className="flex items-center gap-2">
                                <p className="font-body-md text-body-md font-bold text-on-surface truncate">{name}</p>
                                {s.is_suspended && <span className="bg-error/10 text-error border border-error/30 text-[10px] px-2 py-0.5 rounded-full font-bold">Suspended</span>}
                              </div>
                              <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{s.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-4">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-chart-4">bolt</span>
                            <span className="text-body-md font-medium text-on-surface">{s.credits.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-lg py-4">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-chart-5 text-[#ffb783]">local_fire_department</span>
                            <span className="text-body-md font-medium text-on-surface">{s.streak_days} days</span>
                          </div>
                        </td>
                        <td className="px-lg py-4">
                          <span className="text-body-md font-medium text-on-surface">{s.enrollments_count}</span>
                        </td>
                        <td className="px-lg py-4">
                          <p className="text-label-md text-on-surface-variant">
                            {s.last_activity_date ? formatDistanceToNow(new Date(s.last_activity_date), { addSuffix: true }) : 'Never'}
                          </p>
                        </td>
                        <td className="px-lg py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setSelectedStudent(s); setDetailOpen(true); }} className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all" title="View Details">
                              <span className="material-symbols-outlined text-[20px]">info</span>
                            </button>
                            <button onClick={() => toggleSuspend(s)} className={`p-2 rounded-lg transition-all ${s.is_suspended ? 'text-success hover:bg-success/10' : 'text-on-surface-variant hover:text-error hover:bg-error/10'}`} title={s.is_suspended ? 'Unsuspend' : 'Suspend'}>
                              <span className="material-symbols-outlined text-[20px]">{s.is_suspended ? 'how_to_reg' : 'person_off'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="bg-surface-container border-outline-variant text-on-surface">
            <DialogHeader>
              <DialogTitle className="font-display text-headline-md text-on-surface">Student Details</DialogTitle>
              <DialogDescription className="text-on-surface-variant">
                {selectedStudent?.full_name} ({selectedStudent?.email})
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-4 rounded-xl space-y-1">
                    <p className="text-sm text-on-surface-variant">Joined</p>
                    <p className="text-lg font-medium text-on-surface">{new Date(selectedStudent.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="glass-panel p-4 rounded-xl space-y-1">
                    <p className="text-sm text-on-surface-variant">Status</p>
                    {selectedStudent.is_suspended ? (
                       <Badge variant="destructive" className="bg-error/20 text-error border border-error/30">Suspended</Badge>
                    ) : (
                       <Badge className="bg-primary/20 text-primary border border-primary/30">Active</Badge>
                    )}
                  </div>
                  <div className="glass-panel p-4 rounded-xl space-y-1">
                    <p className="text-sm text-on-surface-variant">Credits</p>
                    <p className="text-lg font-medium text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-chart-4 text-[20px]">bolt</span>
                      {selectedStudent.credits}
                    </p>
                  </div>
                  <div className="glass-panel p-4 rounded-xl space-y-1">
                    <p className="text-sm text-on-surface-variant">Total Enrollments</p>
                    <p className="text-lg font-medium text-on-surface">{selectedStudent.enrollments_count}</p>
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

