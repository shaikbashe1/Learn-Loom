import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
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
  paid:    { label: 'Paid',    color: 'bg-success/10 text-success', icon: CheckCircle },
  created: { label: 'Pending', color: 'bg-warning/10 text-warning', icon: Clock },
  failed:  { label: 'Failed',  color: 'bg-error/10 text-error', icon: XCircle },
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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl space-y-stack-xl w-full">
        <div>
          <h2 className="font-display-lg-mobile md:font-display-lg text-[32px] font-bold text-text-primary">Payment History</h2>
          <p className="font-body-sm text-[16px] text-text-secondary mt-1">
            Manage your billing and view past transactions.
          </p>
        </div>

        {/* Bento Grid: Top Metrics & Subscription */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Current Plan Card */}
          <div className="glass-panel border border-border-base rounded-2xl p-6 md:p-8 col-span-1 md:col-span-2 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tertiary to-secondary"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-label-sm text-[12px] font-bold text-tertiary uppercase tracking-widest">Current Plan</span>
                  <span className="px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-label-sm text-[10px] border border-tertiary/20">PRO</span>
                </div>
                <h3 className="font-headline-lg text-[28px] font-bold text-text-primary mt-2 capitalize">{currentPlanId === 'free' ? 'Free Tier' : currentPlanId + ' Plan'}</h3>
              </div>
              {activeSub && currentPlanId !== 'free' && (
                <div className="bg-surface-container p-3 rounded-xl border border-border-base shadow-inner">
                  <span className="font-headline-lg text-[24px] font-bold text-primary">Active</span>
                </div>
              )}
            </div>

            <div className="border-t border-border-base pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="material-symbols-outlined text-[18px]">event</span>
                {activeSub?.expires_at ? (
                  <span className="font-body-sm text-[14px]">
                    Renews automatically on <strong className="text-text-primary">{new Date(activeSub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </span>
                ) : (
                  <span className="font-body-sm text-[14px]">Free tier active. No upcoming renewals.</span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {activeSub && currentPlanId !== 'free' && (
                  <Link to="/pricing" className="px-5 py-2.5 rounded-xl border border-border-base text-text-primary font-label-md text-[14px] font-bold hover:bg-surface-container transition-colors bg-surface shadow-sm inline-flex items-center justify-center min-h-[44px]">
                    Cancel Plan
                  </Link>
                )}
                <Link to="/pricing" className="px-5 py-2.5 rounded-xl bg-primary text-white font-label-md text-[14px] font-bold hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm inline-flex items-center justify-center min-h-[44px]">
                  Manage Billing
                </Link>
              </div>
            </div>
          </div>

          {/* Payment Method Card - Placeholder for SaaS feel */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 border border-border-base shadow-sm col-span-1 hover:-translate-y-1 transition-transform duration-300 flex flex-col">
            <h4 className="font-label-sm text-[12px] font-bold text-text-secondary uppercase mb-4 tracking-widest">Payment Method</h4>
            <div className="flex items-center gap-4 p-4 border border-border-base rounded-xl mb-auto bg-surface/50 shadow-inner">
              <div className="w-12 h-8 bg-surface-container rounded flex items-center justify-center border border-border-base">
                 <CreditCard className="w-5 h-5 text-text-secondary" />
              </div>
              <div className="flex-1">
                <p className="font-body-md text-[14px] font-bold text-text-primary">Secured by Razorpay</p>
                <p className="font-body-sm text-[12px] text-text-secondary">UPI / Cards</p>
              </div>
            </div>
            <Link to="/pricing" className="w-full mt-6 py-2.5 flex items-center justify-center gap-2 text-primary font-label-md text-[14px] font-bold hover:bg-primary/10 rounded-xl transition-colors border border-primary/20 bg-primary/5 min-h-[44px]">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Update Method
            </Link>
          </div>
        </div>

        {/* Transactions Table Section */}
        <div className="glass-panel rounded-2xl border border-border-base shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-border-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface/30">
            <div>
              <h3 className="font-headline-md text-[24px] font-bold text-text-primary">Transaction History</h3>
              <p className="font-body-sm text-[14px] text-text-secondary mt-1">View and download your recent invoices.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-border-base rounded-xl text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors font-label-md text-[14px] font-bold shadow-sm bg-surface min-h-[44px]">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export All
            </button>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-surface-container rounded-xl border border-border-base" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 bg-surface/20">
                <CreditCard className="w-14 h-14 mx-auto mb-4 text-text-secondary opacity-30" />
                <p className="font-headline-md text-[20px] font-bold text-text-primary">No payment history yet</p>
                <p className="text-[15px] mt-2 text-text-secondary">
                  <Link to="/pricing" className="text-primary font-bold hover:underline">Browse plans →</Link>
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container/50 border-b border-border-base">
                    <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Invoice ID</th>
                    <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Date</th>
                    <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Plan</th>
                    <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Amount</th>
                    <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Status</th>
                    <th className="p-4 px-6 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-base">
                  {orders.map(order => {
                    const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.created;
                    return (
                      <tr key={order.id} className="hover:bg-surface-container/30 transition-colors group">
                        <td className="p-4 px-6 font-label-md text-[14px] text-text-primary font-mono bg-surface/10">
                           {order.razorpay_payment_id ? `INV-${order.razorpay_payment_id.slice(-6).toUpperCase()}` : `INV-${order.id.slice(0,6).toUpperCase()}`}
                        </td>
                        <td className="p-4 px-6 font-body-sm text-[14px] text-text-secondary">
                           <div className="flex items-center gap-1.5">
                             <Calendar className="w-4 h-4" />
                             {new Date(order.paid_at ?? order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                           </div>
                        </td>
                        <td className="p-4 px-6 font-body-sm text-[14px] text-text-primary font-bold capitalize">{order.plan_id}</td>
                        <td className="p-4 px-6 font-body-md text-[15px] font-bold text-text-primary">₹{(order.amount_paise / 100).toLocaleString('en-IN')}</td>
                        <td className="p-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wider border ${cfg.color.replace('text-', 'border-').replace('10', '20')} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 px-6 text-right">
                          <button className="text-text-secondary hover:text-primary transition-colors w-11 h-11 flex items-center justify-center rounded-xl hover:bg-primary/10 border border-transparent hover:border-primary/20 inline-flex shrink-0 ml-auto" title="Download Invoice">
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
              <div className="p-4 border-t border-border-base bg-surface-container/20 flex justify-center">
                <button className="text-primary font-label-md text-[14px] font-bold hover:underline min-h-[44px] py-2 px-4">Load More Transactions</button>
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
