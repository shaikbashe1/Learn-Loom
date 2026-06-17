import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, CheckCircle, XCircle, Globe, RefreshCw } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error('Failed to load organizations');
    } else {
      setOrganizations(data as Organization[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('organizations').update({ status }).eq('id', id);
    if (error) {
      toast.error(`Failed to update status to ${status}`);
    } else {
      toast.success(`Organization ${status}`);
      fetchOrgs();
    }
  };

  return (
    <AppLayout title="Organization Management" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Organizations</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Approve, reject, and manage corporate and educational partners.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={fetchOrgs} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-success"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Approved</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{organizations.filter(o => o.status === 'approved').length}</span>
               </div>
             </div>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Pending</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{organizations.filter(o => o.status === 'pending').length}</span>
               </div>
             </div>
          </div>
        </section>

        {/* Organizations Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-panel p-6 rounded-2xl h-[260px] border border-border-base shadow-sm">
                <Skeleton className="h-14 w-14 rounded-xl bg-surface-container mb-4" />
                <Skeleton className="h-6 w-3/4 bg-surface-container mb-3" />
                <Skeleton className="h-16 w-full bg-surface-container mb-6" />
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-full bg-surface-container rounded-lg" />
                  <Skeleton className="h-10 w-full bg-surface-container rounded-lg" />
                </div>
              </div>
            ))
          ) : organizations.length === 0 ? (
            <div className="col-span-full py-20 text-center glass-panel rounded-2xl border border-border-base shadow-sm">
               <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                 <Building className="w-6 h-6 text-text-secondary" />
               </div>
               <p className="font-headline-md text-[18px] font-bold text-text-primary">No organizations found</p>
            </div>
          ) : (
            organizations.map(org => (
              <div key={org.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between border border-border-base shadow-sm card-lift hover:border-primary/50 transition-all group overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 ${
                   org.status === 'approved' ? 'bg-success/5' : org.status === 'pending' ? 'bg-warning/5' : 'bg-error/5'
                }`}></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container border border-border-base flex items-center justify-center text-text-secondary shadow-inner">
                      {org.logo_url ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" /> : <Building className="w-6 h-6" />}
                    </div>
                    {org.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-warning/10 border border-warning/20 text-warning"><span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse"></span> Pending</span>}
                    {org.status === 'approved' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-success/10 border border-success/20 text-success"><span className="w-1.5 h-1.5 bg-success rounded-full"></span> Approved</span>}
                    {org.status === 'rejected' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-error/10 border border-error/20 text-error"><span className="w-1.5 h-1.5 bg-error rounded-full"></span> Rejected</span>}
                  </div>
                  
                  <h3 className="font-headline-md text-[20px] font-bold text-text-primary mb-2 line-clamp-1 group-hover:text-primary transition-colors">{org.name}</h3>
                  <p className="text-[14px] text-text-secondary mb-4 line-clamp-2 min-h-[40px] leading-relaxed">{org.description || 'No description provided.'}</p>
                  
                  {org.website && (
                    <a href={org.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] font-bold text-primary hover:text-primary-container transition-colors mb-5 w-fit">
                      <Globe className="w-4 h-4" /> {org.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                
                <div className="flex gap-3 border-t border-border-base pt-5 mt-2 relative z-10">
                  {org.status !== 'approved' && (
                    <button onClick={() => updateStatus(org.id, 'approved')} className="flex-1 flex items-center justify-center gap-2 bg-success/10 text-success hover:bg-success hover:text-white border border-success/30 font-bold text-[13px] h-10 rounded-lg transition-all shadow-sm">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                  )}
                  {org.status !== 'rejected' && (
                    <button onClick={() => updateStatus(org.id, 'rejected')} className="flex-1 flex items-center justify-center gap-2 bg-error/10 text-error hover:bg-error hover:text-white border border-error/30 font-bold text-[13px] h-10 rounded-lg transition-all shadow-sm">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </AppLayout>
  );
}
