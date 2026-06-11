import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Zap, Crown, Loader2, Star } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

// Razorpay checkout.js loaded via CDN — declare global
declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => { open: () => void };
  }
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free:  <Star  className="w-5 h-5 text-muted-foreground" />,
  pro:   <Zap   className="w-5 h-5 text-primary" />,
  elite: <Crown className="w-5 h-5 text-chart-4" />,
};
const PLAN_HIGHLIGHT: Record<string, boolean> = { pro: true };
const PLAN_BADGE: Record<string, string> = { pro: 'Most Popular', elite: 'Best Value' };

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const { user, profile } = useAuth();
  const { plans, activeSub, loading, currentPlanId } = useSubscription();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user) { toast.error('Please log in to subscribe'); return; }
    if (planId === 'free') return;
    if (planId === currentPlanId) { toast.info('You are already on this plan'); return; }

    setPurchasing(planId);

    // Load Razorpay checkout.js
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error('Could not load payment gateway. Check your network connection.');
      setPurchasing(null);
      return;
    }

    try {
      // Create Razorpay order server-side
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await supabase.functions.invoke('create-razorpay-order', {
        body: { plan_id: planId },
      });

      if (res.error) {
        const msg = await res.error?.context?.text?.();
        throw new Error(msg || 'Failed to create order');
      }

      const { order_id, amount, currency, key_id, plan_name } = res.data;

      // Open Razorpay modal
      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        name: 'LearnLoom',
        description: `${plan_name} Subscription — 30 days`,
        order_id,
        prefill: {
          name:  profile?.full_name ?? '',
          email: user.email ?? '',
        },
        theme: { color: 'hsl(var(--primary))' },
        handler: async (response) => {
          // Verify server-side and activate subscription
          const verifyRes = await supabase.functions.invoke('verify-razorpay-payment', {
            body: {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            },
          });

          if (verifyRes.error || !verifyRes.data?.success) {
            toast.error('Payment verification failed. Contact support with your payment ID.', {
              description: `Payment ID: ${response.razorpay_payment_id}`,
            });
          } else {
            toast.success(`🎉 Welcome to ${plan_name}!`, {
              description: 'Your subscription is now active. Credits have been added to your account.',
            });
            // Reload page to refresh subscription state
            setTimeout(() => window.location.reload(), 1500);
          }
          setPurchasing(null);
        },
        modal: {
          ondismiss: () => setPurchasing(null),
        },
      });
      rzp.open();
    } catch (err: unknown) {
      console.error('Payment error:', err);
      const msg = err instanceof Error ? err.message : 'Payment failed';
      if (msg.includes('not configured')) {
        toast.error('Razorpay is not configured yet.', {
          description: 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your project secrets.',
        });
      } else {
        toast.error('Payment failed', { description: msg });
      }
      setPurchasing(null);
    }
  };

  return (
    <AppLayout title="Pricing">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3 px-4">
          <h2 className="text-3xl font-bold text-foreground text-balance">
            Invest in Your Career
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
            Start free, upgrade when you're ready. All plans include access to AI Mentor,
            community, and certification. No hidden fees.
          </p>
          {activeSub && activeSub.plan_id !== 'free' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-chart-3/10 border border-chart-3/30 text-chart-3 text-sm font-medium">
              <Check className="w-4 h-4" />
              Currently on <strong>{activeSub.plan_id.charAt(0).toUpperCase() + activeSub.plan_id.slice(1)}</strong>
              {activeSub.expires_at && (
                <span className="text-muted-foreground font-normal">
                  · renews {new Date(activeSub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading
            ? [1, 2, 3].map(i => <Skeleton key={i} className="h-96 bg-muted rounded-2xl" />)
            : plans.map(plan => {
                const isActive    = plan.id === currentPlanId;
                const isHighlight = PLAN_HIGHLIGHT[plan.id];
                const badge       = PLAN_BADGE[plan.id];
                const isBuying    = purchasing === plan.id;

                return (
                  <Card key={plan.id}
                    className={`relative h-full flex flex-col border-2 transition-all ${
                      isHighlight
                        ? 'border-primary shadow-lg shadow-primary/10 bg-primary/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    {badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                          plan.id === 'pro'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-chart-4/90 text-white border-chart-4'
                        }`}>{badge}</span>
                      </div>
                    )}

                    <CardContent className="p-6 flex flex-col h-full gap-5">
                      {/* Plan header */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {PLAN_ICONS[plan.id]}
                          <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                          {isActive && (
                            <Badge variant="secondary" className="ml-auto text-[10px]">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-bold text-foreground">
                            {plan.price_inr === 0 ? '₹0' : `₹${plan.price_inr / 100}`}
                          </span>
                          {plan.price_inr > 0 && (
                            <span className="text-muted-foreground text-sm mb-1">/month</span>
                          )}
                        </div>
                        {plan.credits_per_month > 0 && (
                          <p className="text-xs text-primary font-medium">
                            +{plan.credits_per_month} credits/month
                          </p>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2.5 flex-1">
                        {plan.features.map((f: string) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isHighlight ? 'text-primary' : 'text-chart-3'}`} />
                            <span className="text-pretty">{f}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <Button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isActive || plan.id === 'free' || isBuying}
                        className={`w-full mt-auto h-10 font-semibold ${
                          isHighlight
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'border border-border text-foreground hover:bg-accent bg-transparent'
                        }`}
                      >
                        {isBuying ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
                        ) : isActive ? (
                          'Current Plan'
                        ) : plan.id === 'free' ? (
                          'Always Free'
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
          }
        </div>

        {/* Trust signals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4">
          {[
            { label: 'Secure Payments', sub: 'Powered by Razorpay' },
            { label: '30-Day Access', sub: 'Per subscription cycle' },
            { label: 'Cancel Anytime', sub: 'No lock-in contracts' },
            { label: 'INR Pricing', sub: 'No forex conversion' },
          ].map(t => (
            <div key={t.label} className="p-4 rounded-xl bg-card border border-border">
              <p className="text-sm font-semibold text-foreground text-balance">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.sub}</p>
            </div>
          ))}
        </div>

        {/* Payment history link */}
        {user && (
          <div className="text-center pb-4">
            <a href="/payment-history" className="text-sm text-primary hover:underline">
              View payment history →
            </a>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
