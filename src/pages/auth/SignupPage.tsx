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
  MailCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="bg-background min-h-screen flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-chart-4/5 blur-[80px] pointer-events-none z-0" />

      <main className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 no-underline group mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-md shadow-primary/20 group-hover:brightness-110 transition-all">
              <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-display text-xl font-extrabold text-foreground tracking-tight">
              LearnLoom
            </span>
          </Link>
          <p className="text-xs text-muted-foreground font-semibold">
            Engineer your potential with AI-driven learning.
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          
          {stage === 'verify-sent' ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 shadow-sm border border-primary/20">
                <MailCheck className="h-6 w-6" />
              </div>

              <h2 className="text-base font-bold text-foreground mb-1">Check your inbox</h2>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed font-semibold">
                We&apos;ve sent a verification code to{' '}
                <span className="text-foreground font-bold">{submittedEmail}</span>. Enter the 6-digit code below.
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
                  className="w-full text-center tracking-[0.3em] text-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl py-3 font-bold transition-all duration-200 min-h-[44px] placeholder:opacity-30"
                />
                
                <Button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="w-full h-11 bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 flex items-center justify-center rounded-xl text-xs"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Verify Account'
                  )}
                </Button>
                
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resending}
                  className="w-full font-bold text-xs text-primary hover:underline flex justify-center items-center gap-2 min-h-[44px] transition-all duration-200 mt-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resending && 'animate-spin'}`} />
                  <span>Resend verification code</span>
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground mb-1">Create an account</h2>
                <p className="text-xs text-muted-foreground font-semibold">Get started with your learning journey.</p>
              </div>

              {/* Google Sign-Up */}
              <button
                onClick={() => void handleGoogleSignup()}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-border/80 transition-all duration-200 group disabled:opacity-50 min-h-[44px] mb-5 shadow-sm font-bold text-xs"
              >
                {googleLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2.5 text-muted-foreground" />
                ) : (
                  <svg className="w-4 h-4 mr-2.5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                <span className="text-foreground">Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center py-2 mb-5">
                <div className="flex-grow border-t border-border" />
                <span className="flex-shrink-0 mx-4 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  Or continue with email
                </span>
                <div className="flex-grow border-t border-border" />
              </div>

              <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                {/* Dummy inputs to prevent aggressive autofill */}
                <input type="email" style={{ display: 'none' }} name="fake_email" />
                <input type="password" style={{ display: 'none' }} name="fake_password" />

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground" htmlFor="name">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <input 
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[42px] font-semibold" 
                      id="name" 
                      placeholder="John Doe" 
                      required 
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input 
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[42px] font-semibold" 
                      id="email" 
                      placeholder="name@company.com" 
                      required 
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input 
                      className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[42px] font-semibold" 
                      id="password" 
                      placeholder="••••••••" 
                      required 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors min-w-[40px] justify-center" 
                      type="button"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {password && (
                    <div className="pt-1.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-muted-foreground">Password Strength</span>
                        <span className={strength.textColor}>{strength.label}</span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden border border-border/20">
                        <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.percent}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <label className="flex items-start cursor-pointer">
                    <input 
                      className="form-checkbox h-4.5 w-4.5 text-primary border-border rounded focus:ring-primary/20 transition-colors mt-0.5 accent-primary" 
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      required
                    />
                    <span className="ml-2.5 text-[11px] text-muted-foreground leading-normal font-semibold">
                      I agree to the{' '}
                      <Link className="text-primary hover:underline font-bold" to="/terms">Terms of Service</Link>
                      {' '}and{' '}
                      <Link className="text-primary hover:underline font-bold" to="/privacy">Privacy Policy</Link>.
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 mt-6 rounded-xl text-xs"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Get Started</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Trust Badge */}
              <div className="mt-6 flex items-center justify-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-[11px] font-semibold">Secured with enterprise-grade encryption</span>
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground font-semibold">
                Already have an account?{' '}
                <Link className="text-primary hover:underline font-bold" to="/login">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
export { SignupPage };
