import { useState } from 'react';
import { cn } from '@/lib/utils';

export function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const getPrice = (monthlyPrice: number) => {
    if (billing === 'yearly') {
      return Math.floor(monthlyPrice * 0.8); // 20% discount
    }
    return monthlyPrice;
  };

  return (
    <section className="py-20 px-4 sm:px-6 md:px-10 bg-background border-t border-border-base">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-text-primary mb-3 text-3xl md:text-4xl font-extrabold tracking-tight">Simple, transparent pricing</h2>
          <p className="font-body-lg text-body-lg text-text-secondary mb-8">Start for free, upgrade when you need more power.</p>
          
          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center gap-2 bg-surface-container rounded-full p-1 mx-auto w-fit border border-border-base shadow-sm">
            <button 
              onClick={() => setBilling('monthly')}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200", 
                billing === 'monthly' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBilling('yearly')}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5",
                billing === 'yearly' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Yearly 
              <span className="text-[9px] bg-success/20 text-success-foreground font-extrabold px-1.5 py-0.5 rounded-full border border-success/30">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto pt-6 items-stretch">
          {/* Basic Plan */}
          <div className="rounded-3xl bg-surface border border-border-base p-6 sm:p-8 flex flex-col justify-between card-lift min-h-[420px]">
            <div>
              <h3 className="font-label-md text-label-md text-text-secondary uppercase tracking-wider mb-2 font-semibold">Basic</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-5xl font-extrabold text-text-primary">$0</span>
                <span className="text-text-secondary font-medium">/ forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-2.5 text-text-primary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-success text-[18px] fill">check_circle</span>
                  Core Curriculum Access
                </li>
                <li className="flex items-center gap-2.5 text-text-primary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-success text-[18px] fill">check_circle</span>
                  Community Support
                </li>
                <li className="flex items-center gap-2.5 text-text-secondary font-body-sm text-body-sm opacity-50">
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  AI Mentor
                </li>
              </ul>
            </div>
            <button className="w-full py-3 rounded-full bg-surface-container text-text-primary font-label-md text-label-md font-bold hover:bg-surface-variant transition-colors border border-border-base active:scale-95">Get Started</button>
          </div>

          {/* Pro (Highlighted) */}
          <div className="rounded-3xl bg-surface-bright border-2 border-primary relative p-6 sm:p-8 flex flex-col justify-between shadow-xl min-h-[420px] md:-translate-y-4">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary px-5 py-1 rounded-full font-label-sm text-label-sm font-bold shadow-md uppercase tracking-wider text-[10px]">
              Most Popular
            </div>
            <div>
              <h3 className="font-label-md text-label-md text-primary uppercase tracking-wider mb-2 font-semibold">Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-5xl font-extrabold text-text-primary">${getPrice(29)}</span>
                <span className="text-text-secondary font-medium">/ month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-2.5 text-text-primary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-success text-[18px] fill">check_circle</span>
                  Everything in Basic
                </li>
                <li className="flex items-center gap-2.5 text-text-primary font-body-sm text-body-sm font-medium">
                  <span className="material-symbols-outlined text-primary text-[18px]">neurology</span>
                  Unlimited AI Mentor Access
                </li>
                <li className="flex items-center gap-2.5 text-text-primary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-success text-[18px] fill">check_circle</span>
                  Dynamic Roadmaps
                </li>
              </ul>
            </div>
            <button className="w-full py-3 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold hover:bg-primary transition-colors shadow-md hover:shadow-lg active:scale-95">Start 7-Day Trial</button>
          </div>

          {/* Premium */}
          <div className="rounded-3xl bg-surface border border-border-base p-6 sm:p-8 flex flex-col justify-between card-lift min-h-[420px]">
            <div>
              <h3 className="font-label-md text-label-md text-tertiary uppercase tracking-wider mb-2 font-semibold">Premium</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-5xl font-extrabold text-text-primary">${getPrice(79)}</span>
                <span className="text-text-secondary font-medium">/ month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-2.5 text-text-primary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-success text-[18px] fill">check_circle</span>
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2.5 text-text-primary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-warning text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  Verified Certificates
                </li>
                <li className="flex items-center gap-2.5 text-text-primary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-success text-[18px] fill">check_circle</span>
                  1-on-1 Human Career Coaching
                </li>
              </ul>
            </div>
            <button className="w-full py-3 rounded-full bg-surface-container text-text-primary font-label-md text-label-md font-bold hover:bg-surface-variant transition-colors border border-border-base active:scale-95">Contact Sales</button>
          </div>
        </div>
      </div>
    </section>
  );
}
