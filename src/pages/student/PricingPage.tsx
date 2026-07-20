import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Check, 
  Zap, 
  Crown, 
  Loader2, 
  Star,
  CheckCircle2,
  Shield,
  RefreshCw,
  CalendarX,
  IndianRupee,
  ArrowRight
} from 'lucide-react';
import { auth, db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

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
  free:  <Star  className="w-5 h-5" />,
  pro:   <Zap   className="w-5 h-5" />,
  elite: <Crown className="w-5 h-5" />,
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

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error('Could not load payment gateway. Check your network connection.');
      setPurchasing(null);
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken() ?? '';
      const functions = getFunctions();
      const createOrder = httpsCallable(functions, 'create-razorpay-order');

      const res = await createOrder({ plan_id: planId });
      const data = res.data as any;

      if (!data) {
        throw new Error('Failed to create order');
      }

      const { order_id, amount, currency, key_id, plan_name } = data;

      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        name: 'Quovexi',
        description: `${plan_name} Subscription — 30 days`,
        order_id,
        prefill: {
          name:  profile?.full_name ?? '',
          email: user.email ?? '',
        },
        theme: { color: 'hsl(var(--primary))' },
        handler: async (response) => {
          try {
            const verifyPayment = httpsCallable(functions, 'verify-razorpay-payment');
            const verifyRes = await verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            const verifyData = verifyRes.data as any;

            if (!verifyData?.success) {
              toast.error('Payment verification failed. Contact support with your payment ID.', {
                description: `Payment ID: ${response.razorpay_payment_id}`,
              });
            } else {
              toast.success(`Welcome to ${plan_name}!`, {
                description: 'Your subscription is now active. Credits have been added to your account.',
              });
              setTimeout(() => window.location.reload(), 1500);
            }
          } catch (error) {
            toast.error('Payment verification failed. Contact support with your payment ID.', {
              description: `Payment ID: ${response.razorpay_payment_id}`,
            });
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
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 select-none">

        {/* Hero Section */}
        <section className="pt-16 pb-16 text-center relative z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 blur-[120px] -z-10 rounded-full pointer-events-none" />
          
          <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground mb-4 max-w-3xl mx-auto tracking-tight leading-tight">
            Invest in your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-4">intellectual velocity.</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Choose the plan that fits your learning journey. From foundational concepts to AI-accelerated mastery, Quovexi adapts to your pace.
          </p>

          {activeSub && activeSub.plan_id !== 'free' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold mb-4 shadow-sm">
              <Check className="w-3.5 h-3.5" />
              <span>Currently on <strong className="text-foreground">{activeSub.plan_id.toUpperCase()}</strong></span>
              {activeSub.expires_at && (
                <span className="text-emerald-500/80 font-semibold">
                  · Renews {new Date(activeSub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pb-16 relative z-10">
          {loading
            ? [1, 2, 3].map(i => <Skeleton key={i} className="h-[520px] bg-muted rounded-3xl" />)
            : plans.map(plan => {
                const isActive    = plan.id === currentPlanId;
                const isHighlight = PLAN_HIGHLIGHT[plan.id];
                const badge       = PLAN_BADGE[plan.id];
                const isBuying    = purchasing === plan.id;

                if (isHighlight) {
                  return (
                    <div key={plan.id} className="bg-card border-2 border-primary rounded-3xl p-8 shadow-xl relative z-20 md:scale-105 flex flex-col hover:-translate-y-1 transition-all duration-300">
                      {badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                          {badge}
                        </div>
                      )}
                      
                      <div className="mb-6 flex items-center gap-3">
                         <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                           {PLAN_ICONS[plan.id]}
                         </div>
                         <div>
                            <h3 className="text-base font-bold text-foreground mb-0.5">{plan.name}</h3>
                            <p className="text-[11px] text-muted-foreground">Everything you need for mastery.</p>
                         </div>
                      </div>
                      
                      <div className="mb-8">
                        <span className="font-display text-4xl font-extrabold text-foreground">
                          {plan.price_inr === 0 ? '₹0' : `₹${plan.price_inr / 100}`}
                        </span>
                        {plan.price_inr > 0 && <span className="text-xs text-muted-foreground font-semibold ml-1">/ month</span>}
                        {plan.credits_per_month > 0 && (
                          <p className="text-[11px] font-bold text-primary mt-1.5">
                            +{plan.credits_per_month} AI credits/mo
                          </p>
                        )}
                      </div>
                      
                      <Button 
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isActive || plan.id === 'free' || isBuying}
                        className="w-full h-11 bg-primary text-primary-foreground hover:brightness-110 font-bold rounded-xl shadow-md shadow-primary/10 mb-8 disabled:opacity-80 disabled:pointer-events-none flex justify-center items-center gap-2 text-xs"
                      >
                         {isBuying ? (
                           <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                         ) : isActive ? (
                           'Current Plan'
                         ) : (
                           `Upgrade to ${plan.name}`
                         )}
                      </Button>

                      <ul className="space-y-4 flex-grow">
                        {plan.features.map((f: string) => (
                          <li key={f} className="flex items-start gap-3 text-xs text-foreground">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                // Normal card
                return (
                  <div key={plan.id} className="bg-card border border-border rounded-3xl p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col relative z-10">
                    {badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted text-foreground border border-border text-[10px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {badge}
                      </div>
                    )}

                    <div className="mb-6 flex items-center gap-3">
                       <div className="p-2 rounded-xl bg-muted text-muted-foreground shrink-0">
                         {PLAN_ICONS[plan.id]}
                       </div>
                       <div>
                          <h3 className="text-base font-bold text-foreground mb-0.5">{plan.name}</h3>
                          <p className="text-[11px] text-muted-foreground">
                             {plan.id === 'free' ? 'Perfect to explore the platform.' : 'For dedicated career accelerators.'}
                          </p>
                       </div>
                    </div>
                    
                    <div className="mb-8">
                      <span className="font-display text-4xl font-extrabold text-foreground">
                        {plan.price_inr === 0 ? '₹0' : `₹${plan.price_inr / 100}`}
                      </span>
                      {plan.price_inr > 0 ? (
                        <span className="text-xs text-muted-foreground font-semibold ml-1">/ month</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-semibold ml-1">/ forever</span>
                      )}
                      {plan.credits_per_month > 0 && (
                        <p className="text-[11px] font-bold text-primary mt-1.5">
                          +{plan.credits_per_month} AI credits/mo
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isActive || plan.id === 'free' || isBuying}
                      variant={plan.id === 'free' ? 'outline' : 'default'}
                      className={`w-full h-11 rounded-xl font-bold transition-all mb-8 flex justify-center items-center gap-2 text-xs
                        ${
                          plan.id === 'free' 
                            ? 'border-border text-foreground hover:bg-muted/50' 
                            : 'bg-foreground text-background hover:bg-foreground/90'
                        }`}
                    >
                       {isBuying ? (
                         <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                       ) : isActive ? (
                         'Current Plan'
                       ) : plan.id === 'free' ? (
                         'Always Free'
                       ) : (
                         `Upgrade to ${plan.name}`
                       )}
                    </Button>

                    <ul className="space-y-4 flex-grow">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-3 text-xs text-foreground">
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{f}</span>
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
            { label: 'Secure Payments', sub: 'Powered by Razorpay', icon: Shield },
            { label: '30-Day Access', sub: 'Per subscription cycle', icon: RefreshCw },
            { label: 'Cancel Anytime', sub: 'No lock-in contracts', icon: CalendarX },
            { label: 'INR Pricing', sub: 'No forex conversion', icon: IndianRupee },
          ].map(t => {
            const TrustIcon = t.icon;
            return (
              <div key={t.label} className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center shadow-sm">
                <TrustIcon className="h-7 w-7 text-primary mb-3" />
                <p className="text-xs font-bold text-foreground">{t.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Payment history link */}
        {user && (
          <div className="text-center pb-12">
            <Link to="/payment-history" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
              <span>View payment history</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
