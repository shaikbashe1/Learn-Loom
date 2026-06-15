import { Link } from 'react-router-dom';

export function HeroSection() {
  return (
    <section className="relative px-gutter py-2xl lg:py-[120px] max-w-[1440px] mx-auto overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
        {/* Hero Content */}
        <div className="space-y-lg z-10">
          <div className="inline-flex items-center px-sm py-xs rounded-full bg-surface-container-high border border-outline-variant/60 font-label-sm text-label-sm text-primary mb-sm">
            <span className="material-symbols-outlined text-[16px] mr-xs" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
            LearnLoom v2.0 is Live
          </div>
          <h1 className="font-display text-display text-on-surface">Master the <span className="text-primary">Deep End</span> of Tech.</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[600px]">
            Engineered for high-performance learners. Elevate your engineering skills with interactive environments, expert-led curriculum, and AI-driven insights. Stop tutorial hunting. Start building.
          </p>
          <div className="flex flex-col sm:flex-row gap-md pt-md">
            <Link to="/signup" className="bg-primary text-on-primary font-label-md text-label-md font-bold px-xl py-md rounded-lg shadow-[0_0_16px_rgba(192,193,255,0.4)] hover:shadow-[0_0_24px_rgba(192,193,255,0.6)] transition-all flex items-center justify-center">
              Get Started
              <span className="material-symbols-outlined ml-sm text-[20px]">arrow_forward</span>
            </Link>
            <button className="bg-surface-container-high text-on-surface border border-outline-variant/60 font-label-md text-label-md px-xl py-md rounded-lg hover:bg-surface-container-highest transition-all flex items-center justify-center">
              <span className="material-symbols-outlined mr-sm text-[20px]">play_circle</span>
              Watch Demo
            </button>
          </div>
        </div>
        
        {/* Hero Interactive Preview */}
        <div className="relative w-full aspect-[4/3] lg:aspect-square max-h-[500px] rounded-xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden shadow-2xl z-10 group cursor-default">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          {/* Faux Mac Header */}
          <div className="h-8 bg-surface-container flex items-center px-md border-b border-outline-variant/30 gap-xs">
            <div className="w-3 h-3 rounded-full bg-error"></div>
            <div className="w-3 h-3 rounded-full bg-tertiary-container"></div>
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <div className="ml-auto font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[14px]">terminal</span> bash
            </div>
          </div>
          <div className="p-md font-label-md text-label-md font-mono text-on-surface-variant overflow-hidden h-[calc(100%-2rem)] flex flex-col relative">
            <div className="mb-sm"><span className="text-primary">user@learnloom</span>:~$ npm run dev</div>
            <div className="mb-sm text-secondary">&gt; learnloom-kernel@2.0.4 dev</div>
            <div className="mb-sm text-secondary">&gt; starting local environment...</div>
            <div className="mt-md text-tertiary">Compiling advanced_concurrency.rs [===================&gt;] 100%</div>
            <div className="mt-sm text-on-surface">Successfully compiled in 0.42s</div>
            
            {/* Floating snippet */}
            <div className="absolute bottom-md right-md bg-surface-container-high border border-outline-variant/60 rounded-lg p-sm shadow-lg max-w-[200px]">
              <div className="text-label-sm font-label-sm text-primary mb-xs flex justify-between"><span>Status</span> <span>Active</span></div>
              <div className="h-1 bg-surface-container-lowest rounded-full overflow-hidden">
                <div className="h-full bg-primary w-3/4 shadow-[0_0_8px_rgba(192,193,255,0.8)]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
