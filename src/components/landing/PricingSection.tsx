import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  Brain, 
  Award,
  Sparkles
} from 'lucide-react';

export function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const getPrice = (monthlyPrice: number) => {
    if (billing === 'yearly') {
      return Math.floor(monthlyPrice * 0.8); // 20% discount
    }
    return monthlyPrice;
  };

  return (
    <section className="py-24 px-4 sm:px-6 md:px-10 bg-background border-t border-border select-none">
      <div className="max-w-container-max mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="font-body-md text-muted-foreground mb-8">
            Start for free, upgrade when you need more power.
          </p>
          
          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-full p-1.5 mx-auto w-fit border border-border shadow-inner">
            <button 
              onClick={() => setBilling('monthly')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all duration-200", 
                billing === 'monthly' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBilling('yearly')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2",
                billing === 'yearly' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Yearly 
              <span className="text-[10px] bg-emerald-500/20 text-emerald-500 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto pt-6 items-stretch">
          
          {/* Basic Plan */}
          <div className="rounded-3xl bg-card border border-border p-8 flex flex-col justify-between hover:border-border/80 hover:shadow-lg transition-all duration-300 min-h-[420px]">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Basic</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="font-display text-5xl font-extrabold text-foreground">$0</span>
                <span className="text-muted-foreground text-xs font-semibold">/ forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>Core Curriculum Access</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>Community Support</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground/60">
                  <XCircle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  <span className="line-through">AI Mentor Guidance</span>
                </li>
              </ul>
            </div>
            <button className="w-full py-3 rounded-xl bg-muted/50 text-foreground font-bold hover:bg-muted transition-colors border border-border active:scale-[0.99] min-h-[44px] text-xs">
              Get Started
            </button>
          </div>

          {/* Pro (Highlighted) */}
          <div className="rounded-3xl bg-card border-2 border-primary relative p-8 flex flex-col justify-between shadow-2xl min-h-[420px] md:-translate-y-4">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-[10px] font-extrabold shadow-md uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Most Popular
            </div>
            
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Pro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="font-display text-5xl font-extrabold text-foreground">${getPrice(29)}</span>
                <span className="text-muted-foreground text-xs font-semibold">/ month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>Everything in Basic</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Brain className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold text-primary">Unlimited AI Mentor Access</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>Dynamic Roadmaps</span>
                </li>
              </ul>
            </div>
            <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all min-h-[44px] text-xs shadow-md shadow-primary/10">
              Start 7-Day Free Trial
            </button>
          </div>

          {/* Premium */}
          <div className="rounded-3xl bg-card border border-border p-8 flex flex-col justify-between hover:border-border/80 hover:shadow-lg transition-all duration-300 min-h-[420px]">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Premium</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="font-display text-5xl font-extrabold text-foreground">${getPrice(79)}</span>
                <span className="text-muted-foreground text-xs font-semibold">/ month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Award className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>Verified Certificates</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>1-on-1 Career Coaching</span>
                </li>
              </ul>
            </div>
            <button className="w-full py-3 rounded-xl bg-muted/50 text-foreground font-bold hover:bg-muted transition-colors border border-border active:scale-[0.99] min-h-[44px] text-xs">
              Contact Sales
            </button>
          </div>
          
        </div>
      </div>
    </section>
  );
}
