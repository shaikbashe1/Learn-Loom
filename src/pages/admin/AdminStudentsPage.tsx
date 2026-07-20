import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  RefreshCw, 
  Zap, 
  Flame, 
  GraduationCap, 
  Search, 
  Filter,
  Download,
  UserPlus,
  Users,
  Eye,
  UserCheck,
  UserX,
  Calendar
} from 'lucide-react';
import { db } from '@/db/firebase';
import { collection, doc, getDocs, updateDoc, query, orderBy, limit, where } from 'firebase/firestore';
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
    try {
      const q = query(
        collection(db, 'profiles'),
        orderBy('credits', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const profilesData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Student[];

      const ids = profilesData.map(s => s.id);
      let enrollData: { user_id: string }[] = [];
      
      const chunkSize = 10;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        if (chunk.length > 0) {
          const enrollQuery = query(
            collection(db, 'user_course_enrollments'),
            where('user_id', 'in', chunk)
          );
          const enrollSnap = await getDocs(enrollQuery);
          enrollSnap.forEach(d => {
            enrollData.push({ user_id: d.data().user_id });
          });
        }
      }

      const countMap: Record<string, number> = {};
      enrollData.forEach(e => { countMap[e.user_id] = (countMap[e.user_id] ?? 0) + 1; });

      setStudents(profilesData.map(s => ({ ...s, enrollments_count: countMap[s.id] ?? 0 })));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load students');
    }
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, []);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const toggleSuspend = async (student: Student) => {
    const newStatus = !student.is_suspended;
    try {
      await updateDoc(doc(db, 'profiles', student.id), { is_suspended: newStatus });
      toast.success(`Student ${newStatus ? 'suspended' : 'unsuspended'} successfully`);
      fetchStudents();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update suspension status');
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
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Student Directory</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Manage your learner ecosystem. Monitor engagement levels, track curriculum progress, and manage community access.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={fetchStudents} 
               className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all shadow-sm"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             
             <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground text-xs font-bold transition-all shadow-sm min-h-[40px]">
                <Download className="h-4 w-4" /> Export
             </button>
             
             <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99] text-xs font-bold shadow-md shadow-primary/10 transition-all min-h-[40px]">
                <UserPlus className="h-4 w-4" /> Invite Student
             </button>
          </div>
        </section>

        {/* Bento Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stat 1 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Total Active</p>
                <h3 className="font-display text-2xl font-extrabold text-foreground mt-1.5">{loading ? '—' : students.length}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Avg Credits</p>
                <h3 className="font-display text-2xl font-extrabold text-foreground mt-1.5">{loading ? '—' : avgCredits}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Active (7d)</p>
                <h3 className="font-display text-2xl font-extrabold text-foreground mt-1.5">{loading ? '—' : recentlyActive}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Enrollments</p>
                <h3 className="font-display text-2xl font-extrabold text-foreground mt-1.5">{loading ? '—' : totalEnrollments}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </div>
        </section>

        {/* Directory Table Area */}
        <section className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
          
          {/* Table Filter Bar */}
          <div className="p-6 border-b border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-muted/20">
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4.5 h-4.5" />
              <input 
                className="w-full bg-background border border-border rounded-xl py-2 pl-11 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent transition-all shadow-inner font-medium placeholder:text-muted-foreground/60" 
                placeholder="Search students by name or email..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <select className="bg-background border border-border rounded-xl px-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary shadow-sm flex-grow lg:flex-grow-0 h-10">
                <option>Status: All</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
              <button className="bg-background border border-border text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all shadow-sm shrink-0 h-10">
                <Filter className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Student Profile</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Streak</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Enrollments</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4">
                        <Skeleton className="h-12 w-full bg-muted rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                       <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                         <Search className="w-6 h-6 text-muted-foreground/40" />
                       </div>
                       <p className="text-sm font-bold text-foreground">No students found</p>
                       <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, idx) => {
                    const name = s.full_name ?? 'Unknown Student';
                    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    
                    const avatarGradients = [
                      'from-blue-500/10 to-primary/20 text-primary border-primary/20',
                      'from-emerald-500/10 to-teal-500/20 text-emerald-500 border-emerald-500/20',
                      'from-purple-500/10 to-chart-4/20 text-chart-4 border-chart-4/20',
                    ];
                    const gradientClass = avatarGradients[idx % avatarGradients.length];
                    
                    return (
                      <tr key={s.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <Avatar className={`w-9 h-9 shrink-0 shadow-sm border bg-gradient-to-br ${gradientClass}`}>
                              <AvatarFallback className="bg-transparent text-xs font-bold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{name}</p>
                                {s.is_suspended && (
                                  <span className="bg-destructive/10 text-destructive border border-destructive/20 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-semibold truncate">{s.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span>{s.credits.toLocaleString()}</span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <Flame className="h-4 w-4 text-destructive" />
                            <span>{s.streak_days} <span className="text-[10px] font-semibold text-muted-foreground ml-0.5">days</span></span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-xl border border-border">
                            {s.enrollments_count}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <p className="text-xs text-muted-foreground font-semibold">
                            {s.last_activity_date ? formatDistanceToNow(new Date(s.last_activity_date), { addSuffix: true }) : 'Never active'}
                          </p>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setSelectedStudent(s); setDetailOpen(true); }} 
                              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-muted border border-transparent hover:border-border transition-all" 
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => toggleSuspend(s)} 
                              className={`w-9 h-9 flex items-center justify-center rounded-xl border border-transparent hover:border-border transition-all hover:bg-muted ${
                                s.is_suspended ? 'text-emerald-500 hover:text-emerald-500' : 'text-muted-foreground hover:text-destructive'
                              }`} 
                              title={s.is_suspended ? 'Unsuspend' : 'Suspend'}
                            >
                              {s.is_suspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
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
          <DialogContent className="bg-card border-border text-foreground rounded-3xl shadow-2xl overflow-hidden p-0 max-w-sm">
            <div className="h-24 bg-gradient-to-r from-primary to-chart-4 relative">
               <div className="absolute -bottom-10 left-6">
                  <Avatar className="w-20 h-20 border-4 border-card shadow-md bg-muted text-primary">
                    <AvatarFallback className="text-xl font-extrabold">
                      {selectedStudent?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
               </div>
            </div>
            
            <DialogHeader className="pt-14 px-6 pb-2 border-b border-border">
              <DialogTitle className="text-base font-extrabold text-foreground">
                {selectedStudent?.full_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-semibold mt-1">
                {selectedStudent?.email}
              </DialogDescription>
            </DialogHeader>
            
            {selectedStudent && (
              <div className="p-6 space-y-4 bg-muted/10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Joined</p>
                    <p className="text-xs font-bold text-foreground">{new Date(selectedStudent.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    {selectedStudent.is_suspended ? (
                       <span className="inline-block bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase">
                         Suspended
                       </span>
                    ) : (
                       <span className="inline-block bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase">
                         Active
                       </span>
                    )}
                  </div>
                  
                  <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Credits Earned</p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span>{selectedStudent.credits}</span>
                    </p>
                  </div>
                  
                  <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Total Enrollments</p>
                    <p className="text-sm font-bold text-foreground">{selectedStudent.enrollments_count}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-4 border-t border-border bg-card flex justify-end">
              <Button 
                onClick={() => setDetailOpen(false)} 
                variant="outline" 
                className="rounded-xl border-border font-bold text-xs"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
