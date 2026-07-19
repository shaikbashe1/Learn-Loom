import { 
  Map, 
  Terminal, 
  MessageSquare, 
  BarChart3 
} from 'lucide-react';

export function FeatureGrid() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 md:px-10 bg-card border-t border-border select-none">
      <div className="max-w-container-max mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-16 max-w-[700px] mx-auto animate-fade-in">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
            An ecosystem built for mastery
          </h2>
          <p className="font-body-md text-muted-foreground leading-relaxed">
            Ditch the passive video lectures. Quovexi combines active coding environments with AI guidance to ensure concept retention.
          </p>
        </div>
        
        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1: Large Span */}
          <div className="md:col-span-2 rounded-3xl bg-background border border-border p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-primary/20 hover:shadow-lg transition-all duration-300 min-h-[280px]">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Map className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">Dynamic AI Roadmaps</h3>
              <p className="font-body-md text-sm text-muted-foreground max-w-md leading-relaxed">
                Your path evolves as you learn. Skip what you know, focus deeply on what you don't. The AI recalculates your trajectory daily.
              </p>
            </div>
            {/* Background SVG wave */}
            <div className="absolute right-0 bottom-0 w-1/2 h-[80%] opacity-10 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none">
              <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDEwMCBDIDUwIDEwMCwgNTAgMCwgMTAwIDAiIHN0cm9rZT0iIzI1NjNlYiIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9zdmc+')] bg-no-repeat bg-right-bottom" />
            </div>
          </div>
          
          {/* Feature 2 */}
          <div className="rounded-3xl bg-background border border-border p-6 sm:p-8 flex flex-col justify-between hover:border-primary/20 hover:shadow-lg transition-all duration-300 relative overflow-hidden min-h-[280px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Terminal className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">In-Browser IDE</h3>
              <p className="font-body-md text-sm text-muted-foreground leading-relaxed">
                Write, run, and debug code directly in the platform. No local configuration required.
              </p>
            </div>
          </div>
          
          {/* Feature 3 */}
          <div className="rounded-3xl bg-background border border-border p-6 sm:p-8 flex flex-col justify-between hover:border-primary/20 hover:shadow-lg transition-all duration-300 min-h-[280px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">24/7 AI Mentor</h3>
              <p className="font-body-md text-sm text-muted-foreground leading-relaxed">
                Stuck on a bug? Ask the AI mentor for hints without revealing the exact solution.
              </p>
            </div>
          </div>
          
          {/* Feature 4: Large Span */}
          <div className="md:col-span-2 rounded-3xl bg-secondary text-secondary-foreground p-6 sm:p-8 flex flex-col lg:flex-row gap-8 items-center justify-between hover:shadow-xl transition-all duration-300 min-h-[280px]">
            <div className="flex-1 w-full">
              <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary-foreground flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">Grand Tests &amp; Analytics</h3>
              <p className="font-body-md text-sm text-slate-300 leading-relaxed">
                Measure your true competency. Comprehensive assessments that mirror real technical interviews, backed by deep performance analytics.
              </p>
            </div>
            
            {/* Mock Chart */}
            <div className="flex-1 w-full bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
              <div className="flex items-end justify-between h-[120px] pb-2 border-b border-white/20">
                <div className="w-8 bg-white/10 rounded-t-md h-[30%] transition-all duration-300 hover:h-[40%]" />
                <div className="w-8 bg-white/20 rounded-t-md h-[50%] transition-all duration-300 hover:h-[60%]" />
                <div className="w-8 bg-white/10 rounded-t-md h-[40%] transition-all duration-300 hover:h-[50%]" />
                <div className="w-8 bg-white/30 rounded-t-md h-[70%] transition-all duration-300 hover:h-[80%]" />
                <div className="w-8 bg-primary rounded-t-md h-[95%] transition-all duration-300 hover:h-[100%] shadow-[0_0_12px_rgba(37,99,235,0.5)]" />
              </div>
              <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
