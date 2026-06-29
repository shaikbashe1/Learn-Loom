import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { 
  KeyRound, 
  MailCheck, 
  Mail, 
  ArrowLeft, 
  Send, 
  RefreshCw 
} from 'lucide-react';

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
      toast.success('Reset link sent!', { description: `Check your inbox at ${email}` });
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chart-4/5 blur-[120px] pointer-events-none z-0" />
      
      {/* Glassmorphism Card */}
      <div className="w-full max-w-[480px] bg-card/60 backdrop-blur-xl border border-border rounded-3xl shadow-2xl p-8 sm:p-10 flex flex-col items-center relative z-10">
        
        {submitted ? (
          <div className="text-center w-full">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 shadow-md shadow-primary/5">
              <MailCheck className="h-8 w-8" />
            </div>
            
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Check your email</h1>
            <p className="font-body-md text-sm text-muted-foreground mb-6 leading-relaxed">
              We sent a password reset link to <span className="text-foreground font-semibold">{email}</span>.
            </p>
            
            <div className="space-y-4 w-full">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Didn't receive it? Check your spam folder or{' '}
                <button 
                  type="button" 
                  onClick={() => setSubmitted(false)} 
                  className="text-primary hover:underline font-bold"
                >
                  try again
                </button>
              </p>
              
              <div className="w-full text-center border-t border-border pt-6">
                <Link 
                  className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group" 
                  to="/login"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Brand Logo / Header */}
            <div className="mb-6 text-center w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 shadow-md shadow-primary/5">
                <KeyRound className="h-8 w-8" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">Forgot Password</h1>
              <p className="font-body-md text-sm text-muted-foreground leading-relaxed">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-2" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input 
                    className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 min-h-[44px]" 
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
              <button 
                disabled={loading || !email} 
                className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-xl font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-primary/10 mt-6 min-h-[44px]" 
                type="submit"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send Reset Link <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login Link */}
            <div className="mt-6 w-full text-center border-t border-border pt-6">
              <Link 
                className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group" 
                to="/login"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
