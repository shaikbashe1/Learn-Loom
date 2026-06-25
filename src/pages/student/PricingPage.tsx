import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
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
  free:  <Star  className="w-[20px] h-[20px]" />,
  pro:   <Zap   className="w-[20px] h-[20px]" />,
  elite: <Crown className="w-[20px] h-[20px]" />,
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
            toast.success(`Welcome to ${plan_name}!`, {
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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">

        {/* Hero Section */}
        <section className="pt-16 pb-16 text-center relative z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-tr from-primary-fixed-dim/20 to-tertiary-fixed-dim/20 blur-3xl -z-10 rounded-full opacity-50 pointer-events-none"></div>
          
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-stack-md max-w-3xl mx-auto tracking-tight">
            Invest in your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">intellectual velocity.</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-stack-lg">
            Choose the plan that fits your learning journey. From foundational concepts to AI-accelerated mastery, LearnLoom adapts to your pace.
          </p>

          {activeSub && activeSub.plan_id !== 'free' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 text-success font-label-md text-label-md mb-stack-md">
              <Check className="w-4 h-4" />
              Currently on <strong>{activeSub.plan_id.charAt(0).toUpperCase() + activeSub.plan_id.slice(1)}</strong>
              {activeSub.expires_at && (
                <span className="text-success/80 font-normal">
                  · renews {new Date(activeSub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center pb-stack-xl relative z-10">
          {loading
            ? [1, 2, 3].map(i => <Skeleton key={i} className="h-[520px] bg-surface-container rounded-2xl" />)
            : plans.map(plan => {
                const isActive    = plan.id === currentPlanId;
                const isHighlight = PLAN_HIGHLIGHT[plan.id];
                const badge       = PLAN_BADGE[plan.id];
                const isBuying    = purchasing === plan.id;

                if (isHighlight) {
                  return (
                    <div key={plan.id} className="bg-gradient-to-b from-primary to-tertiary rounded-2xl p-8 shadow-xl relative z-20 md:scale-105 h-[560px] flex flex-col transform transition-transform duration-300 hover:-translate-y-2">
                      {badge && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-4 py-1 rounded-full uppercase tracking-wider font-bold shadow-md">
                          {badge}
                        </div>
                      )}
                      
                      <div className="mb-6 flex items-center gap-3">
                         <span className="text-secondary-container">{PLAN_ICONS[plan.id]}</span>
                         <div>
                            <h3 className="font-headline-md text-headline-md text-on-primary mb-1">{plan.name}</h3>
                            <p className="font-body-sm text-body-sm text-on-primary/80">Everything you need for mastery.</p>
                         </div>
                      </div>
                      <div className="mb-8">
                        <span className="font-display-lg text-display-lg text-on-primary">{plan.price_inr === 0 ? '₹0' : `₹${plan.price_inr / 100}`}</span>
                        {plan.price_inr > 0 && <span className="font-body-sm text-body-sm text-on-primary/80">/ month</span>}
                        {plan.credits_per_month > 0 && <p className="font-label-sm text-on-primary mt-1">+{plan.credits_per_month} AI credits/mo</p>}
                      </div>
                      
                      <button 
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isActive || plan.id === 'free' || isBuying}
                        className="w-full block text-center py-3 rounded-lg bg-surface text-primary font-label-md text-label-md hover:bg-surface-bright transition-colors shadow-sm mb-8 disabled:opacity-80 disabled:pointer-events-none flex justify-center items-center gap-2"
                      >
                         {isBuying ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : isActive ? 'Current Plan' : `Upgrade to ${plan.name}`}
                      </button>

                      <ul className="space-y-4 flex-grow">
                        {plan.features.map((f: string) => (
                          <li key={f} className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-secondary-container text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <span className="font-body-sm text-body-sm text-on-primary">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                // Normal card
                return (
                  <div key={plan.id} className="glass-panel border border-border-base rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] h-[520px] flex flex-col relative z-10">
                    {badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-tertiary text-on-tertiary font-label-sm text-label-sm px-4 py-1 rounded-full uppercase tracking-wider font-bold shadow-sm">
                        {badge}
                      </div>
                    )}

                    <div className="mb-6 flex items-center gap-3">
                       <span className="text-on-surface-variant">{PLAN_ICONS[plan.id]}</span>
                       <div>
                          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{plan.name}</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                             {plan.id === 'free' ? 'Perfect to explore the platform.' : 'For dedicated career accelerators.'}
                          </p>
                       </div>
                    </div>
                    <div className="mb-8">
                      <span className="font-display-lg text-display-lg text-on-surface">{plan.price_inr === 0 ? '₹0' : `₹${plan.price_inr / 100}`}</span>
                      {plan.price_inr > 0 ? <span className="font-body-sm text-body-sm text-on-surface-variant">/ month</span> : <span className="font-body-sm text-body-sm text-on-surface-variant">/ forever</span>}
                      {plan.credits_per_month > 0 && <p className="font-label-sm text-primary mt-1">+{plan.credits_per_month} AI credits/mo</p>}
                    </div>
                    
                    <button 
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isActive || plan.id === 'free' || isBuying}
                      className={`w-full block text-center py-3 rounded-lg border border-border-base font-label-md text-label-md transition-colors mb-8 flex justify-center items-center gap-2 disabled:opacity-80 disabled:pointer-events-none
                         ${plan.id === 'free' ? 'text-on-surface hover:bg-surface-container-low' : 'bg-on-surface text-surface hover:bg-on-surface-variant'}`}
                    >
                       {isBuying ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : isActive ? 'Current Plan' : plan.id === 'free' ? 'Always Free' : `Upgrade to ${plan.name}`}
                    </button>

                    <ul className="space-y-4 flex-grow">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          <span className="font-body-sm text-body-sm text-on-surface">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
          }
        </div>

        {/* Trust signals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4 pb-12">
          {[
            { label: 'Secure Payments', sub: 'Powered by Razorpay', icon: 'shield' },
            { label: '30-Day Access', sub: 'Per subscription cycle', icon: 'autorenew' },
            { label: 'Cancel Anytime', sub: 'No lock-in contracts', icon: 'event_busy' },
            { label: 'INR Pricing', sub: 'No forex conversion', icon: 'currency_rupee' },
          ].map(t => (
            <div key={t.label} className="p-6 rounded-xl glass-panel border border-border-base flex flex-col items-center">
              <span className="material-symbols-outlined text-primary text-[32px] mb-3">{t.icon}</span>
              <p className="text-sm font-semibold text-on-surface text-balance">{t.label}</p>
              <p className="text-xs text-on-surface-variant mt-1">{t.sub}</p>
            </div>
          ))}
        </div>

        {/* Payment history link */}
        {user && (
          <div className="text-center pb-12">
            <Link to="/payment-history" className="font-label-md text-primary hover:text-primary-container transition-colors inline-flex items-center gap-1">
              View payment history <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
