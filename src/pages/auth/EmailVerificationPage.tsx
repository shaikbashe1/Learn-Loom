import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  MailCheck, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get('email') ?? '';
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { resendVerificationEmail } = useAuth();

  // Countdown timer for resending
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown(c => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (!emailFromQuery) {
      toast.info('Please go back to the sign-up page and try again.');
      return;
    }
    if (countdown > 0) {
      toast.warning(`Please wait ${countdown} seconds before requesting a new link.`);
      return;
    }

    setResending(true);
    try {
      const { error } = await resendVerificationEmail(emailFromQuery);
      setResending(false);
      if (error) {
        toast.error('Failed to resend link', { description: error.message });
      } else {
        toast.success('Verification email resent!', { description: `Check your inbox at ${emailFromQuery}` });
        setCountdown(60); // Start 60-second cooldown
      }
    } catch (err) {
      setResending(false);
      toast.error('Network failure', { description: 'Please check your connection and try again.' });
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chart-4/5 blur-[120px] pointer-events-none z-0" />

      <main className="relative z-10 w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 no-underline group mb-3" aria-label="Go to Homepage">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-md shadow-primary/20 group-hover:brightness-110 transition-all">
              <img src="/images/logo/logo-icon-light.png" alt="Quovexi Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-display text-xl font-extrabold text-foreground tracking-tight">
              Quovexi
            </span>
          </Link>
          <p className="text-xs text-muted-foreground font-semibold">
            Engineer your potential with AI-driven learning.
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col items-center text-center">
          
          {/* Icon Area */}
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 border border-primary/20">
            <MailCheck className="h-6 w-6" />
          </div>

          <h1 className="text-lg font-bold text-foreground mb-2">
            Verify Your Email
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed font-semibold">
            We&apos;ve sent a verification link to{' '}
            {emailFromQuery ? (
              <span className="font-bold text-foreground">{emailFromQuery}</span>
            ) : (
              'your email address'
            )}
            . Please click the link to activate your account.
          </p>

          <div className="flex flex-col gap-3 w-full mb-6">
            <Button
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="w-full h-11 bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-1.5 rounded-xl text-xs focus:outline-none shadow-md shadow-primary/10"
            >
              {resending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : countdown > 0 ? (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Resend in {countdown}s</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Resend Verification Link</span>
                </>
              )}
            </Button>
            
            <Link 
              to="/login" 
              className="w-full h-11 bg-background border border-border text-foreground font-bold hover:bg-muted/50 flex items-center justify-center gap-1.5 rounded-xl text-xs focus:outline-none transition-colors shadow-sm"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          <p className="text-center text-[11px] font-semibold text-muted-foreground">
            Wrong email?{' '}
            <Link to="/signup" className="text-primary hover:underline font-bold focus:outline-none">Sign up again</Link>
          </p>

          {/* Trust Badge */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-muted-foreground border-t border-border pt-6 w-full">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-semibold">Secured with enterprise-grade encryption</span>
          </div>
        </div>
      </main>
    </div>
  );
}
export { EmailVerificationPage };
