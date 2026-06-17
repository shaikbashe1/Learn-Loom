export function PricingSection() {
  return (
    <section className="py-stack-xl px-margin-mobile md:px-margin-desktop bg-background border-t border-border-base">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-stack-lg">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-text-primary mb-2">Simple, transparent pricing</h2>
          <p className="font-body-md text-body-md text-text-secondary">Start for free, upgrade when you need more power.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free */}
          <div className="rounded-3xl bg-surface border border-border-base p-8 flex flex-col hover-lift">
            <h3 className="font-label-md text-label-md text-text-secondary uppercase tracking-wider mb-2">Basic</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="font-display-lg text-text-primary">$0</span>
              <span className="text-text-secondary">/ forever</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-text-primary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
                Core Curriculum Access
              </li>
              <li className="flex items-center gap-2 text-text-primary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
                Community Support
              </li>
              <li className="flex items-center gap-2 text-text-secondary font-body-sm text-body-sm opacity-60">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                AI Mentor
              </li>
            </ul>
            <button className="w-full py-3 rounded-full bg-surface-container text-text-primary font-label-md text-label-md font-medium hover:bg-surface-variant transition-colors border border-border-base">Get Started</button>
          </div>
          {/* Pro (Highlighted) */}
          <div className="rounded-3xl bg-surface-bright border-2 border-primary relative p-8 flex flex-col shadow-lg transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary px-4 py-1 rounded-full font-label-sm text-label-sm font-bold">
              Most Popular
            </div>
            <h3 className="font-label-md text-label-md text-primary uppercase tracking-wider mb-2">Pro</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="font-display-lg text-text-primary">$29</span>
              <span className="text-text-secondary">/ month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-text-primary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
                Everything in Basic
              </li>
              <li className="flex items-center gap-2 text-text-primary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">neurology</span>
                Unlimited AI Mentor Access
              </li>
              <li className="flex items-center gap-2 text-text-primary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
                Dynamic Roadmaps
              </li>
            </ul>
            <button className="w-full py-3 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-medium hover:bg-primary transition-colors shadow-md">Start 7-Day Trial</button>
          </div>
          {/* Premium */}
          <div className="rounded-3xl bg-surface border border-border-base p-8 flex flex-col hover-lift">
            <h3 className="font-label-md text-label-md text-tertiary uppercase tracking-wider mb-2">Premium</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="font-display-lg text-text-primary">$79</span>
              <span className="text-text-secondary">/ month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-text-primary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
                Everything in Pro
              </li>
              <li className="flex items-center gap-2 text-text-primary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-warning text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                Verified Certificates
              </li>
              <li className="flex items-center gap-2 text-text-primary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
                1-on-1 Human Career Coaching
              </li>
            </ul>
            <button className="w-full py-3 rounded-full bg-surface-container text-text-primary font-label-md text-label-md font-medium hover:bg-surface-variant transition-colors border border-border-base">Contact Sales</button>
          </div>
        </div>
      </div>
    </section>
  );
}

