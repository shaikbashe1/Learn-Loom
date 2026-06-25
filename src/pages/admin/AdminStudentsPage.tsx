import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, Zap, Flame, BookOpen, Search, Filter } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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
    <AppLayout title="Student Directory" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Student Directory</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Manage your learner ecosystem. Monitor engagement levels, track curriculum progress, and manage community access.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={fetchStudents} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-base bg-surface text-text-primary hover:bg-surface-container font-label-md text-[14px] font-bold transition-all card-lift shadow-sm">
                <span className="material-symbols-outlined text-[18px]">download</span> Export
             </button>
             <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-label-md text-[14px] font-bold shadow-sm transition-all card-lift">
                <span className="material-symbols-outlined text-[18px]">person_add</span> Invite Student
             </button>
          </div>
        </section>

        {/* Bento Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="font-label-sm text-[11px] text-text-secondary font-bold uppercase tracking-widest">Total Active</p>
                <h3 className="font-headline-lg text-[32px] font-bold text-text-primary mt-1">{loading ? '—' : students.length}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">group</span>
              </div>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="font-label-sm text-[11px] text-text-secondary font-bold uppercase tracking-widest">Avg Credits</p>
                <h3 className="font-headline-lg text-[32px] font-bold text-text-primary mt-1">{loading ? '—' : avgCredits}</h3>
              </div>
              <div className="p-3 bg-warning/10 rounded-xl text-warning border border-warning/20 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">bolt</span>
              </div>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="font-label-sm text-[11px] text-text-secondary font-bold uppercase tracking-widest">Active (7d)</p>
                <h3 className="font-headline-lg text-[32px] font-bold text-text-primary mt-1">{loading ? '—' : recentlyActive}</h3>
              </div>
              <div className="p-3 bg-error/10 rounded-xl text-error border border-error/20 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">local_fire_department</span>
              </div>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="font-label-sm text-[11px] text-text-secondary font-bold uppercase tracking-widest">Enrollments</p>
                <h3 className="font-headline-lg text-[32px] font-bold text-text-primary mt-1">{loading ? '—' : totalEnrollments}</h3>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl text-secondary border border-secondary/20 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">school</span>
              </div>
            </div>
          </div>
        </section>

        {/* Directory Table Area */}
        <section className="glass-panel rounded-2xl border border-border-base shadow-sm overflow-hidden flex flex-col">
          
          {/* Table Filter Bar */}
          <div className="p-6 md:p-8 border-b border-border-base flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface/30">
            <div className="relative w-full lg:w-96 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors text-[20px]">search</span>
              <input 
                className="w-full bg-surface-container border border-border-base rounded-full py-2.5 pl-12 pr-4 text-body-sm text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner" 
                placeholder="Search students by name or email..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <select className="bg-surface border border-border-base rounded-xl px-4 py-2.5 text-label-md text-[13px] font-bold text-text-primary focus:outline-none focus:border-primary shadow-sm flex-1 lg:flex-none">
                <option>Status: All</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
              <button className="bg-surface border border-border-base text-text-secondary px-4 py-2.5 rounded-xl flex items-center justify-center hover:bg-surface-container hover:text-primary transition-colors shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container/50 border-b border-border-base">
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Student Profile</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Streak</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Enrollments</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4"><Skeleton className="h-12 w-full bg-surface-container rounded-lg" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                       <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                         <Search className="w-6 h-6 text-text-secondary" />
                       </div>
                       <p className="font-headline-md text-[18px] font-bold text-text-primary">No students found</p>
                       <p className="text-[14px] text-text-secondary mt-1">Try adjusting your search query.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, idx) => {
                    const name = s.full_name ?? 'Unknown Student';
                    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const gradients = [
                      'from-primary to-secondary',
                      'from-tertiary-container to-primary',
                      'from-secondary to-primary-container',
                    ];
                    const gradient = gradients[idx % gradients.length];
                    
                    return (
                      <tr key={s.id} className="hover:bg-surface-container/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <Avatar className={`w-10 h-10 shrink-0 shadow-sm border border-border-base bg-gradient-to-br ${gradient}`}>
                              <AvatarFallback className="bg-transparent text-white text-[13px] font-bold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex flex-col justify-center">
                              <div className="flex items-center gap-2">
                                <p className="font-body-md text-[15px] font-bold text-text-primary truncate group-hover:text-primary transition-colors">{name}</p>
                                {s.is_suspended && <span className="bg-error/10 text-error border border-error/20 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Suspended</span>}
                              </div>
                              <p className="font-label-sm text-[12px] text-text-secondary truncate">{s.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                            <span className="text-body-md text-[15px] font-bold text-text-primary">{s.credits.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-error" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                            <span className="text-body-md text-[15px] font-bold text-text-primary">{s.streak_days} <span className="text-[12px] font-medium text-text-secondary ml-0.5">days</span></span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body-md text-[15px] font-bold text-text-primary bg-surface/50 px-3 py-1 rounded-lg border border-border-base">{s.enrollments_count}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-label-md text-[13px] font-medium text-text-secondary">
                            {s.last_activity_date ? formatDistanceToNow(new Date(s.last_activity_date), { addSuffix: true }) : 'Never active'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setSelectedStudent(s); setDetailOpen(true); }} className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-primary hover:bg-surface shadow-sm border border-transparent hover:border-border-base transition-all" title="View Details">
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button onClick={() => toggleSuspend(s)} className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm border border-transparent hover:border-border-base transition-all hover:bg-surface ${s.is_suspended ? 'text-success hover:text-success' : 'text-text-secondary hover:text-error'}`} title={s.is_suspended ? 'Unsuspend' : 'Suspend'}>
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
        </section>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="bg-surface border-border-base text-text-primary rounded-2xl shadow-2xl overflow-hidden p-0 max-w-md">
            <div className="h-24 bg-gradient-to-r from-primary via-secondary to-tertiary relative">
               <div className="absolute -bottom-10 left-6">
                  <Avatar className="w-20 h-20 border-4 border-surface shadow-md bg-surface-container text-primary">
                    <AvatarFallback className="text-[24px] font-bold">{selectedStudent?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
               </div>
            </div>
            <DialogHeader className="pt-14 px-6 pb-2 border-b border-border-base">
              <DialogTitle className="font-headline-md text-[24px] font-bold text-text-primary">{selectedStudent?.full_name}</DialogTitle>
              <DialogDescription className="text-text-secondary text-[14px]">
                {selectedStudent?.email}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="p-6 space-y-4 bg-surface-container/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface border border-border-base p-4 rounded-xl shadow-sm">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Joined</p>
                    <p className="text-[15px] font-bold text-text-primary">{new Date(selectedStudent.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-surface border border-border-base p-4 rounded-xl shadow-sm">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Status</p>
                    {selectedStudent.is_suspended ? (
                       <span className="inline-block bg-error/10 text-error border border-error/20 px-2.5 py-0.5 rounded-md text-[12px] font-bold">Suspended</span>
                    ) : (
                       <span className="inline-block bg-success/10 text-success border border-success/20 px-2.5 py-0.5 rounded-md text-[12px] font-bold">Active Account</span>
                    )}
                  </div>
                  <div className="bg-surface border border-border-base p-4 rounded-xl shadow-sm">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Credits Earned</p>
                    <p className="text-[18px] font-bold text-text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-warning text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                      {selectedStudent.credits}
                    </p>
                  </div>
                  <div className="bg-surface border border-border-base p-4 rounded-xl shadow-sm">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Total Enrollments</p>
                    <p className="text-[18px] font-bold text-text-primary">{selectedStudent.enrollments_count}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="p-4 border-t border-border-base bg-surface flex justify-end gap-3">
              <Button onClick={() => setDetailOpen(false)} variant="outline" className="rounded-xl border-border-base font-bold text-[13px]">Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
