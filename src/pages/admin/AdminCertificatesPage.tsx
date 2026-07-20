import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Award, 
  ShieldCheck, 
  BarChart2, 
  Search, 
  RefreshCw, 
  UserCheck, 
  Ban,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { db } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';

interface CertRow {
  id: string;
  verification_code: string;
  score: number;
  issued_at: string;
  is_valid: boolean;
  user_id?: string;
  course_id?: string;
  profiles?: { full_name: string | null; email: string | null };
  courses?: { title: string };
}

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCerts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'certificates'), orderBy('issued_at', 'desc'), limit(100));
      const snap = await getDocs(q);
      const certData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const profileCache = new Map();
      const courseCache = new Map();

      const enriched = await Promise.all(
        certData.map(async (c) => {
          let profiles = null;
          let courses = null;
          
          if (c.user_id) {
            if (!profileCache.has(c.user_id)) {
              const pSnap = await getDoc(doc(db, 'profiles', c.user_id));
              if (pSnap.exists()) {
                profileCache.set(c.user_id, {
                  full_name: pSnap.data().full_name,
                  email: pSnap.data().email
                });
              } else {
                profileCache.set(c.user_id, null);
              }
            }
            profiles = profileCache.get(c.user_id);
          }
          
          if (c.course_id) {
             if (!courseCache.has(c.course_id)) {
               const cSnap = await getDoc(doc(db, 'courses', c.course_id));
               if (cSnap.exists()) {
                 courseCache.set(c.course_id, {
                   title: cSnap.data().title
                 });
               } else {
                 courseCache.set(c.course_id, null);
               }
             }
             courses = courseCache.get(c.course_id);
          }

          let issued_at = c.issued_at;
          if (issued_at && typeof issued_at === 'object' && 'toDate' in issued_at) {
            issued_at = issued_at.toDate().toISOString();
          }

          return {
            ...c,
            issued_at,
            profiles,
            courses
          };
        })
      );
      setCerts(enriched);
    } catch (error) {
      toast.error('Failed to load certificates');
    }
    setLoading(false);
  };

  useEffect(() => { fetchCerts(); }, []);

  const filtered = certs.filter(c => {
    const name = c.profiles?.full_name ?? '';
    const email = c.profiles?.email ?? '';
    const course = c.courses?.title ?? '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || course.toLowerCase().includes(q) || c.verification_code.toLowerCase().includes(q);
  });

  const handleRevoke = async (id: string) => {
    try {
      await updateDoc(doc(db, 'certificates', id), { is_valid: false });
      toast.success('Certificate revoked');
      setCerts(prev => prev.map(c => c.id === id ? { ...c, is_valid: false } : c));
    } catch (error) {
      toast.error('Failed to revoke');
    }
  };

  const verificationRate = certs.length > 0 ? Math.round((certs.filter(c => c.is_valid).length / certs.length) * 100) : 0;
  const avgScore = certs.length > 0 ? Math.round(certs.reduce((a, c) => a + c.score, 0) / certs.length) : 0;

  return (
    <AppLayout title="Certificate Management" isAdmin>
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Certificate Management</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Track, verify, and manage student achievements and credentials across all courses.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={fetchCerts} 
               className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all shadow-sm"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             
             <div className="flex items-center justify-center px-4 py-2 bg-card border border-border rounded-xl shadow-sm h-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valid</span>
                  <span className="text-xs font-bold text-foreground ml-1">
                    {certs.filter(c => c.is_valid).length}
                  </span>
                </div>
             </div>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stat 1 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Total Issued</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Skeleton className="h-9 w-20 bg-muted" /> : certs.length}
              </div>
              <p className="text-[10px] text-primary font-bold mt-2 uppercase tracking-wider">All Time</p>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Verification Rate</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Skeleton className="h-9 w-20 bg-muted" /> : `${verificationRate}%`}
              </div>
              <p className="text-[10px] text-emerald-500 font-bold mt-2 uppercase tracking-wider">Valid Certificates</p>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Avg. Score</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Skeleton className="h-9 w-20 bg-muted" /> : `${avgScore}%`}
              </div>
              <p className="text-[10px] text-chart-4 font-bold mt-2 uppercase tracking-wider">Overall Performance</p>
            </div>
          </div>
        </section>

        {/* Certificates Table Area */}
        <section className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
          
          {/* Table Filter Bar */}
          <div className="p-6 border-b border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-muted/20">
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4.5 h-4.5" />
              <input 
                className="w-full bg-background border border-border rounded-xl py-2 pl-11 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner font-medium placeholder:text-muted-foreground/60" 
                placeholder="Search by student, course, or ID..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider w-[25%]">Recipient</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-center">Score</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Issue Date</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Certificate ID</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-4">
                        <Skeleton className="h-12 w-full bg-muted rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                       <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                         <Award className="w-6 h-6 text-muted-foreground/40" />
                       </div>
                       <p className="text-sm font-bold text-foreground">No certificates found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((cert, idx) => {
                    const name = cert.profiles?.full_name ?? 'Unknown Student';
                    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    
                    const avatarGradients = [
                      'from-blue-500/10 to-primary/20 text-primary border-primary/20',
                      'from-emerald-500/10 to-teal-500/20 text-emerald-500 border-emerald-500/20',
                      'from-purple-500/10 to-chart-4/20 text-chart-4 border-chart-4/20',
                    ];
                    const gradientClass = avatarGradients[idx % avatarGradients.length];
                    
                    return (
                      <tr key={cert.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <Avatar className={`w-9 h-9 shrink-0 shadow-sm border bg-gradient-to-br ${gradientClass}`}>
                            <AvatarFallback className="bg-transparent text-xs font-bold">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{name}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold truncate">{cert.profiles?.email ?? '—'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-foreground max-w-[200px] truncate block" title={cert.courses?.title ?? '—'}>
                            {cert.courses?.title ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold text-primary">{cert.score}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground font-semibold">{new Date(cert.issued_at).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-[11px] font-bold text-foreground bg-muted px-2.5 py-1 rounded-xl border border-border">
                            {cert.verification_code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {cert.is_valid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-destructive text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-destructive/10 border border-destructive/20">
                              <XCircle className="h-3 w-3" /> Revoked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => toast.info(`Verification code: ${cert.verification_code}`)} 
                              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-muted border border-transparent hover:border-border transition-all"
                              title="Verify"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            {cert.is_valid && (
                              <button 
                                onClick={() => handleRevoke(cert.id)} 
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-muted border border-transparent hover:border-border transition-all"
                                title="Revoke Certificate"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
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
      </div>
    </AppLayout>
  );
}
