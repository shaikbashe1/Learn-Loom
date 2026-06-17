import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkspacePremium, ShieldLock, Analytics, Search, RefreshCw, VerifiedUser, Block } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface CertRow {
  id: string;
  verification_code: string;
  score: number;
  issued_at: string;
  is_valid: boolean;
  profiles?: { full_name: string | null; email: string | null };
  courses?: { title: string };
}

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCerts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('certificates')
      .select('*, profiles!certificates_user_id_fkey(full_name, email), courses!certificates_course_id_fkey(title)')
      .order('issued_at', { ascending: false })
      .limit(100);
    if (error) { toast.error('Failed to load certificates'); }
    setCerts(data ?? []);
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
    const { error } = await supabase.from('certificates').update({ is_valid: false }).eq('id', id);
    if (error) { toast.error('Failed to revoke'); return; }
    toast.success('Certificate revoked');
    setCerts(prev => prev.map(c => c.id === id ? { ...c, is_valid: false } : c));
  };

  const verificationRate = certs.length > 0 ? Math.round((certs.filter(c => c.is_valid).length / certs.length) * 100) : 0;
  const avgScore = certs.length > 0 ? Math.round(certs.reduce((a, c) => a + c.score, 0) / certs.length) : 0;

  return (
    <AppLayout title="Certificate Management" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Certificate Management</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Track, verify, and manage student achievements and credentials across all courses.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={fetchCerts} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-success"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Valid</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{certs.filter(c => c.is_valid).length}</span>
               </div>
             </div>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Total Issued</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-inner">
                <WorkspacePremium className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">{loading ? <Skeleton className="h-10 w-20 bg-surface-container" /> : certs.length}</div>
              <p className="text-[12px] text-text-secondary font-bold mt-2 flex items-center gap-1 uppercase tracking-wider text-primary">All Time</p>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Verification Rate</span>
              <div className="p-2.5 bg-success/10 rounded-xl text-success border border-success/20 shadow-inner">
                <ShieldLock className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">{loading ? <Skeleton className="h-10 w-20 bg-surface-container" /> : `${verificationRate}%`}</div>
              <p className="text-[12px] text-text-secondary font-bold mt-2 flex items-center gap-1 uppercase tracking-wider text-success">Valid Certificates</p>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Avg. Score</span>
              <div className="p-2.5 bg-tertiary/10 rounded-xl text-tertiary border border-tertiary/20 shadow-inner">
                <Analytics className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">{loading ? <Skeleton className="h-10 w-20 bg-surface-container" /> : `${avgScore}%`}</div>
              <p className="text-[12px] text-text-secondary font-bold mt-2 flex items-center gap-1 uppercase tracking-wider text-tertiary">Overall Performance</p>
            </div>
          </div>
        </section>

        {/* Certificates Table Area */}
        <section className="glass-panel rounded-2xl border border-border-base shadow-sm overflow-hidden flex flex-col">
          
          {/* Table Filter Bar */}
          <div className="p-6 md:p-8 border-b border-border-base flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface/30">
            <div className="relative w-full lg:w-96 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors text-[20px]">search</span>
              <input 
                className="w-full bg-surface-container border border-border-base rounded-full py-2.5 pl-12 pr-4 text-body-sm text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner" 
                placeholder="Search by student, course, or ID..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container/50 border-b border-border-base">
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider w-[25%]">Recipient</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-center">Score</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Issue Date</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Certificate ID</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-6 py-4"><Skeleton className="h-12 w-full bg-surface-container rounded-lg" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                       <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                         <WorkspacePremium className="w-6 h-6 text-text-secondary" />
                       </div>
                       <p className="font-headline-md text-[18px] font-bold text-text-primary">No certificates found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((cert, idx) => {
                    const name = cert.profiles?.full_name ?? 'Unknown Student';
                    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const gradients = [
                      'from-primary to-secondary',
                      'from-tertiary-container to-primary',
                      'from-secondary to-primary-container',
                    ];
                    const gradient = gradients[idx % gradients.length];
                    
                    return (
                      <tr key={cert.id} className="hover:bg-surface-container/30 transition-colors group">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <Avatar className={`w-10 h-10 shrink-0 shadow-sm border border-border-base bg-gradient-to-br ${gradient}`}>
                            <AvatarFallback className="bg-transparent text-white text-[13px] font-bold">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-body-md text-[15px] font-bold text-text-primary truncate">{name}</p>
                            <p className="font-label-sm text-[12px] text-text-secondary truncate">{cert.profiles?.email ?? '—'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-body-md text-[14px] font-medium text-text-primary max-w-[200px] truncate block" title={cert.courses?.title ?? '—'}>
                            {cert.courses?.title ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-label-md text-[15px] font-bold text-primary">{cert.score}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-medium text-text-secondary">{new Date(cert.issued_at).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-[13px] font-medium text-text-primary bg-surface/50 px-2.5 py-1 rounded-md border border-border-base">{cert.verification_code}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {cert.is_valid ? (
                            <span className="inline-flex items-center gap-1.5 text-success text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-success/10 border border-success/20">
                              <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-error text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-error/10 border border-error/20">
                              <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                              Revoked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => toast.info(`Verification code: ${cert.verification_code}`)} 
                              className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-primary hover:bg-surface shadow-sm border border-transparent hover:border-border-base transition-all"
                              title="Verify"
                            >
                              <VerifiedUser className="w-5 h-5" />
                            </button>
                            {cert.is_valid && (
                              <button 
                                onClick={() => handleRevoke(cert.id)} 
                                className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-error hover:bg-surface shadow-sm border border-transparent hover:border-border-base transition-all"
                                title="Revoke Certificate"
                              >
                                <Block className="w-5 h-5" />
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
