import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, MailCheck, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

/**
 * EmailVerificationPage — shown after email signup.
 * Accepts optional ?email= query param so we can pre-fill the resend address.
 * Supabase sends a "magic link" style confirmation email; user clicks to activate.
 */
export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get('email') ?? '';
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!emailFromQuery) {
      toast.info('Please go back to the sign-up page and try again.');
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: emailFromQuery });
    setResending(false);
    if (error) {
      toast.error('Failed to resend', { description: error.message });
    } else {
      toast.success('Verification email resent!', { description: `Check your inbox at ${emailFromQuery}` });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">LearnLoom</span>
        </div>

        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground text-balance">Check your inbox</h2>
          <p className="text-muted-foreground text-sm mt-2 text-pretty">
            We've sent a verification link to{' '}
            {emailFromQuery
              ? <span className="font-semibold text-foreground">{emailFromQuery}</span>
              : 'your email address'}.
            {' '}Please click the link to activate your account.
          </p>
        </div>

        <Card className="bg-card border-border shadow-md">
          <CardContent className="p-6 space-y-4">
            <p className="text-xs text-muted-foreground text-center text-pretty">
              The link expires in 24 hours. Didn't receive it? Check your spam folder or resend below.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={resending}
              className="w-full h-10 font-medium border-border"
            >
              {resending
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <RefreshCw className="w-4 h-4 mr-2" />}
              Resend verification email
            </Button>

            <Link to="/login">
              <Button className="w-full bg-secondary text-white hover:bg-secondary/90 h-10 font-medium">
                Back to Sign In
              </Button>
            </Link>

            <p className="text-center text-xs text-muted-foreground">
              Wrong email?{' '}
              <Link to="/signup" className="text-primary hover:underline">Sign up again</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

