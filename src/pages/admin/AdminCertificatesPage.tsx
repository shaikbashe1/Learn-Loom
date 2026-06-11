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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-foreground text-balance">Certificate Management</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchCerts} className="border border-border text-foreground hover:bg-accent h-9">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30">{certs.filter(c => c.is_valid).length} Valid</Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Issued', value: certs.length, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Valid', value: certs.filter(c => c.is_valid).length, color: 'text-chart-3', bg: 'bg-chart-3/10' },
            { label: 'Avg. Score', value: certs.length > 0 ? Math.round(certs.reduce((a, c) => a + c.score, 0) / certs.length) + '%' : '—', color: 'text-chart-4', bg: 'bg-chart-4/10' },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border h-full">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{loading ? '—' : s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by student, course, or verification code…" className="pl-10 bg-input border-border text-foreground" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card className="bg-card border-border">
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Student', 'Course', 'Score', 'Issued', 'Code', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-10 w-full bg-muted" /></td></tr>
                      ))
                    : filtered.length === 0
                      ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No certificates found</td></tr>
                      : filtered.map(cert => {
                          const name = cert.profiles?.full_name ?? 'Unknown';
                          const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                          return (
                            <tr key={cert.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7 shrink-0">
                                    <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">{name}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">{cert.profiles?.email ?? '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground max-w-[140px] truncate">{cert.courses?.title ?? '—'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">{cert.score}%</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{new Date(cert.issued_at).toLocaleDateString()}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-foreground">{cert.verification_code}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge className={`text-[10px] ${cert.is_valid ? 'bg-chart-3/15 text-chart-3 border-chart-3/30' : 'bg-muted text-muted-foreground border-border'}`}>
                                  {cert.is_valid ? 'Valid' : 'Revoked'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => toast.info(`Verification code: ${cert.verification_code}`)} className="h-7 text-xs border border-border text-foreground hover:bg-accent px-2">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Verify
                                  </Button>
                                  {cert.is_valid && (
                                    <Button size="sm" variant="ghost" onClick={() => handleRevoke(cert.id)} className="h-7 text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 px-2">
                                      Revoke
                                    </Button>
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
