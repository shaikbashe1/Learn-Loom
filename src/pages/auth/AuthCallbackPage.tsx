import { AuthenticateWithRedirectCallback, useUser } from '@clerk/clerk-react';
import { Loader2, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallbackPage() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center shadow-lg">
        <Zap className="w-7 h-7 text-white" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Signing you in…</h2>
        <p className="text-sm text-muted-foreground">Please wait while we verify your session.</p>
      </div>
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <div className="hidden">
        <AuthenticateWithRedirectCallback 
          signInForceRedirectUrl="/dashboard" 
          signUpForceRedirectUrl="/dashboard" 
        />
      </div>
    </div>
  );
}
