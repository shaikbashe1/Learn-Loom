import { Link } from 'react-router-dom';

export function HeroSection() {
  return (
    <section className="hero-gradient min-h-screen md:min-h-[850px] flex items-center relative py-12 px-4 sm:px-6 md:px-10 overflow-hidden">
      <div className="hero-glow"></div>
      <div className="hero-glow-right"></div>
      <div className="max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left text column */}
        <div className="flex flex-col gap-6 max-w-[600px] animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-bright border border-border-base w-max mb-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">Platform 2.0 Live</span>
          </div>
          <h1 className="font-display text-4xl xs:text-5xl md:text-6xl font-extrabold text-text-primary text-balance leading-[1.1] tracking-tight">
            Learn Smarter with <span className="ai-gradient-text">AI Mentorship</span>
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary max-w-[500px] leading-relaxed">
            Personalized learning paths, interactive coding practice, and instant feedback. Elevate your career growth with intelligent curriculum design.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-medium hover:bg-primary transition-all shadow-md hover:shadow-lg active:scale-95">
              Start Learning
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <Link to="/courses" className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-surface text-text-primary border border-border-base font-label-md text-label-md font-medium hover:bg-surface-container-low transition-all shadow-sm active:scale-95">
              Explore Courses
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-4 text-text-secondary">
            <div className="flex -space-x-3">
              <img alt="Student avatar" className="w-10 h-10 rounded-full border-2 border-surface object-cover z-30" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbmnNddb3Kg2liKFnqlsFz-pqlUzjn-W_nicRMt_uHZhUCzbv-1u9X5IXP0QjGahoNVzMzHDVtEOpvOvGEkogkhUlg7fhYZl2LBOA9wvWnr_Uy2-0RMlKzXRcIDZT-rcg9Q643nkznUV_KbLgJ9aHyZsu4BcRHwUSDEpVx6GGCyPj6obfgTwziq4Gutd7h-A0bSHauRwY9d--kpBw_l82BdbT8AZQ7rCgbYSPUuq35vaYilT9e-vzvDxb5z_Cvbx9zexyoC2DITu-Q" />
              <img alt="Student avatar" className="w-10 h-10 rounded-full border-2 border-surface object-cover z-20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANx-UJtG-e85t-3X2oVwaJBlWZP0Sjob6Xn6WKOCZanzmPbB2VWydg1RpHlKgjC6n7RikK5iMXDcsSzMaUf5Hyst9ms2ra533Jm50s7sxzqZB28vUwCcBrvap7_yF0lXKGvNKAvUmJfU2DYxLb47DgE4OR4vyZLTdtFPJRWsSNhoVsN2OWplHpijtBCbBdAymSYbI8azyy0k7jxI-bb0We4iJNR9WJZxnkgesDkQzk9IDiCTRu0ZyzCtC18kK0ylq3AazypcEfBchi" />
              <img alt="Student avatar" className="w-10 h-10 rounded-full border-2 border-surface object-cover z-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXhxTxa4B-MHZ-LangbVH2Wa_E74DCNocgWuhlp5-Il5T4jN7Myxiv_8AM8wCxZFfubO6oOIlFy3eF07T9Ahr2ZLvbXxeDduHl5dkOj92_zroTvMga7lB6eXtelBN2tAPDBqZ_if8dgMjtrfH_Vjn8v9ZzCbjjDzfMjUigjc0VczZZXF-60JgpfGB_4NGUE_psCVwccZ8UFOi8e-BQ2KYw2ZV7dcoK7jbRhjm2GBtNkQOjho6cUbSIr6FiAIhF9YKqmgLhzH1wRlc4" />
            </div>
            <p className="font-body-sm text-body-sm font-medium">Join 10,000+ ambitious learners</p>
          </div>
        </div>

        {/* Right showcase column */}
        <div className="relative w-full h-full min-h-[350px] sm:min-h-[400px] flex items-center justify-center mt-8 lg:mt-0 animate-slide-up">
          <div className="glass-panel rounded-3xl p-6 w-full max-w-[480px] relative z-20 shadow-2xl border border-white/40">
            <div className="flex items-center justify-between border-b border-border-base pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-on-secondary-container">neurology</span>
                </div>
                <div>
                  <h3 className="font-label-md text-label-md text-text-primary font-semibold">AI Mentor Active</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">Analyzing progress...</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface border border-border-base shadow-sm hover:border-primary/30 transition-colors">
                <p className="font-body-sm text-body-sm text-text-primary mb-2.5 leading-relaxed">
                  You struggled with <span className="font-medium text-primary">Recursion</span> in the last test. Want me to generate a custom practice module?
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button className="px-3.5 py-2 rounded-lg bg-surface-container-high text-primary font-label-sm text-label-sm hover:bg-primary-fixed transition-colors font-semibold">Generate Module</button>
                  <button className="px-3.5 py-2 rounded-lg bg-surface text-text-secondary border border-border-base font-label-sm text-label-sm hover:bg-surface-container-lowest transition-colors font-medium">Remind me later</button>
                </div>
              </div>
              <div className="pt-2">
                <div className="flex justify-between font-label-sm text-label-sm mb-1.5 text-text-secondary font-medium">
                  <span>Python Mastery</span>
                  <span>78%</span>
                </div>
                <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary w-[78%] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.2)]"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating badges - Hidden on mobile, shown on larger screens */}
          <div className="absolute top-6 -right-4 glass-panel rounded-xl p-3.5 flex items-center gap-2.5 z-30 shadow-xl border border-white/50 animate-float hidden sm:flex">
            <span className="material-symbols-outlined text-warning text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <span className="font-label-sm text-label-sm text-text-primary font-semibold">Certificate Earned</span>
          </div>
          <div className="absolute bottom-6 -left-4 glass-panel rounded-xl p-3.5 flex items-center gap-2.5 z-10 shadow-xl border border-white/50 animate-float hidden sm:flex" style={{ animationDirection: 'reverse' }}>
            <span className="material-symbols-outlined text-tertiary text-lg">code_blocks</span>
            <span className="font-label-sm text-label-sm text-text-primary font-semibold">+150 XP Coding</span>
          </div>
        </div>

      </div>
    </section>
  );
}
