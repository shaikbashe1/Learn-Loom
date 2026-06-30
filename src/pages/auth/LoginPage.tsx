import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getProfile } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Validation States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  
  // Caps Lock State
  const [capsLockActive, setCapsLockActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  const { signInWithEmail, signInWithGoogle, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const getRedirect = (role?: string) =>
    role === 'admin' ? '/admin' : from === '/login' || from === '/' ? '/dashboard' : from;

  // Handle Caps Lock
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  // Live Email Validation
  const validateEmail = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'Email address is required';
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Live Password Validation
  const validatePassword = (val: string) => {
    if (!val) {
      return 'Password is required';
    }
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailTouched) {
      setEmailError(validateEmail(val));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordTouched) {
      setPasswordError(validatePassword(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));
  };

  const isFormValid = !validateEmail(email) && !validatePassword(password);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast.error('Google sign-in failed', { description: error.message });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);

    if (eErr || pErr) {
      setEmailError(eErr);
      setPasswordError(pErr);
      // Focus first invalid field
      if (eErr && emailRef.current) {
        emailRef.current.focus();
      } else if (pErr && passwordRef.current) {
        passwordRef.current.focus();
      }
      return;
    }

    setUnverifiedEmail('');
    setLoading(true);

    // Normalize email: trim and lowercase
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error, userId } = await signInWithEmail(normalizedEmail, password);
      if (error) {
        setLoading(false);
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setUnverifiedEmail(normalizedEmail);
          toast.error('Email not verified', { description: 'Please verify your email to log in.' });
        } else {
          // Security: Never reveal if email exists
          toast.error('Sign in failed', { description: 'Invalid email or password.' });
        }
        return;
      }
      const profile = userId ? await getProfile(userId) : null;
      setLoading(false);
      toast.success('Welcome back!', { description: 'Successfully signed in.' });
      navigate(getRedirect(profile?.role), { replace: true });
    } catch (err) {
      setLoading(false);
      toast.error('Network failure', { description: 'Please check your connection and try again.' });
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    const { error } = await resendVerificationEmail(unverifiedEmail);
    setResending(false);
    if (error) {
      toast.error('Failed to resend link', { description: error.message });
    } else {
      toast.success('Verification email sent!', { description: `Check your inbox at ${unverifiedEmail}` });
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Premium Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-chart-4/5 blur-[80px] pointer-events-none z-0" />

      <main className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 no-underline group mb-3" aria-label="Go to Homepage">
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

        {/* Login Card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-1">Welcome back</h2>
            <p className="text-xs text-muted-foreground font-semibold">Please enter your details to sign in.</p>
          </div>

          {unverifiedEmail && (
            <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3 items-start" role="alert">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-destructive mb-1">Email not verified</p>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed font-semibold">
                  Please verify your email before signing in. Check your inbox or click below to resend.
                </p>
                <button 
                  type="button" 
                  onClick={() => void handleResend()} 
                  disabled={resending} 
                  className="text-xs text-destructive hover:underline flex items-center gap-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-destructive/30 rounded"
                >
                  {resending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>Resend verification email</span>
                </button>
              </div>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            onClick={() => void handleGoogleLogin()}
            disabled={googleLoading || loading}
            aria-label="Continue with Google"
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-border/80 transition-all duration-200 group disabled:opacity-50 min-h-[44px] mb-5 shadow-sm font-bold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
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

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" noValidate>
            {/* Dummy inputs to prevent aggressive autofill */}
            <input type="email" style={{ display: 'none' }} name="fake_email" />
            <input type="password" style={{ display: 'none' }} name="fake_password" />

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
                  type="email" 
                  placeholder="name@company.com" 
                  required 
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
              </div>
              {emailTouched && emailError && (
                <p id="email-error" className="text-destructive text-[11px] font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-foreground" htmlFor="password">
                  Password
                </label>
                <Link 
                  className="text-xs text-primary hover:underline font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1" 
                  to="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input 
                  ref={passwordRef}
                  className={`w-full pl-11 pr-11 py-2.5 rounded-xl border bg-background focus:ring-2 focus:outline-none transition-all duration-200 text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[42px] font-semibold ${
                    passwordTouched && passwordError 
                      ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' 
                      : 'border-border focus:ring-primary/20 focus:border-primary'
                  }`} 
                  id="password" 
                  name="password"
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Enter your password" 
                  required 
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors min-w-[40px] justify-center focus:outline-none focus:ring-2 focus:ring-primary/20 rounded" 
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordTouched && passwordError && (
                <p id="password-error" className="text-destructive text-[11px] font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {passwordError}
                </p>
              )}
              {capsLockActive && (
                <p className="text-amber-500 text-[10px] font-bold mt-1">
                  ⚠️ Caps Lock is ON
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="pt-1.5">
              <label className="flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="form-checkbox h-4.5 w-4.5 text-primary border-border rounded focus:ring-primary/20 transition-colors accent-primary focus:outline-none focus:ring-2"
                />
                <span className="ml-2.5 text-xs text-muted-foreground font-semibold">Remember me</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full h-11 bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 mt-6 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
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
            Don't have an account?{' '}
            <Link className="text-primary hover:underline font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1" to="/signup">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
