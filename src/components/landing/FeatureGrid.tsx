export function FeatureGrid() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 md:px-10 bg-surface">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-16 max-w-[700px] mx-auto animate-fade-in">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-text-primary mb-4 text-3xl md:text-4xl font-extrabold tracking-tight">An ecosystem built for mastery</h2>
          <p className="font-body-lg text-body-lg text-text-secondary">Ditch the passive video lectures. LearnLoom combines active coding environments with AI guidance to ensure concept retention.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1: Large Span */}
          <div className="md:col-span-2 rounded-3xl bg-surface-bright border border-border-base p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden card-lift group min-h-[280px]">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-surface border border-border-base shadow-sm flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-[28px]">route</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-text-primary mb-3">Dynamic AI Roadmaps</h3>
              <p className="font-body-md text-body-md text-text-secondary max-w-md leading-relaxed">Your path evolves as you learn. Skip what you know, focus deeply on what you don't. The AI recalculates your trajectory daily.</p>
            </div>
            <div className="absolute right-0 bottom-0 w-1/2 h-[80%] opacity-20 group-hover:opacity-45 transition-opacity pointer-events-none">
              <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDEwMCBDIDUwIDEwMCwgNTAgMCwgMTAwIDAiIHN0cm9rZT0iIzI1NjNlYiIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9zdmc+')] bg-no-repeat bg-right-bottom"></div>
            </div>
          </div>
          
          {/* Feature 2 */}
          <div className="rounded-3xl bg-surface border border-border-base p-6 sm:p-8 flex flex-col justify-between card-lift relative overflow-hidden min-h-[280px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-secondary-container/30 flex items-center justify-center mb-6 text-secondary shadow-sm">
                <span className="material-symbols-outlined text-[28px]">terminal</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-text-primary mb-3">In-Browser IDE</h3>
              <p className="font-body-md text-body-md text-text-secondary leading-relaxed">Write, run, and debug code directly in the platform. No local configuration required.</p>
            </div>
          </div>
          
          {/* Feature 3 */}
          <div className="rounded-3xl bg-surface border border-border-base p-6 sm:p-8 flex flex-col justify-between card-lift min-h-[280px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-tertiary-container/20 flex items-center justify-center mb-6 text-tertiary shadow-sm">
                <span className="material-symbols-outlined text-[28px]">forum</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-text-primary mb-3">24/7 AI Mentor</h3>
              <p className="font-body-md text-body-md text-text-secondary leading-relaxed">Stuck on a bug? Ask the AI mentor for hints without revealing the exact solution.</p>
            </div>
          </div>
          
          {/* Feature 4: Large Span */}
          <div className="md:col-span-2 rounded-3xl bg-inverse-surface text-inverse-on-surface p-6 sm:p-8 flex flex-col lg:flex-row gap-8 items-center justify-between card-lift min-h-[280px]">
            <div className="flex-1 w-full">
              <div className="w-12 h-12 rounded-xl bg-on-surface/20 flex items-center justify-center mb-6 text-primary-fixed-dim shadow-sm">
                <span className="material-symbols-outlined text-[28px]">social_leaderboard</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-primary mb-3 text-2xl">Grand Tests &amp; Analytics</h3>
              <p className="font-body-md text-body-md text-inverse-primary/80 leading-relaxed">Measure your true competency. Comprehensive assessments that mirror real technical interviews, backed by deep performance analytics.</p>
            </div>
            <div className="flex-1 w-full bg-on-surface/5 rounded-xl p-4 border border-on-surface/10 backdrop-blur-md">
              {/* Mock Chart */}
              <div className="flex items-end justify-between h-[120px] pb-2 border-b border-on-surface/25">
                <div className="w-8 bg-surface-dim/20 rounded-t-md h-[30%] transition-all duration-500 hover:h-[40%]"></div>
                <div className="w-8 bg-surface-dim/30 rounded-t-md h-[50%] transition-all duration-500 hover:h-[60%]"></div>
                <div className="w-8 bg-surface-dim/40 rounded-t-md h-[40%] transition-all duration-500 hover:h-[50%]"></div>
                <div className="w-8 bg-surface-dim/50 rounded-t-md h-[70%] transition-all duration-500 hover:h-[80%]"></div>
                <div className="w-8 bg-primary/80 rounded-t-md h-[95%] transition-all duration-500 hover:h-[100%] shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
              </div>
              <div className="flex justify-between mt-3 font-label-sm text-[10px] text-inverse-primary/60 uppercase font-semibold tracking-wider">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
