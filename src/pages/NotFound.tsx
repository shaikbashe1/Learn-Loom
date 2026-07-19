import { Link } from "react-router-dom";
import { MoveLeft, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-chart-4/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <HelpCircle className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-4xl font-extrabold text-foreground mb-3 tracking-tight">404</h1>
        <h2 className="text-xl font-bold text-foreground mb-4">Page not found</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8 leading-relaxed">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-xs font-semibold hover:brightness-110 transition-all shadow-md"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted text-foreground px-6 py-2.5 text-xs font-semibold transition-all shadow-sm gap-2"
          >
            <MoveLeft size={14} />
            Back to Home
          </Link>
        </div>
      </div>
      
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} Quovexi. All rights reserved.
      </p>
    </div>
  );
}
