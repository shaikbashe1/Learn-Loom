import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, RefreshCw, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth, getProfile } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

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
    // On success the browser redirects to Google — loading stays true intentionally
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
    <div className="min-h-screen bg-background flex">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-secondary flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-chart-4/15 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-chart-1/10 rounded-full blur-2xl" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 text-center max-w-xs">
          {/* Logo */}
          <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-7 shadow-xl glow-blue">
            <Zap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">LearnLoom</h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-10 text-pretty">
            AI-powered personalized education for the next generation of tech professionals.
          </p>

          {/* Feature bullets */}
          <div className="space-y-4 text-left">
            {[
              { text: '50,000+ active learners worldwide',     icon: Sparkles },
              { text: '200+ expert-curated courses',           icon: CheckCircle },
              { text: 'AI mentor available 24/7',              icon: Zap },
              { text: 'QR-verified industry certificates',     icon: CheckCircle },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/25 flex items-center justify-center shrink-0">
                  <f.icon className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-slate-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">LearnLoom</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-foreground text-balance">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1.5">Sign in to continue your learning journey</p>
          </div>

          {/* Unverified email banner */}
          {unverifiedEmail && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Email not verified</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 text-pretty">
                    Please verify your email before signing in. Check your inbox or resend the link.
                  </p>
                  <button type="button" onClick={handleResend} disabled={resending}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-60">
                    {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Resend verification email
                  </button>
                </div>
              </div>
            </div>
          )}

          <Card className="bg-card border-border shadow-lg">
            <CardContent className="p-6 space-y-4">

              {/* Google button */}
              <Button type="button" variant="ghost" onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full h-11 border border-border bg-background text-foreground hover:bg-muted font-semibold shadow-sm gap-2">
                {googleLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <GoogleLogo />}
                <span>Continue with Google</span>
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or continue with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email + password */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-normal text-foreground">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com"
                      className="pl-10 bg-background border-border text-foreground"
                      value={email} onChange={e => setEmail(e.target.value)}
                      required autoComplete="email" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-normal text-foreground">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 bg-background border-border text-foreground"
                      value={password} onChange={e => setPassword(e.target.value)}
                      required autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading || googleLoading}
                  className="w-full bg-gradient-primary text-white hover:opacity-90 h-11 font-semibold shadow-md glow-blue">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign In
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link to="/signup" className="text-primary hover:underline font-semibold">Sign up free</Link>
                </p>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-5">
            By signing in you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
