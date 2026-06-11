import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
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
  paid:    { label: 'Paid',    color: 'bg-chart-3/15 text-chart-3 border-chart-3/30', icon: CheckCircle },
  created: { label: 'Pending', color: 'bg-chart-4/15 text-chart-4 border-chart-4/30', icon: Clock },
  failed:  { label: 'Failed',  color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground text-balance">Payment History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All your subscription payments and billing records
          </p>
        </div>

        {/* Active subscription banner */}
        {activeSub && activeSub.plan_id !== 'free' && (
          <div className="rounded-xl bg-primary/10 border border-primary/25 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-foreground text-sm">
                Active: {currentPlanId.charAt(0).toUpperCase() + currentPlanId.slice(1)} Plan
              </p>
              {activeSub.expires_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Expires {new Date(activeSub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            <a href="/pricing"
              className="text-xs text-primary font-medium hover:underline shrink-0">
              Manage subscription →
            </a>
          </div>
        )}

        {/* Orders table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-muted rounded-lg" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-foreground">No payment history yet</p>
                <p className="text-sm mt-1">
                  <a href="/pricing" className="text-primary hover:underline">Browse plans →</a>
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map(order => {
                      const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.created;
                      const Icon = cfg.icon;
                      return (
                        <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground capitalize">{order.plan_id}</td>
                          <td className="px-4 py-3 text-foreground">
                            ₹{(order.amount_paise / 100).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] border ${cfg.color} flex items-center gap-1 w-fit`}>
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {new Date(order.paid_at ?? order.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {order.razorpay_payment_id
                              ? order.razorpay_payment_id.slice(0, 20) + '…'
                              : (order.razorpay_order_id?.slice(0, 20) ?? '—') + (order.razorpay_order_id ? '…' : '')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
