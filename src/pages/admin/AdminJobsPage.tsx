import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, MapPin, Building2, Clock, Plus, Edit2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  job_type: string;
  status: string;
  created_at: string;
  organization_id: string | null;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchJobs = async () => {
    setLoading(true);
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    
    // If org_admin, only fetch their org's jobs
    if (profile?.role === 'org_admin') {
      const { data: orgs } = await supabase.from('user_organizations').select('organization_id').eq('user_id', profile.id);
      if (orgs && orgs.length > 0) {
        query = query.in('organization_id', orgs.map(o => o.organization_id));
      } else {
        setJobs([]);
        setLoading(false);
        return;
      }
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load jobs');
    } else {
      setJobs(data as Job[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, [profile]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) {
      toast.error(`Failed to update job status`);
    } else {
      toast.success(`Job marked as ${status}`);
      fetchJobs();
    }
  };

  return (
    <AppLayout title="Job Board Management" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Jobs Portal</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Manage job postings, review applicants, and track hiring pipelines.</p>
          </div>
          <div className="flex gap-md items-center">
            <Button variant="ghost" size="sm" onClick={fetchJobs} className="border border-outline-variant text-on-surface hover:bg-surface-variant h-11 w-11 rounded-xl">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="px-lg py-md rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_0_8px_rgba(192,193,255,0.3)]">
              <Plus className="w-5 h-5" /> Post New Job
            </Button>
          </div>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container-high/30 border-b border-outline-variant/40">
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Job Title</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Company & Location</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Type</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Date Posted</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-lg py-4"><Skeleton className="h-10 w-full bg-surface border border-outline-variant/40" /></td>
                    </tr>
                  ))
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-lg py-16 text-center text-sm text-on-surface-variant">No jobs found.</td>
                  </tr>
                ) : (
                  jobs.map(job => (
                    <tr key={job.id} className="hover:bg-surface-variant/20 transition-colors group">
                      <td className="px-lg py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 shrink-0 border border-outline-variant/40 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <p className="font-body-md text-body-md font-bold text-on-surface truncate">{job.title}</p>
                        </div>
                      </td>
                      <td className="px-lg py-4">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1 text-body-sm text-on-surface"><Building2 className="w-3.5 h-3.5 text-on-surface-variant" /> {job.company_name}</p>
                          <p className="flex items-center gap-1 text-label-sm text-on-surface-variant"><MapPin className="w-3.5 h-3.5" /> {job.location || 'Remote'}</p>
                        </div>
                      </td>
                      <td className="px-lg py-4">
                        <span className="text-body-sm text-on-surface capitalize">{job.job_type.replace('-', ' ')}</span>
                      </td>
                      <td className="px-lg py-4">
                        {job.status === 'draft' && <Badge className="bg-surface-variant text-on-surface-variant border-outline-variant">Draft</Badge>}
                        {job.status === 'published' && <Badge className="bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">Published</Badge>}
                        {job.status === 'closed' && <Badge className="bg-error/20 text-error border border-error/30">Closed</Badge>}
                      </td>
                      <td className="px-lg py-4">
                        <p className="flex items-center gap-1 text-label-md text-on-surface-variant">
                          <Clock className="w-4 h-4" /> {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-lg py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="p-2 h-auto text-on-surface-variant hover:text-primary" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {job.status !== 'published' && (
                            <Button variant="ghost" size="sm" onClick={() => updateStatus(job.id, 'published')} className="p-2 h-auto text-on-surface-variant hover:text-[#4ade80]" title="Publish">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {job.status !== 'closed' && (
                            <Button variant="ghost" size="sm" onClick={() => updateStatus(job.id, 'closed')} className="p-2 h-auto text-on-surface-variant hover:text-error" title="Close">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
