import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full py-12 px-4 sm:px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-6 bg-card border-t border-border text-foreground select-none">
      {/* Logo Branding */}
      <div className="flex items-center gap-2.5 font-display text-sm font-bold">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
          <img src="/images/logo/logo-icon-light.png" alt="Quovexi Logo" className="w-4 h-4 object-contain" />
        </div>
        <span>Quovexi</span>
      </div>
      
      {/* Links */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <Link className="text-xs text-muted-foreground hover:text-primary transition-all min-h-[40px] px-3 flex items-center" to="/privacy">Privacy Policy</Link>
        <Link className="text-xs text-muted-foreground hover:text-primary transition-all min-h-[40px] px-3 flex items-center" to="/terms">Terms of Service</Link>
        <Link className="text-xs text-muted-foreground hover:text-primary transition-all min-h-[40px] px-3 flex items-center" to="/help">Help Center</Link>
        <Link className="text-xs text-muted-foreground hover:text-primary transition-all min-h-[40px] px-3 flex items-center" to="/contact">Contact Us</Link>
      </div>
      
      {/* Copyright */}
      <div className="text-xs text-muted-foreground text-center md:text-right">
        © {new Date().getFullYear()} Quovexi AI. Empowering the future of education.
      </div>
    </footer>
  );
}
