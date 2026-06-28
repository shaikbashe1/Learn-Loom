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

    // Strict RBAC: Only shaikbashe2222@gmail.com has Admin Dashboard access
    const isAdminUser = user?.email === 'shaikbashe2222@gmail.com' && profile?.role === 'super_admin';

    // First-time onboarding: a logged-in, non-admin user whose profile exists
    // but isn't completed is forced through the wizard before anything else.
    const needsOnboarding =
      !!user && !!profile && !profile.onboarding_completed && !isAdminUser;
    const onOnboarding = location.pathname === '/onboarding';

    if (user && isAuthPage) {
      navigate(needsOnboarding ? '/onboarding' : (isAdminUser ? '/admin' : '/dashboard'), { replace: true });
      return;
    }

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    // Block all app pages until onboarding is finished.
    if (needsOnboarding && !onOnboarding) {
      navigate('/onboarding', { replace: true });
      return;
    }

    // Don't let a completed user sit on the wizard.
    if (user && onOnboarding && profile?.onboarding_completed) {
      navigate(isAdminUser ? '/admin' : '/dashboard', { replace: true });
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--chart-4))] flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
