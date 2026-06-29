import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

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
    <nav className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 sm:px-6 md:px-10 py-4 backdrop-blur-md border-b transition-all duration-300 ${
      scrolled 
        ? 'shadow-md border-border/80 bg-card/80' 
        : 'border-border/40 bg-background/50'
    }`} id="main-nav">
      
      {/* Left branding */}
      <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-md shadow-primary/10 group-hover:scale-105 transition-transform">
          <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-5 h-5 object-contain" />
        </div>
        <span className="font-display text-lg font-bold text-foreground tracking-tight">LearnLoom</span>
      </div>

      {/* Center Nav links (Desktop) */}
      <div className="hidden md:flex items-center gap-8">
        <Link className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200" to="/">Platform</Link>
        <Link className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200" to="/courses">Curriculum</Link>
        <Link className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200" to="/pricing">Pricing</Link>
        <Link className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200" to="/community">Resources</Link>
      </div>

      {/* Right actions (Desktop/Mobile) */}
      <div className="flex items-center gap-3">
        <Link className="hidden sm:inline-flex text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-2" to="/login">
          Sign In
        </Link>
        <Link className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-primary/10" to="/signup">
          Join for Free
        </Link>
        
        {/* Mobile Hamburger menu */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="text-muted-foreground p-2 hover:bg-muted rounded-xl flex items-center justify-center transition-colors min-w-[40px] min-h-[40px]">
                <Menu className="h-5 w-5 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-[300px] bg-card border-l border-border p-6 flex flex-col gap-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                  <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-5 h-5 object-contain" />
                </div>
                <span className="font-display text-lg font-bold text-foreground tracking-tight">LearnLoom</span>
              </div>
              
              <div className="flex flex-col gap-2">
                <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-foreground hover:text-primary py-3 border-b border-border/50" to="/">Platform</Link>
                <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-foreground hover:text-primary py-3 border-b border-border/50" to="/courses">Curriculum</Link>
                <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-foreground hover:text-primary py-3 border-b border-border/50" to="/pricing">Pricing</Link>
                <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-foreground hover:text-primary py-3 border-b border-border/50" to="/community">Resources</Link>
              </div>
              
              <div className="mt-auto flex flex-col gap-3">
                <Link onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 rounded-xl border border-border text-foreground font-bold hover:bg-muted/50 transition-colors" to="/login">
                  Sign In
                </Link>
                <Link onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 transition-all shadow-md shadow-primary/10" to="/signup">
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
