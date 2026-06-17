import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary-container/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-[pulse_10s_ease-in-out_infinite_alternate]"></div>
        <div className="absolute top-[40%] right-[10%] w-80 h-80 bg-secondary-container/30 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-[pulse_12s_ease-in-out_infinite_alternate_reverse]"></div>
        <div className="absolute bottom-[10%] left-[30%] w-[30rem] h-[30rem] bg-tertiary-container/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      <main className="relative z-10 w-full max-w-2xl px-margin-mobile md:px-0 py-2xl">
        <div className="glass-panel rounded-[24px] p-stack-xl flex flex-col items-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Icon Area */}
          <div className="relative mb-stack-lg">
            <div className="absolute inset-0 bg-primary/20 rounded-full filter blur-xl animate-pulse"></div>
            <div className="relative w-32 h-32 bg-surface rounded-full flex items-center justify-center border-2 border-primary shadow-[0_0_40px_rgba(0,74,198,0.4)]">
              <span className="material-symbols-outlined text-[64px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                mark_email_unread
              </span>
              <span className="material-symbols-outlined absolute -top-4 -right-4 text-secondary text-3xl animate-bounce">mark_email_read</span>
            </div>
          </div>

          <h1 className="font-display-lg text-display-lg mb-stack-md text-transparent bg-clip-text bg-gradient-to-r from-primary via-tertiary to-secondary">
            Check Your Inbox
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto mb-stack-xl text-pretty">
            We've sent a verification link to{' '}
            {emailFromQuery
              ? <span className="font-semibold text-primary">{emailFromQuery}</span>
              : 'your email address'}.
            {' '}Please click the link to activate your account.
          </p>

          <div className="flex flex-col sm:flex-row gap-stack-md w-full justify-center mb-stack-lg">
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] disabled:opacity-70 disabled:pointer-events-none"
            >
              {resending ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <span className="material-symbols-outlined mr-2">refresh</span>}
              Resend Link
            </button>
            <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-surface border-2 border-outline-variant/60 text-on-surface font-label-md text-label-md hover:border-outline-variant hover:bg-surface-container-low transition-all">
              Back to Sign In
              <span className="material-symbols-outlined ml-2 text-on-surface-variant">arrow_forward</span>
            </Link>
          </div>

          <p className="text-center text-label-sm font-label-sm text-on-surface-variant">
            Wrong email?{' '}
            <Link to="/signup" className="text-primary hover:underline">Sign up again</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

