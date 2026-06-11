import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, CheckCircle, Download, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';

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

  return (
    <AppLayout title="Certificate Management" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-2xl">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Certificates Management</h1>
            <p className="text-on-surface-variant text-body-md mt-1">Track and manage student achievements across all LearnLoom curriculums.</p>
          </div>
          <div className="flex items-center gap-sm">
            <Button variant="ghost" size="sm" onClick={fetchCerts} className="border border-outline-variant text-on-surface hover:bg-surface-variant h-11 w-11 rounded-xl">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="bg-surface-container-high px-4 py-2 rounded-xl border border-outline-variant flex items-center gap-2 h-11">
              <span className="text-primary font-bold">{certs.filter(c => c.is_valid).length}</span>
              <span className="text-label-sm text-outline">Valid Certificates</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-md mb-2xl">
          <div className="glass-panel p-lg rounded-xl flex flex-col justify-center">
            <p className="text-label-sm text-outline">Total Issued</p>
            <p className="text-display font-bold mt-2 text-on-surface">{loading ? '—' : certs.length}</p>
            <div className="flex items-center text-primary text-[10px] mt-2 font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[14px] mr-1">workspace_premium</span>
              All Time
            </div>
          </div>
          <div className="glass-panel p-lg rounded-xl flex flex-col justify-center">
            <p className="text-label-sm text-outline">Verification Rate</p>
            <p className="text-display font-bold mt-2 text-on-surface">
              {loading || certs.length === 0 ? '—' : `${Math.round((certs.filter(c => c.is_valid).length / certs.length) * 100)}%`}
            </p>
            <div className="flex items-center text-success text-[10px] mt-2 font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[14px] mr-1">shield_lock</span>
              Valid Certificates
            </div>
          </div>
          <div className="glass-panel p-lg rounded-xl flex flex-col justify-center">
            <p className="text-label-sm text-outline">Avg. Score</p>
            <p className="text-display font-bold mt-2 text-on-surface">
              {loading || certs.length === 0 ? '—' : `${Math.round(certs.reduce((a, c) => a + c.score, 0) / certs.length)}%`}
            </p>
            <div className="flex items-center text-tertiary text-[10px] mt-2 font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[14px] mr-1">analytics</span>
              Overall Performance
            </div>
          </div>
        </section>

        {/* Search & Actions */}
        <div className="glass-panel p-md rounded-xl flex flex-wrap items-center gap-md mb-xl">
          <div className="flex-1 min-w-[250px] relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input 
              placeholder="Search by student, course, or verification code…" 
              className="w-full bg-surface-container border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-label-md text-on-surface focus:ring-1 focus:ring-primary outline-none transition-all" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        {/* Certificates Table */}
        <section className="glass-panel rounded-2xl overflow-hidden mt-xl">
          <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50">
            <h3 className="font-headline-md text-headline-md">Manage Issued Certificates</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-container-high/50 text-label-sm text-outline uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Recipient</th>
                  <th className="px-6 py-4 font-bold">Course</th>
                  <th className="px-6 py-4 font-bold text-center">Score</th>
                  <th className="px-6 py-4 font-bold">Issue Date</th>
                  <th className="px-6 py-4 font-bold">Certificate ID</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-6 py-4"><Skeleton className="h-10 w-full bg-surface-container" /></td></tr>
                    ))
                  : filtered.length === 0
                    ? <tr><td colSpan={7} className="px-6 py-16 text-center text-label-md text-on-surface-variant">No certificates found</td></tr>
                    : filtered.map(cert => {
                        const name = cert.profiles?.full_name ?? 'Unknown';
                        const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <tr key={cert.id} className="hover:bg-surface-variant/10 transition-colors group">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[12px] font-bold text-primary shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-label-md text-on-surface truncate">{name}</p>
                                <p className="text-[11px] text-outline truncate">{cert.profiles?.email ?? '—'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-label-md text-on-surface-variant max-w-[200px] truncate" title={cert.courses?.title ?? '—'}>
                              {cert.courses?.title ?? '—'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-label-md text-primary font-bold">{cert.score}%</span>
                            </td>
                            <td className="px-6 py-4 text-label-md text-outline">
                              {new Date(cert.issued_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-on-surface">
                              {cert.verification_code}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {cert.is_valid ? (
                                <span className="inline-flex items-center gap-1.5 text-success text-[12px] font-bold px-2 py-1 rounded-full bg-success/10 border border-success/20">
                                  <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-error text-[12px] font-bold px-2 py-1 rounded-full bg-error/10 border border-error/20">
                                  <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                                  Revoked
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => toast.info(`Verification code: ${cert.verification_code}`)} 
                                  className="p-2 border border-outline-variant/60 rounded-lg text-on-surface hover:bg-surface-variant transition-colors"
                                  title="Verify"
                                >
                                  <span className="material-symbols-outlined text-[18px]">verified</span>
                                </button>
                                {cert.is_valid && (
                                  <button 
                                    onClick={() => handleRevoke(cert.id)} 
                                    className="p-2 border border-error/30 rounded-lg text-error hover:bg-error/10 transition-colors"
                                    title="Revoke Certificate"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">block</span>
                                  </button>
                                )}
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
