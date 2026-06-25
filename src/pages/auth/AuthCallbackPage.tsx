import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for error in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error_description') || hashParams.get('error');
    const hasToken = hashParams.has('access_token');
    
    // Also check query params for server-side errors and auth codes
    const queryParams = new URLSearchParams(window.location.search);
    const queryError = queryParams.get('error_description') || queryParams.get('error');
    const hasCode = queryParams.has('code');

    if (error || queryError) {
      toast.error('Authentication failed', { description: decodeURIComponent(error || queryError || 'Unknown error') });
      navigate('/login', { replace: true });
      return;
    }

    if (!loading) {
      if (user) {
        // Direct admin users to the Admin dashboard, standard users to the student dashboard
        const isAdmin = user.email === 'shaikbashe2222@gmail.com';
        navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
      } else if (!hasCode && !hasToken) {
        // If we finished loading, have no user, and no active OAuth token exchange parameters exist, fallback to login
        navigate('/login', { replace: true });
      }
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    // Safety timeout: if login session doesn't exchange within 10 seconds, redirect back to login
    const timeout = setTimeout(() => {
      if (!user) {
        toast.error('Authentication timeout', { description: 'The authentication process took too long. Please try signing in again.' });
        navigate('/login', { replace: true });
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [user, navigate]);

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary-container/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-[pulse_10s_ease-in-out_infinite_alternate]"></div>
        <div className="absolute top-[40%] right-[10%] w-80 h-80 bg-secondary-container/30 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-[pulse_12s_ease-in-out_infinite_alternate_reverse]"></div>
        <div className="absolute bottom-[10%] left-[30%] w-[30rem] h-[30rem] bg-tertiary-container/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      <div className="glass-panel rounded-[24px] p-stack-xl flex flex-col items-center justify-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-sm w-full z-10">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full filter blur-xl animate-pulse"></div>
          <div className="relative w-20 h-20 bg-surface rounded-full flex items-center justify-center border-2 border-primary shadow-[0_0_20px_rgba(0,74,198,0.3)]">
             <span className="material-symbols-outlined text-[40px] text-primary animate-spin" style={{ animationDuration: '3s' }}>
                sync
             </span>
          </div>
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Authenticating...</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Please wait while we verify your session.</p>
      </div>
    </div>
  );
}
