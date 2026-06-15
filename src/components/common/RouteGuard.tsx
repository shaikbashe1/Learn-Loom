import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps { children: React.ReactNode; }

const STATIC_PUBLIC = [
  '/', '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/profile-setup', '/auth/callback', '/pricing',
  '/403', '/404',
];

const PUBLIC_PREFIXES = ['/verify/'];

function isPublicPath(pathname: string): boolean {
  if (STATIC_PUBLIC.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const isPublic = isPublicPath(location.pathname);
    const isAuthPage = ['/login', '/signup'].includes(location.pathname);

    const isAdminUser = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'org_admin';

    if (user && isAuthPage) {
      navigate(isAdminUser ? '/admin' : '/dashboard', { replace: true });
      return;
    }

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    if (user && location.pathname.startsWith('/admin') && !isAdminUser) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [user, profile, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading Auth State...</p>
          <div className="text-xs text-muted-foreground mt-4 font-mono whitespace-pre bg-secondary/50 p-4 rounded-xl text-left border border-border">
            {JSON.stringify({ 
              pathname: location.pathname, 
              ...useAuth().debug
            }, null, 2)}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
