import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRight, 
  Brain, 
  Clock, 
  MailCheck,
  Sparkles
} from 'lucide-react';

/* ─── Password strength helper ─── */
function getPasswordStrength(pw: string): { label: string; percent: number; color: string; textColor: string } {
  if (!pw) return { label: '', percent: 0, color: '', textColor: '' };
  const hasMix = /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);
  if (pw.length >= 12 && hasMix) return { label: 'Strong Password', percent: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500' };
  if (pw.length >= 8 && hasMix)  return { label: 'Good Password',   percent: 75,  color: 'bg-blue-500', textColor: 'text-blue-500' };
  if (pw.length >= 6)            return { label: 'Fair Password',   percent: 50,  color: 'bg-amber-500', textColor: 'text-amber-500' };
  return                                { label: 'Weak Password',   percent: 25,  color: 'bg-destructive', textColor: 'text-destructive' };
}

export default function SignupPage() {
  const [showPassword, setShowPassword]     = useState(false);
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [agreed, setAgreed]                 = useState(false);
  const [loading, setLoading]               = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [resending, setResending]           = useState(false);
  const [stage, setStage]                   = useState<'form' | 'verify-sent'>('form');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const { signUpWithEmail, signInWithGoogle, resendVerificationEmail, verifyEmailCode } = useAuth();
  const navigate = useNavigate();

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast.error('Google sign-in failed', { description: error.message });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { 
      toast.error('Terms of Service', { description: 'Please agree to the Terms of Service and Privacy Policy to continue.' }); 
      return; 
    }
    if (password.length < 6) { 
      toast.error('Password too short', { description: 'Password must be at least 6 characters.' }); 
      return; 
    }

    setLoading(true);
    const { error, needsVerification } = await signUpWithEmail(email, password, name);
    setLoading(false);

    if (error) {
      if (error.message === 'User already exists') {
        toast.error('Account already exists!', { description: 'Please log in instead.' });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error('Sign up failed', { description: error.message });
      }
      return;
    }

    if (needsVerification) {
      setSubmittedEmail(email);
      setStage('verify-sent');
    } else {
      toast.success('Account created! Welcome to LearnLoom.');
      navigate('/dashboard', { replace: true });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await verifyEmailCode(submittedEmail, verificationCode);
    setLoading(false);
    if (error) {
      toast.error('Verification failed', { description: error.message });
    } else {
      toast.success('Account verified!');
      navigate('/dashboard', { replace: true });
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setResending(true);
    const { error } = await resendVerificationEmail(submittedEmail);
    setResending(false);
    if (error) {
      toast.error('Failed to resend', { description: error.message });
    } else {
      toast.success('Verification email resent!', { description: `Check ${submittedEmail}` });
    }
  };

  return (
    <div className="flex min-h-screen bg-background p-4 sm:p-6 items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chart-4/5 blur-[120px] pointer-events-none z-0" />

      <div className="w-full max-w-[1100px] min-h-[700px] flex rounded-3xl overflow-hidden shadow-2xl bg-card border border-border relative z-10">

        {/* ═══════════ LEFT BRAND PANEL ═══════════ */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-secondary to-background relative overflow-hidden flex-col justify-between p-12 xl:p-16 border-r border-border">
          {/* Subtle pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />

          {/* Decorative rotating elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-[0.03] pointer-events-none">
            <svg className="absolute w-[800px] h-[800px] -top-64 -left-64 animate-[spin_120s_linear_infinite]" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeDasharray="2 4" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeDasharray="1 3" strokeWidth="0.5" />
            </svg>
          </div>

          {/* Brand Header */}
          <div className="relative z-10">
            <Link className="flex items-center gap-3 no-underline w-fit group" to="/">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-md shadow-primary/20">
                <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-display text-2xl font-extrabold text-foreground tracking-tight">LearnLoom</span>
            </Link>
          </div>

          {/* Value Proposition */}
          <div className="relative z-10 flex flex-col gap-6 my-auto">
            <h1 className="font-display text-3xl font-bold text-foreground leading-tight tracking-tight max-w-md">
              Accelerate your learning with AI.
            </h1>
            <p className="font-body-md text-muted-foreground max-w-sm leading-relaxed">
              Join professionals upskilling with personalized, adaptive learning paths designed for the modern workplace.
            </p>

            {/* Features list */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm hover:border-primary/20 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Brain className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">Adaptive Paths</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">AI analyzes your pace and adapts content in real-time.</p>
              </div>
              <div className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm hover:border-chart-4/20 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-chart-4/10 text-chart-4 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">Learn Faster</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Micro-learning modules and concise summaries.</p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="relative z-10 mt-6 bg-card/40 backdrop-blur-md border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <img
              alt="Sarah J."
              className="w-10 h-10 rounded-full border border-border object-cover shrink-0"
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
            />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                &ldquo;LearnLoom cut my upskilling time in half. The AI mentor is game-changing.&rdquo;
              </p>
              <p className="text-[10px] font-bold text-foreground mt-1">Sarah J. — Data Scientist</p>
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT SIGNUP PANEL ═══════════ */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-card relative">
          <div className="mx-auto w-full max-w-md">

            {/* Mobile brand header */}
            <div className="lg:hidden text-center mb-8 flex flex-col items-center gap-2">
              <Link to="/" className="flex items-center gap-2.5 no-underline">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                  <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-5 h-5 object-contain" />
                </div>
                <span className="font-display text-xl font-bold text-foreground tracking-tight">LearnLoom</span>
              </Link>
            </div>

            {/* ── VERIFY-SENT STAGE ── */}
            {stage === 'verify-sent' ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 shadow-md shadow-primary/5">
                  <MailCheck className="h-8 w-8" />
                </div>

                <h2 className="font-display text-2xl font-bold text-foreground mb-2">Check your inbox</h2>
                <p className="font-body-md text-sm text-muted-foreground mb-6 leading-relaxed">
                  We&apos;ve sent a verification code to{' '}
                  <span className="text-foreground font-semibold">{submittedEmail}</span>. Enter the 6-digit code below.
                </p>

                <form onSubmit={handleVerify} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    autoComplete="one-time-code"
                    className="w-full text-center tracking-[0.3em] text-2xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl py-3.5 font-bold transition-all duration-200 min-h-[44px] placeholder:opacity-30"
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length < 6}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 flex items-center justify-center min-h-[44px] shadow-md shadow-primary/10"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Verify Account'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    disabled={resending}
                    className="w-full font-bold text-xs text-primary hover:underline flex justify-center items-center gap-2 min-h-[44px] transition-all duration-200 mt-2"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${resending && 'animate-spin'}`} />
                    Resend verification code
                  </button>
                </form>
              </div>
            ) : (
              /* ── FORM STAGE ── */
              <>
                <div className="text-center lg:text-left mb-6">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Create your account
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                      className="text-primary hover:underline font-bold transition-colors min-h-[44px] inline-flex items-center"
                      to="/login"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>

                {/* Google signup button */}
                <button
                  onClick={() => void handleGoogleSignup()}
                  disabled={loading || googleLoading}
                  className="flex items-center justify-center w-full px-4 py-3 border border-border rounded-xl bg-card hover:bg-muted/50 hover:border-border/80 transition-all duration-200 disabled:opacity-50 group min-h-[44px] mb-6 shadow-sm font-semibold"
                >
                  {googleLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-3 text-muted-foreground" />
                  ) : (
                    <svg className="w-4 h-4 mr-3 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span className="text-sm text-foreground">Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center py-2 mb-6">
                  <div className="flex-grow border-t border-border" />
                  <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground font-medium">Or continue with email</span>
                  <div className="flex-grow border-t border-border" />
                </div>

                {/* Email signup form */}
                <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                  {/* Dummy inputs */}
                  <input type="email" style={{ display: 'none' }} name="fake_email" />
                  <input type="password" style={{ display: 'none' }} name="fake_password" />

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-2" htmlFor="name">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground/60 min-h-[44px]"
                        id="name"
                        placeholder="Jane Doe"
                        required
                        type="text"
                        value={name}
                        autoComplete="name"
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-2" htmlFor="email">
                      Work Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground/60 min-h-[44px]"
                        id="email"
                        placeholder="jane@company.com"
                        required
                        type="email"
                        value={email}
                        autoComplete="email"
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-2" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground/60 min-h-[44px]"
                        id="password"
                        placeholder="••••••••"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        autoComplete="new-password"
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors min-w-[40px] justify-center"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password strength meter */}
                    {password.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                            style={{ width: `${strength.percent}%` }}
                          />
                        </div>
                        <p className={`text-[10px] font-bold ${strength.textColor}`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Terms checkbox */}
                  <div className="flex items-start mt-4">
                    <input
                      className="h-4 w-4 mt-0.5 text-primary border-border rounded focus:ring-primary/20 cursor-pointer shrink-0"
                      id="terms"
                      required
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <label className="ml-2 block text-xs text-muted-foreground cursor-pointer select-none leading-snug" htmlFor="terms">
                      I agree to the{' '}
                      <Link className="text-primary hover:underline font-bold" to="/terms">Terms of Service</Link>
                      {' '}and{' '}
                      <Link className="text-primary hover:underline font-bold" to="/privacy">Privacy Policy</Link>
                    </label>
                  </div>

                  {/* Submit button */}
                  <button
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] shadow-md shadow-primary/10 mt-6"
                    type="submit"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Create Account <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Trust badge */}
                <div className="flex items-center justify-center gap-1.5 mt-5 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="text-[11px] font-medium">Secured with enterprise-grade encryption</span>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
