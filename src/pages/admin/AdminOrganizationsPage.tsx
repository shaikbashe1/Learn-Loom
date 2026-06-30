import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building, 
  CheckCircle2, 
  XCircle, 
  Globe, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Organizations</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Approve, reject, and manage corporate and educational partners.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={fetchOrgs} 
               className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all shadow-sm"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             
             <div className="flex items-center justify-center px-4 py-2 bg-card border border-border rounded-xl shadow-sm h-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved</span>
                  <span className="text-xs font-bold text-foreground ml-1">
                    {organizations.filter(o => o.status === 'approved').length}
                  </span>
                </div>
             </div>
             
             <div className="flex items-center justify-center px-4 py-2 bg-card border border-border rounded-xl shadow-sm h-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending</span>
                  <span className="text-xs font-bold text-foreground ml-1">
                    {organizations.filter(o => o.status === 'pending').length}
                  </span>
                </div>
             </div>
          </div>
        </section>

        {/* Organizations Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card p-6 rounded-3xl h-[260px] border border-border shadow-sm">
                <Skeleton className="h-14 w-14 rounded-2xl bg-muted mb-4" />
                <Skeleton className="h-6 w-3/4 bg-muted mb-3 rounded-lg" />
                <Skeleton className="h-16 w-full bg-muted mb-6 rounded-xl" />
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-full bg-muted rounded-xl" />
                  <Skeleton className="h-10 w-full bg-muted rounded-xl" />
                </div>
              </div>
            ))
          ) : organizations.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-card rounded-3xl border border-border shadow-sm">
               <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                 <Building className="w-6 h-6 text-muted-foreground/40" />
               </div>
               <p className="text-sm font-bold text-foreground">No organizations found</p>
            </div>
          ) : (
            organizations.map(org => (
              <div key={org.id} className="bg-card p-6 rounded-3xl flex flex-col justify-between border border-border shadow-sm hover:border-border/80 transition-all group overflow-hidden relative">
                <div className={`absolute top-[-10%] right-[-10%] w-32 h-32 rounded-full blur-2xl pointer-events-none ${
                   org.status === 'approved' ? 'bg-emerald-500/5' : org.status === 'pending' ? 'bg-amber-500/5' : 'bg-destructive/5'
                }`} />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-inner shrink-0">
                      {org.logo_url ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" /> : <Building className="w-5 h-5" />}
                    </div>
                    
                    <Badge className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${
                      org.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      org.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {org.status === 'pending' && <Clock className="w-3.5 h-3.5 mr-1 inline" />}
                      <span>{org.status}</span>
                    </Badge>
                  </div>
                  
                  <h3 className="text-sm font-bold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {org.name}
                  </h3>
                  
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[36px] leading-relaxed font-semibold">
                    {org.description || 'No description provided.'}
                  </p>
                  
                  {org.website && (
                    <a 
                      href={org.website} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline mb-4 w-fit"
                    >
                      <Globe className="w-3.5 h-3.5" /> 
                      <span>{org.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>
                
                <div className="flex gap-3 border-t border-border pt-5 mt-2 relative z-10">
                  {org.status !== 'approved' && (
                    <Button 
                      onClick={() => updateStatus(org.id, 'approved')} 
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs h-10 rounded-xl transition-all shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </Button>
                  )}
                  {org.status !== 'rejected' && (
                    <Button 
                      onClick={() => updateStatus(org.id, 'rejected')} 
                      className="flex-1 flex items-center justify-center gap-1.5 bg-destructive hover:brightness-110 active:scale-[0.98] text-destructive-foreground font-bold text-xs h-10 rounded-xl transition-all shadow-sm"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
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
