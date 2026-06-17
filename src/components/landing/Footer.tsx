import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full py-stack-lg px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4 bg-background border-t border-border-base text-primary">
      <div className="font-label-md text-label-md font-bold text-on-surface">
        LearnLoom
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <Link className="font-body-sm text-body-sm text-text-secondary hover:text-primary hover:underline transition-all cursor-pointer" to="/privacy">Privacy Policy</Link>
        <Link className="font-body-sm text-body-sm text-text-secondary hover:text-primary hover:underline transition-all cursor-pointer" to="/terms">Terms of Service</Link>
        <Link className="font-body-sm text-body-sm text-text-secondary hover:text-primary hover:underline transition-all cursor-pointer" to="/help">Help Center</Link>
        <Link className="font-body-sm text-body-sm text-text-secondary hover:text-primary hover:underline transition-all cursor-pointer" to="/contact">Contact Us</Link>
      </div>
      <div className="font-body-sm text-body-sm text-text-secondary text-center md:text-right">
        © {new Date().getFullYear()} LearnLoom AI. Empowering the future of education.
      </div>
    </footer>
  );
}
