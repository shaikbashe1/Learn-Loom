import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Eye, EyeOff, Mail, Lock, User, Loader2, MailCheck, RefreshCw, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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

export default function SignupPage() {
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed]                 = useState(false);
  const [loading, setLoading]               = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [resending, setResending]           = useState(false);
  const [stage, setStage]                   = useState<'form' | 'verify-sent'>('form');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { signUpWithEmail, signInWithGoogle, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast.error('Google sign-in failed', { description: error.message });
    }
    // On success browser redirects — loading stays intentionally
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { toast.error('Please agree to the Terms of Service and Privacy Policy'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    const { error, needsVerification } = await signUpWithEmail(email, password, name);
    setLoading(false);
    if (error) { toast.error('Sign up failed', { description: error.message }); return; }
    if (needsVerification) {
      setSubmittedEmail(email);
      setStage('verify-sent');
    } else {
      toast.success('Account created! Welcome to LearnLoom.');
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
    <div className="min-h-screen bg-background flex">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-secondary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-chart-4/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-32 h-32 bg-chart-1/10 rounded-full blur-2xl" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 text-center max-w-xs">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-7 shadow-xl glow-blue">
            <Zap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">LearnLoom</h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-10 text-pretty">
            Join 50,000+ learners building their future with AI-powered personalized education.
          </p>

          <div className="space-y-4 text-left">
            {[
              { text: 'AI mentor available 24/7',         icon: Sparkles },
              { text: 'Earn credits & verified certificates', icon: CheckCircle },
              { text: 'Daily coding challenges',          icon: Zap },
              { text: 'Personalized learning roadmaps',   icon: CheckCircle },
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
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">LearnLoom</span>
          </div>

          {stage === 'verify-sent' ? (
            /* ── Email verification pending ── */
            <>
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <MailCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-extrabold text-foreground text-balance">Check your inbox</h2>
                <p className="text-muted-foreground text-sm mt-2 text-pretty leading-relaxed">
                  We&apos;ve sent a verification link to{' '}
                  <span className="font-semibold text-foreground">{submittedEmail}</span>.
                  Click the link to activate your account.
                </p>
              </div>
              <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <p className="text-xs text-muted-foreground text-center text-pretty">
                    Didn&apos;t receive it? Check your spam folder or resend the email.
                  </p>
                  <Button type="button" variant="outline" onClick={handleResend} disabled={resending}
                    className="w-full h-10 font-medium border-border">
                    {resending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Resend verification email
                  </Button>
                  <Link to="/login">
                    <Button className="w-full bg-gradient-primary text-white hover:opacity-90 h-10 font-semibold">
                      Back to Sign In
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          ) : (
            /* ── Signup form ── */
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold text-foreground text-balance">Create your account</h2>
                <p className="text-muted-foreground text-sm mt-1.5">Start your learning journey today — it&apos;s free!</p>
              </div>

              <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-6 space-y-4">
                  {/* Google button */}
                  <Button type="button" variant="ghost" onClick={handleGoogleSignup}
                    disabled={googleLoading || loading}
                    className="w-full h-11 border border-border bg-background text-foreground hover:bg-muted font-semibold shadow-sm gap-2">
                    {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleLogo />}
                    <span>Continue with Google</span>
                  </Button>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or continue with email</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-sm font-normal text-foreground">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="name" type="text" placeholder="Alex Johnson"
                          className="pl-10 bg-background border-border text-foreground"
                          value={name} onChange={e => setName(e.target.value)} required />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-normal text-foreground">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="you@example.com"
                          className="pl-10 bg-background border-border text-foreground"
                          value={email} onChange={e => setEmail(e.target.value)} required />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm font-normal text-foreground">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" type={showPassword ? 'text' : 'password'}
                          placeholder="At least 6 characters"
                          className="pl-10 pr-10 bg-background border-border text-foreground"
                          value={password} onChange={e => setPassword(e.target.value)}
                          required minLength={6} />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm" className="text-sm font-normal text-foreground">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="confirm" type={showConfirm ? 'text' : 'password'}
                          placeholder="Repeat your password"
                          className="pl-10 pr-10 bg-background border-border text-foreground"
                          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-2.5">
                      <input type="checkbox" id="terms"
                        className="rounded mt-0.5 shrink-0 accent-primary"
                        checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                      <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer text-pretty">
                        I agree to the{' '}
                        <a href="/terms" className="text-primary hover:underline font-medium">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</a>
                      </label>
                    </div>

                    <Button type="submit"
                      disabled={loading || googleLoading || (!!confirmPassword && password !== confirmPassword)}
                      className="w-full bg-gradient-primary text-white hover:opacity-90 h-11 font-semibold shadow-md glow-blue disabled:opacity-50">
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Account
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
                    </p>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
