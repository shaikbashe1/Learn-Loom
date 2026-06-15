const plans = [
  {
    name: "Pro",
    description: "For individual developers upgrading their skills.",
    price: "$29",
    features: [
      { text: "Full Curriculum Access", iconColor: "text-primary" },
      { text: "Interactive Environments", iconColor: "text-primary" },
      { text: "Community Discord", iconColor: "text-primary" }
    ],
    buttonText: "Start Free Trial",
    highlight: false
  },
  {
    name: "Elite",
    description: "For senior engineers seeking mastery with AI support.",
    price: "$49",
    features: [
      { text: "Everything in Pro", iconColor: "text-primary" },
      { text: "Unlimited Loomie AI Access", iconColor: "text-secondary" },
      { text: "Project Code Reviews", iconColor: "text-primary" },
      { text: "Early Access to Modules", iconColor: "text-primary" }
    ],
    buttonText: "Go Elite",
    highlight: true
  },
  {
    name: "Enterprise",
    description: "Scale engineering excellence across your team.",
    price: "Custom",
    features: [
      { text: "Team Analytics Dashboard", iconColor: "text-primary" },
      { text: "SSO & SAML", iconColor: "text-primary" },
      { text: "Custom Learning Paths", iconColor: "text-primary" }
    ],
    buttonText: "Contact Sales",
    highlight: false
  }
];

export function PricingSection() {
  return (
    <section id="enterprise" className="px-gutter py-2xl max-w-[1440px] mx-auto">
      <div className="text-center mb-xl">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Invest in your trajectory</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Simple, transparent pricing for individuals and teams.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg max-w-[1000px] mx-auto">
        {plans.map((plan, i) => (
          <div key={i} className={plan.highlight 
            ? "bg-surface-container border-2 border-primary rounded-xl p-lg flex flex-col relative transform lg:-translate-y-4 shadow-[0_10px_30px_rgba(192,193,255,0.1)]"
            : `bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-lg flex flex-col hover:border-outline transition-colors ${i===2 ? 'lg:col-span-1 md:col-span-2 md:w-1/2 lg:w-full md:mx-auto' : ''}`
          }>
            {plan.highlight && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none rounded-xl"></div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary font-label-sm text-label-sm px-md py-xs rounded-full font-bold">Most Popular</div>
              </>
            )}
            <h3 className={`font-headline-md text-headline-md ${plan.highlight ? 'text-primary' : 'text-on-surface'} mb-xs mt-sm relative z-10`}>{plan.name}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-md h-12 relative z-10">{plan.description}</p>
            <div className="mb-lg relative z-10">
              <span className={`font-display ${plan.price === 'Custom' ? 'text-[32px] font-headline-lg' : 'text-[40px]'} text-on-surface font-bold`}>{plan.price}</span>
              {plan.price !== 'Custom' && <span className="font-body-md text-on-surface-variant">/mo</span>}
            </div>
            <ul className="space-y-sm font-body-md text-body-md text-on-surface-variant flex-grow mb-lg relative z-10">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-center gap-sm">
                  <span className={`material-symbols-outlined ${f.iconColor} text-[18px]`}>done</span> 
                  {f.text}
                </li>
              ))}
            </ul>
            <button className={`w-full font-label-md text-label-md py-sm rounded transition-all relative z-10 ${plan.highlight ? 'bg-primary text-on-primary font-bold hover:shadow-[0_0_12px_rgba(192,193,255,0.6)]' : 'bg-surface-container-high text-on-surface border border-outline-variant/60 hover:bg-surface-container-highest'}`}>
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
