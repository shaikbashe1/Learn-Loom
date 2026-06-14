import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for error in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error_description') || hashParams.get('error');
    
    // Also check query params for server-side errors
    const queryParams = new URLSearchParams(window.location.search);
    const queryError = queryParams.get('error_description') || queryParams.get('error');

    if (error || queryError) {
      toast.error('Authentication failed', { description: decodeURIComponent(error || queryError || 'Unknown error') });
      navigate('/login', { replace: true });
      return;
    }

    if (!loading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        // If we finished loading but no user, fallback to login
        navigate('/login', { replace: true });
      }
    }
  }, [loading, user, navigate]);

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
    </div>
  );
}
