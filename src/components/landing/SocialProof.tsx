export function SocialProof() {
  return (
    <section className="border-y border-outline-variant/30 bg-surface-container-lowest/50 py-lg">
      <div className="max-w-[1440px] mx-auto px-gutter flex flex-col items-center">
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-md">Trusted by engineers at</p>
        <div className="flex flex-wrap justify-center gap-xl md:gap-2xl opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-sm text-on-surface font-headline-md text-headline-md"><span className="material-symbols-outlined text-[32px]">code</span> Google</div>
          <div className="flex items-center gap-sm text-on-surface font-headline-md text-headline-md"><span className="material-symbols-outlined text-[32px]">hub</span> Meta</div>
          <div className="flex items-center gap-sm text-on-surface font-headline-md text-headline-md"><span className="material-symbols-outlined text-[32px]">change_history</span> Vercel</div>
          <div className="flex items-center gap-sm text-on-surface font-headline-md text-headline-md"><span className="material-symbols-outlined text-[32px]">widgets</span> Stripe</div>
        </div>
      </div>
    </section>
  );
}
