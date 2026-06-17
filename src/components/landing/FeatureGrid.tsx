export function FeatureGrid() {
  return (
    <section id="features" className="py-stack-xl px-margin-mobile md:px-margin-desktop bg-surface">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-stack-lg max-w-[700px] mx-auto">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-text-primary mb-4">An ecosystem built for mastery</h2>
          <p className="font-body-md text-body-md text-text-secondary">Ditch the passive video lectures. LearnLoom combines active coding environments with AI guidance to ensure concept retention.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
          {/* Feature 1: Large Span */}
          <div className="md:col-span-2 rounded-3xl bg-surface-bright border border-border-base p-8 flex flex-col justify-between relative overflow-hidden hover-lift group">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-surface border border-border-base shadow-sm flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-[28px]">route</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-text-primary mb-2">Dynamic AI Roadmaps</h3>
              <p className="font-body-md text-body-md text-text-secondary max-w-md">Your path evolves as you learn. Skip what you know, focus deeply on what you don't. The AI recalculates your trajectory daily.</p>
            </div>
            <div className="absolute right-0 bottom-0 w-1/2 h-[80%] opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
              <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDEwMCBDIDUwIDEwMCwgNTAgMCwgMTAwIDAiIHN0cm9rZT0iIzI1NjNlYiIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9zdmc+')] bg-no-repeat bg-right-bottom"></div>
            </div>
          </div>
          {/* Feature 2 */}
          <div className="rounded-3xl bg-surface border border-border-base p-8 flex flex-col hover-lift relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-secondary-container/30 flex items-center justify-center mb-4 text-secondary">
              <span className="material-symbols-outlined text-[28px]">terminal</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-text-primary mb-2 text-xl">In-Browser IDE</h3>
            <p className="font-body-md text-body-md text-text-secondary text-sm">Write, run, and debug code directly in the platform. No setup required.</p>
          </div>
          {/* Feature 3 */}
          <div className="rounded-3xl bg-surface border border-border-base p-8 flex flex-col hover-lift">
            <div className="w-12 h-12 rounded-xl bg-tertiary-container/20 flex items-center justify-center mb-4 text-tertiary">
              <span className="material-symbols-outlined text-[28px]">forum</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-text-primary mb-2 text-xl">24/7 AI Mentor</h3>
            <p className="font-body-md text-body-md text-text-secondary text-sm">Stuck on a bug? Ask the AI mentor for hints without revealing the exact solution.</p>
          </div>
          {/* Feature 4: Large Span */}
          <div className="md:col-span-2 rounded-3xl bg-inverse-surface text-inverse-on-surface p-8 flex flex-col md:flex-row gap-8 items-center justify-between hover-lift">
            <div className="flex-1">
              <div className="w-12 h-12 rounded-xl bg-on-surface/20 flex items-center justify-center mb-4 text-primary-fixed-dim">
                <span className="material-symbols-outlined text-[28px]">social_leaderboard</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-primary mb-2">Grand Tests &amp; Analytics</h3>
              <p className="font-body-md text-body-md text-inverse-primary/80">Measure your true competency. Comprehensive assessments that mirror real technical interviews, backed by deep performance analytics.</p>
            </div>
            <div className="flex-1 w-full bg-on-surface/50 rounded-xl p-4 border border-on-surface/30">
              {/* Mock Chart */}
              <div className="flex items-end justify-between h-[120px] pb-2 border-b border-on-surface/50">
                <div className="w-8 bg-surface-dim/20 rounded-t-sm h-[30%]"></div>
                <div className="w-8 bg-surface-dim/30 rounded-t-sm h-[50%]"></div>
                <div className="w-8 bg-surface-dim/40 rounded-t-sm h-[40%]"></div>
                <div className="w-8 bg-surface-dim/50 rounded-t-sm h-[70%]"></div>
                <div className="w-8 bg-primary/80 rounded-t-sm h-[95%]"></div>
              </div>
              <div className="flex justify-between mt-2 font-label-sm text-[10px] text-inverse-primary/60 uppercase">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
