import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, MapPin, Building2, Clock, Plus, Edit2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Jobs Portal</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Manage job postings, review applicants, and track hiring pipelines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={fetchJobs} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-label-md text-[14px] font-bold shadow-sm transition-all card-lift">
              <Plus className="w-5 h-5" /> Post New Job
            </button>
          </div>
        </section>

        {/* Jobs Table */}
        <section className="glass-panel border border-border-base rounded-2xl shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="p-6 md:px-8 py-5 border-b border-border-base flex justify-between items-center bg-surface/50">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
               <Briefcase className="w-5 h-5 text-primary" />
               Job Listings
            </h3>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container/50 border-b border-border-base">
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Company & Location</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Date Posted</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4"><Skeleton className="h-12 w-full bg-surface-container rounded-lg" /></td>
                    </tr>
                  ))
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                       <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                         <Briefcase className="w-6 h-6 text-text-secondary" />
                       </div>
                       <p className="font-headline-md text-[18px] font-bold text-text-primary">No jobs found</p>
                    </td>
                  </tr>
                ) : (
                  jobs.map(job => (
                    <tr key={job.id} className="hover:bg-surface-container/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 shrink-0 border border-border-base rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <p className="font-body-md text-[15px] font-bold text-text-primary truncate">{job.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 text-[14px] font-medium text-text-primary"><Building2 className="w-4 h-4 text-text-secondary" /> {job.company_name}</p>
                          <p className="flex items-center gap-1.5 text-[12px] text-text-secondary"><MapPin className="w-3.5 h-3.5" /> {job.location || 'Remote'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[13px] font-bold text-text-primary capitalize bg-surface border border-border-base px-2.5 py-1 rounded-md">{job.job_type.replace('-', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        {job.status === 'draft' && <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-surface-container border border-border-base text-text-secondary">Draft</span>}
                        {job.status === 'published' && <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-success/10 border border-success/20 text-success">Published</span>}
                        {job.status === 'closed' && <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-error/10 border border-error/20 text-error">Closed</span>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="flex items-center gap-1.5 text-[13px] text-text-secondary font-medium">
                          <Clock className="w-4 h-4" /> {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-primary hover:bg-surface shadow-sm border border-transparent hover:border-border-base transition-all" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {job.status !== 'published' && (
                            <button onClick={() => updateStatus(job.id, 'published')} className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-success hover:bg-surface shadow-sm border border-transparent hover:border-border-base transition-all" title="Publish">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {job.status !== 'closed' && (
                            <button onClick={() => updateStatus(job.id, 'closed')} className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-error hover:bg-surface shadow-sm border border-transparent hover:border-border-base transition-all" title="Close">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
