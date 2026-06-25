import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full py-12 px-4 sm:px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-6 bg-background border-t border-border-base text-primary">
      {/* Logo Branding */}
      <div className="flex items-center gap-2 font-label-md text-label-md font-bold text-on-surface">
        <img src="/images/logo/logo-icon.png" alt="LearnLoom Logo" className="w-6 h-6 object-contain" />
        <span>LearnLoom</span>
      </div>
      
      {/* Links - touch-friendly targets */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <Link className="font-body-sm text-body-sm text-text-secondary hover:text-primary hover:underline transition-all cursor-pointer min-h-[44px] px-3 flex items-center" to="/privacy">Privacy Policy</Link>
        <Link className="font-body-sm text-body-sm text-text-secondary hover:text-primary hover:underline transition-all cursor-pointer min-h-[44px] px-3 flex items-center" to="/terms">Terms of Service</Link>
        <Link className="font-body-sm text-body-sm text-text-secondary hover:text-primary hover:underline transition-all cursor-pointer min-h-[44px] px-3 flex items-center" to="/help">Help Center</Link>
        <Link className="font-body-sm text-body-sm text-text-secondary hover:text-primary hover:underline transition-all cursor-pointer min-h-[44px] px-3 flex items-center" to="/contact">Contact Us</Link>
      </div>
      
      {/* Copyright */}
      <div className="font-body-sm text-body-sm text-text-secondary text-center md:text-right">
        © {new Date().getFullYear()} LearnLoom AI. Empowering the future of education.
      </div>
    </footer>
  );
}
