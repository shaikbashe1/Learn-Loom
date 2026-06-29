import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getProfile } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  Bot, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword]   = useState(false);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending]         = useState(false);
  
  const { signInWithEmail, signInWithGoogle, resendVerificationEmail } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const getRedirect = (role?: string) =>
    role === 'admin' ? '/admin' : from === '/login' || from === '/' ? '/dashboard' : from;

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
    setUnverifiedEmail('');
    setLoading(true);
    const { error, userId } = await signInWithEmail(email, password);
    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setUnverifiedEmail(email);
      } else {
        toast.error('Sign in failed', { description: 'Invalid email or password. Please try again.' });
      }
      return;
    }
    const profile = userId ? await getProfile(userId) : null;
    setLoading(false);
    navigate(getRedirect(profile?.role), { replace: true });
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    const { error } = await resendVerificationEmail(unverifiedEmail);
    setResending(false);
    if (error) {
      toast.error('Failed to resend', { description: error.message });
    } else {
      toast.success('Verification email sent!', { description: `Check your inbox at ${unverifiedEmail}` });
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chart-4/5 blur-[120px] pointer-events-none z-0" />

      <div className="w-full max-w-[1100px] min-h-[700px] flex rounded-3xl overflow-hidden shadow-2xl bg-card border border-border relative z-10">
        
        {/* Left Panel: Brand Expression (Hidden on Mobile) */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-secondary to-background relative flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-border">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
          
          {/* Animated decorative circles */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-[0.03] pointer-events-none">
            <svg className="absolute w-[800px] h-[800px] -top-64 -left-64 animate-[spin_120s_linear_infinite]" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeDasharray="2 4" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeDasharray="1 3" strokeWidth="0.5" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            {/* Header */}
            <div>
              <Link to="/" className="flex items-center gap-3 mb-8 hover:opacity-90 w-fit group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-md shadow-primary/20">
                  <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-6 h-6 object-contain" />
                </div>
                <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                  LearnLoom
                </span>
              </Link>
              <h2 className="font-display text-3xl font-bold text-foreground leading-tight tracking-tight max-w-md">
                Empolyees & Students excel with AI learning paths.
              </h2>
              <p className="font-body-md text-muted-foreground mt-4 max-w-sm leading-relaxed">
                Unlock personalized learning curricula designed to fast-track your career growth.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-4 my-auto">
              <div className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm hover:border-primary/20 transition-all duration-300">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <h3 className="font-headline-md text-sm text-foreground font-bold">Master New Skills</h3>
                </div>
                <p className="font-body-sm text-xs text-muted-foreground leading-relaxed">
                  Join professionals accelerating their careers through our adaptive, interactive curriculum.
                </p>
              </div>

              <div className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm hover:border-chart-4/20 transition-all duration-300">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-chart-4/10 text-chart-4 flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <h3 className="font-headline-md text-sm text-foreground font-bold">AI-Powered Guidance</h3>
                </div>
                <p className="font-body-sm text-xs text-muted-foreground leading-relaxed">
                  Receive real-time feedback, coding assistance, and dynamic reviews tailored to your style.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium">
              <span>&copy; {new Date().getFullYear()} LearnLoom AI</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" /> Enterprise Grade</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Login Interface */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 bg-card relative">
          
          {/* Mobile Brand Header */}
          <div className="lg:hidden mb-8 flex flex-col items-center gap-2">
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-5 h-5 object-contain" />
              </div>
              <span className="font-display text-xl font-bold text-foreground tracking-tight">LearnLoom</span>
            </Link>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Welcome back</h2>
              <p className="font-body-md text-muted-foreground text-sm">Please enter your details to sign in.</p>
            </div>

            {unverifiedEmail && (
              <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-label-md text-xs text-destructive mb-1 font-bold">Email not verified</p>
                  <p className="font-body-sm text-xs text-muted-foreground mb-3 leading-relaxed">
                    Please verify your email before signing in. Check your inbox or click below to resend.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => void handleResend()} 
                    disabled={resending} 
                    className="font-label-sm text-xs text-destructive hover:underline flex items-center gap-1.5 min-h-[32px]"
                  >
                    {resending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Resend verification email
                  </button>
                </div>
              </div>
            )}

            {/* Google Sign-In */}
            <button
              onClick={() => void handleGoogleLogin()}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-border/80 transition-all duration-200 group disabled:opacity-50 min-h-[44px] mb-6 shadow-sm font-semibold"
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

            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              {/* Dummy inputs to prevent aggressive autofill */}
              <input type="email" style={{ display: 'none' }} name="fake_email" />
              <input type="password" style={{ display: 'none' }} name="fake_password" />

              <div>
                <label className="block text-xs font-bold text-foreground mb-2" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground/60 min-h-[44px]" 
                    id="email" 
                    placeholder="name@company.com" 
                    required 
                    type="email"
                    value={email}
                    autoComplete="new-password"
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-foreground" htmlFor="password">
                    Password
                  </label>
                  <Link 
                    className="text-xs text-primary hover:text-primary/80 font-bold transition-colors" 
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
                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground/60 min-h-[44px]" 
                    id="password" 
                    placeholder="Enter your password" 
                    required 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="new-password"
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
              </div>

              <button
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] shadow-md shadow-primary/10 mt-6"
                type="submit"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Trust Badge */}
            <div className="mt-8 flex items-center justify-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-[11px] font-medium">Secured with enterprise-grade encryption</span>
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Don't have an account?{' '}
              <Link className="text-primary hover:underline font-bold" to="/signup">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
