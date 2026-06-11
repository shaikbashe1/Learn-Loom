import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl text-white font-bold">404</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3 text-balance">Page Not Found</h1>
      <p className="text-muted-foreground text-sm max-w-xs text-pretty mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          Go to Dashboard
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Back to Home
        </Link>
      </div>
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
        © {new Date().getFullYear()} LearnLoom. All rights reserved.
      </p>
    </div>
  );
}

