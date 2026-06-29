import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

export function TopAppBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 sm:px-6 md:px-10 py-4 backdrop-blur-md border-b border-border-base transition-all duration-300 ${scrolled ? 'shadow-md bg-surface/90' : 'shadow-sm bg-surface/70'}`} id="main-nav">
      
      {/* Left branding */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/images/logo/logo-icon.png" alt="LearnLoom Logo" className="w-8 h-8 object-contain" />
        <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">LearnLoom</span>
      </div>

      {/* Center Nav links (Desktop) */}
      <div className="hidden md:flex items-center gap-8">
        <Link className="font-body-md text-body-md text-text-secondary hover:text-primary transition-colors duration-200" to="/">Platform</Link>
        <Link className="font-body-md text-body-md text-text-secondary hover:text-primary transition-colors duration-200" to="/courses">Curriculum</Link>
        <Link className="font-body-md text-body-md text-text-secondary hover:text-primary transition-colors duration-200" to="/pricing">Pricing</Link>
        <Link className="font-body-md text-body-md text-text-secondary hover:text-primary transition-colors duration-200" to="/community">Resources</Link>
      </div>

      {/* Right actions (Desktop/Mobile) */}
      <div className="flex items-center gap-3">
        <Link className="hidden sm:inline-flex font-label-md text-label-md text-primary font-medium hover:opacity-80 transition-opacity px-3 py-2" to="/login">Sign In</Link>
        <Link className="inline-flex items-center justify-center px-4 sm:px-6 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-medium hover:bg-primary transition-colors shadow-sm cursor-pointer active:scale-95" to="/signup">
          Join for Free
        </Link>
        
        {/* Mobile Hamburger menu */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="text-on-surface-variant p-2 hover:bg-surface-variant/20 rounded-full flex items-center justify-center transition-colors min-w-[44px] min-h-[44px]">
                <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-[300px] bg-surface p-6 flex flex-col gap-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              
              <div className="flex items-center gap-2 mb-4">
                <img src="/images/logo/logo-icon.png" alt="LearnLoom Logo" className="w-8 h-8 object-contain" />
                <span className="font-headline-sm font-bold text-primary tracking-tight">LearnLoom</span>
              </div>
              
              <div className="flex flex-col gap-4">
                <Link onClick={() => setMobileMenuOpen(false)} className="font-body-lg text-body-lg text-text-primary hover:text-primary py-2 border-b border-border/50" to="/">Platform</Link>
                <Link onClick={() => setMobileMenuOpen(false)} className="font-body-lg text-body-lg text-text-primary hover:text-primary py-2 border-b border-border/50" to="/courses">Curriculum</Link>
                <Link onClick={() => setMobileMenuOpen(false)} className="font-body-lg text-body-lg text-text-primary hover:text-primary py-2 border-b border-border/50" to="/pricing">Pricing</Link>
                <Link onClick={() => setMobileMenuOpen(false)} className="font-body-lg text-body-lg text-text-primary hover:text-primary py-2 border-b border-border/50" to="/community">Resources</Link>
              </div>
              
              <div className="mt-auto flex flex-col gap-3">
                <Link onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 rounded-full border border-primary text-primary font-medium" to="/login">
                  Sign In
                </Link>
                <Link onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 rounded-full bg-primary text-on-primary font-medium" to="/signup">
                  Join for Free
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
