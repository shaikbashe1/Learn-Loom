import { Link } from 'react-router-dom';

export function HeroSection() {
  return (
    <section className="hero-gradient min-h-[921px] flex items-center relative py-stack-xl px-margin-mobile md:px-margin-desktop">
      <div className="hero-glow"></div>
      <div className="hero-glow-right"></div>
      <div className="max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-stack-lg items-center relative z-10">
        <div className="flex flex-col gap-stack-md max-w-[600px]">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-bright border border-border-base w-max mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Platform 2.0 Live</span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-text-primary text-balance">
            Learn Smarter with <span className="ai-gradient-text">AI Mentorship</span>
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary max-w-[500px]">
            Personalized learning paths, interactive coding practice, and instant feedback. Elevate your career growth with intelligent curriculum design.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-stack-sm">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-medium hover:bg-primary transition-all shadow-md hover:shadow-lg">
              Start Learning
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <Link to="/courses" className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-surface text-text-primary border border-border-base font-label-md text-label-md font-medium hover:bg-surface-container-low transition-all shadow-sm">
              Explore Courses
            </Link>
          </div>
          <div className="mt-stack-md flex items-center gap-4 text-text-secondary">
            <div className="flex -space-x-3">
              <img alt="Student avatar" className="w-10 h-10 rounded-full border-2 border-surface object-cover z-30" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbmnNddb3Kg2liKFnqlsFz-pqlUzjn-W_nicRMt_uHZhUCzbv-1u9X5IXP0QjGahoNVzMzHDVtEOpvOvGEkogkhUlg7fhYZl2LBOA9wvWnr_Uy2-0RMlKzXRcIDZT-rcg9Q643nkznUV_KbLgJ9aHyZsu4BcRHwUSDEpVx6GGCyPj6obfgTwziq4Gutd7h-A0bSHauRwY9d--kpBw_l82BdbT8AZQ7rCgbYSPUuq35vaYilT9e-vzvDxb5z_Cvbx9zexyoC2DITu-Q" />
              <img alt="Student avatar" className="w-10 h-10 rounded-full border-2 border-surface object-cover z-20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANx-UJtG-e85t-3X2oVwaJBlWZP0Sjob6Xn6WKOCZanzmPbB2VWydg1RpHlKgjC6n7RikK5iMXDcsSzMaUf5Hyst9ms2ra533Jm50s7sxzqZB28vUwCcBrvap7_yF0lXKGvNKAvUmJfU2DYxLb47DgE4OR4vyZLTdtFPJRWsSNhoVsN2OWplHpijtBCbBdAymSYbI8azyy0k7jxI-bb0We4iJNR9WJZxnkgesDkQzk9IDiCTRu0ZyzCtC18kK0ylq3AazypcEfBchi" />
              <img alt="Student avatar" className="w-10 h-10 rounded-full border-2 border-surface object-cover z-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXhxTxa4B-MHZ-LangbVH2Wa_E74DCNocgWuhlp5-Il5T4jN7Myxiv_8AM8wCxZFfubO6oOIlFy3eF07T9Ahr2ZLvbXxeDduHl5dkOj92_zroTvMga7lB6eXtelBN2tAPDBqZ_if8dgMjtrfH_Vjn8v9ZzCbjjDzfMjUigjc0VczZZXF-60JgpfGB_4NGUE_psCVwccZ8UFOi8e-BQ2KYw2ZV7dcoK7jbRhjm2GBtNkQOjho6cUbSIr6FiAIhF9YKqmgLhzH1wRlc4" />
            </div>
            <p className="font-body-sm text-body-sm">Join 10,000+ ambitious learners</p>
          </div>
        </div>
        <div className="relative w-full h-full min-h-[400px] flex items-center justify-center mt-stack-lg lg:mt-0">
          <div className="glass-panel rounded-3xl p-6 w-full max-w-[500px] relative z-20 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border-base pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container">neurology</span>
                </div>
                <div>
                  <h3 className="font-label-md text-label-md text-text-primary">AI Mentor Active</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">Analyzing progress...</p>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface border border-border-base shadow-sm">
                <p className="font-body-sm text-body-sm text-text-primary mb-2">You struggled with <span className="font-medium text-primary">Recursion</span> in the last test. Want me to generate a custom practice module?</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container-high text-primary font-label-sm text-label-sm hover:bg-primary-fixed transition-colors">Generate Module</button>
                  <button className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary border border-border-base font-label-sm text-label-sm hover:bg-surface-container-lowest transition-colors">Remind me later</button>
                </div>
              </div>
              <div className="pt-2">
                <div className="flex justify-between font-label-sm text-label-sm mb-1 text-text-secondary">
                  <span>Python Mastery</span>
                  <span>78%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary w-[78%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-10 right-0 glass-panel rounded-xl p-3 flex items-center gap-2 z-30 shadow-lg animate-float">
            <span className="material-symbols-outlined text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <span className="font-label-sm text-label-sm text-text-primary">Certificate Earned</span>
          </div>
          <div className="absolute bottom-10 left-0 glass-panel rounded-xl p-3 flex items-center gap-2 z-10 shadow-lg animate-float" style={{ animationDirection: 'reverse' }}>
            <span className="material-symbols-outlined text-tertiary">code_blocks</span>
            <span className="font-label-sm text-label-sm text-text-primary">+150 XP Coding</span>
          </div>
        </div>
      </div>
    </section>
  );
}
