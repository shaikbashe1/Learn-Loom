import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to send reset link', { description: error.message });
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="bg-background text-text-primary min-h-screen flex flex-col font-body-md overflow-x-hidden relative">
      {/* Ambient Background Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-surface-container-high/40 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-surface-variant/30 blur-[100px] pointer-events-none z-0"></div>
      
      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center relative z-10 px-margin-desktop py-stack-xl">
        {/* Glassmorphism Card */}
        <div className="w-full max-w-[480px] bg-surface/70 backdrop-blur-xl border border-border-base/50 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-stack-lg flex flex-col items-center">
          
          {submitted ? (
            <div className="text-center w-full">
              <div className="flex items-center justify-center mb-stack-md">
                <span className="material-symbols-outlined text-[48px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  mark_email_read
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-text-primary mb-stack-sm tracking-tight">Check your email</h1>
              <p className="font-body-md text-body-md text-text-secondary px-stack-md mb-stack-md">
                We sent a reset link to <span className="text-text-primary font-medium">{email}</span>.
              </p>
              <div className="space-y-stack-md w-full mt-stack-md">
                <p className="font-label-sm text-label-sm text-text-secondary">
                  Didn't receive it? Check your spam folder or{' '}
                  <button type="button" onClick={() => setSubmitted(false)} className="text-primary hover:text-primary-container hover:underline transition-all font-semibold">
                    try again
                  </button>
                </p>
                <div className="w-full text-center border-t border-border-base/50 pt-stack-md">
                  <Link className="inline-flex items-center gap-2 font-label-md text-label-md text-text-secondary hover:text-primary transition-colors duration-200 group" to="/login">
                    <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform duration-200">arrow_back</span>
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Brand Logo / Header */}
              <div className="mb-stack-lg text-center w-full">
                <div className="flex items-center justify-center mb-stack-md">
                  <span className="material-symbols-outlined text-[48px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    lock_reset
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-text-primary mb-stack-sm tracking-tight">Forgot Password</h1>
                <p className="font-body-md text-body-md text-text-secondary px-stack-md">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="w-full space-y-stack-md">
                {/* Email Input */}
                <div className="flex flex-col space-y-stack-sm w-full">
                  <label className="font-label-md text-label-md text-text-primary text-left" htmlFor="email">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline">mail</span>
                    </div>
                    <input 
                      className="w-full pl-12 pr-4 py-4 bg-surface border border-border-base rounded-lg font-body-md text-body-md text-text-primary placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm" 
                      id="email" 
                      name="email" 
                      placeholder="you@example.com" 
                      required 
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <button disabled={loading} className="w-full bg-primary-container text-on-primary py-4 px-6 rounded-lg font-label-md text-label-md shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-[1px] transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none" type="submit">
                  {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : null}
                  Send Reset Link
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </form>

              {/* Back to Login Link */}
              <div className="mt-stack-lg w-full text-center border-t border-border-base/50 pt-stack-md">
                <Link className="inline-flex items-center gap-2 font-label-md text-label-md text-text-secondary hover:text-primary transition-colors duration-200 group" to="/login">
                  <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform duration-200">arrow_back</span>
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

