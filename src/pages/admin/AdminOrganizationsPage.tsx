import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, CheckCircle, XCircle, Globe, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Organizations</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Approve, reject, and manage corporate and educational partners.</p>
          </div>
          <div className="flex gap-md items-center">
            <Button variant="ghost" size="sm" onClick={fetchOrgs} className="border border-outline-variant text-on-surface hover:bg-surface-variant h-11 w-11 rounded-xl">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-panel p-lg rounded-xl h-[240px]">
                <Skeleton className="h-12 w-12 rounded-lg bg-surface border border-outline-variant/30 mb-4" />
                <Skeleton className="h-6 w-3/4 bg-surface border border-outline-variant/30 mb-2" />
                <Skeleton className="h-4 w-1/2 bg-surface border border-outline-variant/30 mb-6" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 bg-surface border border-outline-variant/30 rounded" />
                  <Skeleton className="h-8 w-20 bg-surface border border-outline-variant/30 rounded" />
                </div>
              </div>
            ))
          ) : organizations.length === 0 ? (
            <div className="col-span-full py-16 text-center text-on-surface-variant">No organizations found.</div>
          ) : (
            organizations.map(org => (
              <div key={org.id} className="glass-panel p-lg rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-on-surface-variant">
                      {org.logo_url ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" /> : <Building className="w-6 h-6" />}
                    </div>
                    {org.status === 'pending' && <Badge className="bg-tertiary/20 text-tertiary border border-tertiary/30">Pending</Badge>}
                    {org.status === 'approved' && <Badge className="bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">Approved</Badge>}
                    {org.status === 'rejected' && <Badge className="bg-error/20 text-error border border-error/30">Rejected</Badge>}
                  </div>
                  <h3 className="font-headline-md text-on-surface mb-1">{org.name}</h3>
                  <p className="text-body-sm text-on-surface-variant mb-4 line-clamp-2">{org.description || 'No description provided.'}</p>
                  
                  {org.website && (
                    <a href={org.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-label-sm text-primary hover:underline mb-4">
                      <Globe className="w-4 h-4" /> {org.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                
                <div className="flex gap-2 border-t border-outline-variant/30 pt-4 mt-2">
                  {org.status !== 'approved' && (
                    <Button onClick={() => updateStatus(org.id, 'approved')} className="flex-1 bg-[#4ade80]/10 text-[#4ade80] hover:bg-[#4ade80]/20 border border-[#4ade80]/30" size="sm">
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </Button>
                  )}
                  {org.status !== 'rejected' && (
                    <Button onClick={() => updateStatus(org.id, 'rejected')} className="flex-1 bg-error/10 text-error hover:bg-error/20 border border-error/30" size="sm">
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
