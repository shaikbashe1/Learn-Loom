import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '@/db/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';
import { 
  KeyRound, 
  MailCheck, 
  Mail, 
  ArrowLeft, 
  Send, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Validation States
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const validateEmail = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return 'Email address is required';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailTouched) setEmailError(validateEmail(val));
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      if (emailRef.current) emailRef.current.focus();
      return;
    }

    setLoading(true);
    try {
      let error: Error | null = null;
      try {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      } catch (err) {
        error = err as Error;
      }
      setLoading(false);
      // Security Requirement: Always show success to prevent email enumeration
      setSubmitted(true);
      if (error) {
        // Log error silently, but do not leak to the user to maintain security
        console.error('Reset password request error:', error.message);
      }
      toast.success('Request received', { description: "If an account exists, we've sent a password reset email." });
    } catch (err) {
      setLoading(false);
      // Always show success to user
      setSubmitted(true);
      toast.success('Request received', { description: "If an account exists, we've sent a password reset email." });
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chart-4/5 blur-[120px] pointer-events-none z-0" />
      
      {/* Centered Card */}
      <div className="w-full max-w-[440px] bg-card border border-border rounded-3xl shadow-xl p-6 sm:p-8 flex flex-col items-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {submitted ? (
          <div className="text-center w-full">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 border border-primary/20">
              <MailCheck className="h-6 w-6" />
            </div>
            
            <h1 className="text-base font-bold text-foreground mb-1">Check your email</h1>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed font-semibold">
              If an account exists, we&apos;ve sent a password reset email. Please check your inbox.
            </p>
            
            <div className="space-y-4 w-full">
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Didn't receive it? Check your spam folder or{' '}
                <button 
                  type="button" 
                  onClick={() => setSubmitted(false)} 
                  className="text-primary hover:underline font-bold focus:outline-none"
                >
                  try again
                </button>
              </p>
              
              <div className="w-full text-center border-t border-border pt-6">
                <Link 
                  className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1" 
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
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5 border border-primary/20">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-lg font-bold text-foreground mb-1">Forgot Password</h1>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input 
                    ref={emailRef}
                    className={`w-full pl-11 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:outline-none transition-all duration-200 text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[42px] font-semibold ${
                      emailTouched && emailError 
                        ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' 
                        : 'border-border focus:ring-primary/20 focus:border-primary'
                    }`} 
                    id="email" 
                    name="email" 
                    placeholder="name@company.com" 
                    required 
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    aria-invalid={!!emailError}
                  />
                </div>
                {emailTouched && emailError && (
                  <p className="text-destructive text-[10px] font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {emailError}
                  </p>
                )}
              </div>

              {/* Action Button */}
              <Button 
                disabled={loading || !email || !!emailError} 
                className="w-full h-11 bg-primary text-primary-foreground py-3 px-6 rounded-xl font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex justify-center items-center gap-2 shadow-md shadow-primary/10 mt-6 focus:outline-none" 
                type="submit"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Sending email...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Back to Login Link */}
            <div className="mt-6 w-full text-center border-t border-border pt-6">
              <Link 
                className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1" 
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
