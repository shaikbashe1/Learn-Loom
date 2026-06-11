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
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      {/* Abstract Background */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(192,193,255,0.05)_0%,rgba(19,19,21,1)_70%)] -z-20 pointer-events-none"></div>
      
      {/* Nebula Blobs */}
      <div className="fixed rounded-full blur-[100px] opacity-30 -z-10 animate-[pulse_10s_ease-in-out_infinite_alternate]" style={{ top: '-10%', left: '20%', width: '40vw', height: '40vw', background: 'rgba(128, 131, 255, 0.15)' }}></div>
      <div className="fixed rounded-full blur-[100px] opacity-30 -z-10 animate-[pulse_12s_ease-in-out_infinite_alternate_reverse]" style={{ bottom: '-10%', right: '10%', width: '50vw', height: '50vw', background: 'rgba(221, 183, 255, 0.1)' }}></div>

      <main className="w-full max-w-md relative z-10 py-2xl">
        {/* Brand Header */}
        <div className="text-center mb-2xl">
          <h1 className="font-display text-display text-primary tracking-tight mb-sm">LearnLoom</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Engineer your potential.</p>
        </div>

        <div className="bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/60 rounded-xl p-xl sm:p-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative group transition-all duration-300 hover:border-outline-variant">
          {submitted ? (
            <div className="text-center py-sm space-y-md">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-md">
                <span className="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Check your email</h2>
              <p className="font-body-md text-body-md text-on-surface-variant text-pretty mb-xl">
                We sent a reset link to <span className="text-on-surface font-bold">{email}</span>.
              </p>
              
              <div className="space-y-md">
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">
                  Didn't receive it? Check your spam folder or{' '}
                  <button type="button" onClick={() => setSubmitted(false)} className="text-primary hover:text-primary-fixed hover:underline transition-all font-bold">
                    try again
                  </button>
                </p>
                <Link to="/login" className="block w-full bg-surface-container-high text-on-surface border border-outline-variant font-label-md text-label-md rounded-full py-md hover:bg-surface-bright transition-colors text-center">
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-xl text-center">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Reset your password</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-xl">
                {/* Email Field */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-sm" htmlFor="email">USER_IDENTIFIER</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-muted">mail</span>
                    <input 
                      id="email" 
                      type="email" 
                      required 
                      placeholder="developer@domain.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md pl-[3.5rem] pr-md font-body-md text-body-md placeholder:text-outline transition-all duration-200" 
                    />
                  </div>
                </div>

                {/* Primary Action */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary text-on-primary font-headline-md text-headline-md rounded-full py-md mt-sm hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center gap-sm"
                >
                  {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : null}
                  Send Reset Link
                </button>

                <div className="mt-md text-center">
                  <Link to="/login" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-xs">
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

