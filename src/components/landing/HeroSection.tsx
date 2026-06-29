import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Brain, 
  Award, 
  Code, 
  Sparkles 
} from 'lucide-react';

export function HeroSection() {
  return (
    <section className="hero-gradient min-h-screen md:min-h-[800px] flex items-center relative py-12 px-4 sm:px-6 md:px-10 overflow-hidden select-none">
      {/* Glow overlays */}
      <div className="hero-glow" />
      <div className="hero-glow-right" />
      
      <div className="max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left text column */}
        <div className="flex flex-col gap-6 max-w-[600px] animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border w-max mb-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-primary uppercase tracking-wider font-extrabold">Platform 2.0 Live</span>
          </div>
          
          <h1 className="font-display text-4xl xs:text-5xl md:text-6xl font-extrabold text-foreground text-balance leading-[1.1] tracking-tight">
            Learn Smarter with <span className="ai-gradient-text">AI Mentorship</span>
          </h1>
          
          <p className="font-body-md text-muted-foreground max-w-[500px] leading-relaxed">
            Personalized learning paths, interactive coding practice, and instant feedback. Elevate your career growth with intelligent curriculum design.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-primary/10">
              Start Learning
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/courses" className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-card text-foreground border border-border font-bold hover:bg-muted/50 transition-all active:scale-[0.99] shadow-sm">
              Explore Courses
            </Link>
          </div>
          
          <div className="mt-4 flex items-center gap-4 text-muted-foreground">
            <div className="flex -space-x-3">
              <img alt="Student avatar" className="w-9 h-9 rounded-full border-2 border-card object-cover z-30" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face" />
              <img alt="Student avatar" className="w-9 h-9 rounded-full border-2 border-card object-cover z-20" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" />
              <img alt="Student avatar" className="w-9 h-9 rounded-full border-2 border-card object-cover z-10" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face" />
            </div>
            <p className="font-body-sm text-xs font-semibold">Join 10,000+ ambitious learners</p>
          </div>
        </div>

        {/* Right showcase column */}
        <div className="relative w-full h-full min-h-[350px] sm:min-h-[400px] flex items-center justify-center mt-8 lg:mt-0 animate-slide-up">
          
          {/* Glassmorphism Showcase Card */}
          <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 w-full max-w-[460px] relative z-20 shadow-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm text-foreground font-bold">AI Mentor Active</h3>
                  <p className="text-[11px] text-muted-foreground">Analyzing progress...</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-background border border-border shadow-sm hover:border-primary/20 transition-colors duration-300">
                <p className="text-xs text-foreground mb-3 leading-relaxed">
                  You struggled with <span className="font-bold text-primary">Recursion</span> in the last test. Want me to generate a custom practice module?
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button className="px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold">
                    Generate Module
                  </button>
                  <button className="px-3.5 py-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold">
                    Remind me later
                  </button>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1.5 text-muted-foreground font-semibold">
                  <span>Python Mastery</span>
                  <span>78%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-chart-4 w-[78%] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.2)]" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating badges */}
          <div className="absolute top-6 -right-4 bg-card/90 backdrop-blur-md rounded-2xl p-3.5 flex items-center gap-2.5 z-30 shadow-xl border border-border animate-float hidden sm:flex">
            <Award className="h-5 w-5 text-amber-500 fill-amber-500/10" />
            <span className="text-xs text-foreground font-bold">Certificate Earned</span>
          </div>
          
          <div className="absolute bottom-6 -left-4 bg-card/90 backdrop-blur-md rounded-2xl p-3.5 flex items-center gap-2.5 z-10 shadow-xl border border-border animate-float hidden sm:flex" style={{ animationDirection: 'reverse' }}>
            <Code className="h-5 w-5 text-primary" />
            <span className="text-xs text-foreground font-bold">+150 XP Coding</span>
          </div>
        </div>

      </div>
    </section>
  );
}
