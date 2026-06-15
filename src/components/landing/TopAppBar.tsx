import { Link } from 'react-router-dom';

export function TopAppBar() {
  return (
    <header className="bg-background/80 backdrop-blur-md fixed top-0 w-full z-50 border-b border-outline-variant/30 shadow-[0_0_20px_rgba(128,131,255,0.1)]">
      <div className="flex justify-between items-center px-gutter py-md max-w-[1440px] mx-auto">
        <div className="font-headline-md text-headline-md font-bold text-primary tracking-tight">LearnLoom</div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-lg font-label-md text-label-md">
          <Link className="text-primary border-b-2 border-primary pb-1" to="/courses">Curriculum</Link>
          <a className="text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 px-sm py-xs rounded" href="#features">Features</a>
          <a className="text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 px-sm py-xs rounded" href="#enterprise">Enterprise</a>
          <Link className="text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 px-sm py-xs rounded" to="/pricing">Pricing</Link>
        </nav>
        
        <div className="hidden md:flex items-center space-x-md font-label-md text-label-md">
          <Link className="text-on-surface-variant hover:text-primary transition-colors" to="/login">Sign In</Link>
          <Link className="bg-primary text-on-primary px-lg py-sm rounded hover:scale-95 duration-100 font-bold shadow-[0_0_8px_rgba(192,193,255,0.5)]" to="/signup">
            Get Started
          </Link>
        </div>
        
        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-primary">
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      </div>
    </header>
  );
}
