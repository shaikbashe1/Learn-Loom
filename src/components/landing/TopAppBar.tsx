import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function TopAppBar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 backdrop-blur-md border-b border-border-base transition-all duration-300 ${scrolled ? 'shadow-md bg-surface/90' : 'shadow-sm bg-surface/70'}`} id="main-nav">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/images/logo/logo-icon.svg" alt="LearnLoom Logo" className="w-8 h-8 object-contain" />
        <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">LearnLoom</span>
      </div>
      <div className="hidden md:flex items-center gap-8">
        <Link className="font-body-md text-body-md text-text-secondary hover:text-primary transition-colors duration-200" to="/">Platform</Link>
        <Link className="font-body-md text-body-md text-text-secondary hover:text-primary transition-colors duration-200" to="/courses">Curriculum</Link>
        <Link className="font-body-md text-body-md text-text-secondary hover:text-primary transition-colors duration-200" to="/pricing">Pricing</Link>
        <Link className="font-body-md text-body-md text-text-secondary hover:text-primary transition-colors duration-200" to="/community">Resources</Link>
      </div>
      <div className="flex items-center gap-4">
        <Link className="hidden sm:inline-flex font-label-md text-label-md text-primary font-medium hover:opacity-80 transition-opacity" to="/login">Sign In</Link>
        <Link className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-medium hover:bg-primary transition-colors shadow-sm cursor-pointer active:opacity-80" to="/signup">
          Join for Free
        </Link>
      </div>
    </nav>
  );
}
