import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  PlusCircle 
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

interface PaymentOrder {
  id: string;
  plan_id: string;
  amount_paise: number;
  currency: string;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
}

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 },
  created: { label: 'Pending', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
  failed:  { label: 'Failed',  color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function PaymentHistoryPage() {
  const { user } = useAuth();
  const { activeSub, currentPlanId } = useSubscription();
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('payment_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setOrders((data as PaymentOrder[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <AppLayout title="Payment History">
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 space-y-8 w-full select-none">
        
        {/* Header */}
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Payment History</h2>
          <p className="text-xs text-muted-foreground mt-1 font-semibold">
            Manage your billing and view past transactions.
          </p>
        </div>

        {/* Bento Grid: Current Plan & Payment Method */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Current Plan Card */}
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 col-span-1 md:col-span-2 flex flex-col justify-between hover:border-border/80 transition-all duration-300 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-chart-4" />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider">Current Plan</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-extrabold border border-primary/20">PRO</span>
                </div>
                <h3 className="font-display text-2xl font-extrabold text-foreground capitalize mt-1.5">
                  {currentPlanId === 'free' ? 'Free Tier' : currentPlanId + ' Plan'}
                </h3>
              </div>
              
              {activeSub && currentPlanId !== 'free' && (
                <div className="bg-primary/5 border border-primary/15 px-4 py-2 rounded-xl text-primary font-bold text-xs">
                  Active
                </div>
              )}
            </div>

            <div className="border-t border-border pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
                <Calendar className="h-4 w-4 text-muted-foreground/60" />
                {activeSub?.expires_at ? (
                  <span>
                    Renews automatically on <strong className="text-foreground">{new Date(activeSub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </span>
                ) : (
                  <span>Free tier active. No upcoming renewals.</span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {activeSub && currentPlanId !== 'free' && (
                  <Link to="/pricing" className="px-5 py-2.5 rounded-xl border border-border text-foreground font-bold text-xs hover:bg-muted/50 transition-all shadow-sm flex items-center justify-center min-h-[40px]">
                    Cancel Plan
                  </Link>
                )}
                <Link to="/pricing" className="px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-primary/10 flex items-center justify-center min-h-[40px]">
                  Manage Billing
                </Link>
              </div>
            </div>
          </div>

          {/* Payment Method Card */}
          <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm col-span-1 hover:border-border/80 transition-all duration-300 flex flex-col justify-between">
            <div>
              <h4 className="text-[9px] font-extrabold text-muted-foreground uppercase mb-4 tracking-wider">
                Payment Method
              </h4>
              
              <div className="flex items-center gap-4 p-4 border border-border rounded-2xl bg-muted/20 shadow-inner">
                <div className="w-12 h-8 bg-card rounded-lg flex items-center justify-center border border-border shadow-sm">
                   <CreditCard className="w-4 h-4 text-muted-foreground/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Secured by Razorpay</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">UPI / Cards</p>
                </div>
              </div>
            </div>
            
            <Link to="/pricing" className="w-full mt-6 py-2.5 flex items-center justify-center gap-1.5 text-primary text-xs font-bold hover:bg-primary/10 rounded-xl transition-all border border-primary/20 bg-primary/5 min-h-[40px]">
              <PlusCircle className="h-4 w-4" />
              <span>Update Method</span>
            </Link>
          </div>
        </div>

        {/* Transactions Table Section */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
            <div>
              <h3 className="text-base font-bold text-foreground">Transaction History</h3>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                View and download your recent invoices.
              </p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all text-xs font-bold shadow-sm bg-card min-h-[40px]">
              <Download className="h-4 w-4" />
              <span>Export All</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-muted rounded-2xl" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm font-bold text-foreground">No payment history yet</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  <Link to="/pricing" className="text-primary font-bold hover:underline">Browse plans →</Link>
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Invoice ID</th>
                    <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Date</th>
                    <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Plan</th>
                    <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Amount</th>
                    <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Status</th>
                    <th className="p-4 px-6 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map(order => {
                    const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.created;
                    return (
                      <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 px-6 text-xs text-foreground font-mono font-bold">
                           {order.razorpay_payment_id ? `INV-${order.razorpay_payment_id.slice(-6).toUpperCase()}` : `INV-${order.id.slice(0,6).toUpperCase()}`}
                        </td>
                        <td className="p-4 px-6 text-xs text-muted-foreground font-semibold">
                           <div className="flex items-center gap-1.5">
                             <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                             <span>
                               {new Date(order.paid_at ?? order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                             </span>
                           </div>
                        </td>
                        <td className="p-4 px-6 text-xs text-foreground font-bold capitalize">{order.plan_id}</td>
                        <td className="p-4 px-6 text-xs font-bold text-foreground">₹{(order.amount_paise / 100).toLocaleString('en-IN')}</td>
                        <td className="p-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 px-6 text-right">
                          <button className="text-muted-foreground hover:text-foreground transition-colors w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted/50 border border-transparent inline-flex shrink-0 ml-auto" title="Download Invoice">
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            
            {orders.length > 0 && (
              <div className="p-4 border-t border-border bg-muted/5 flex justify-center">
                <button className="text-primary font-bold text-xs hover:underline py-2 px-4">
                  Load More Transactions
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
