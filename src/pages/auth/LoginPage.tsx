import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getProfile } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
    <div className="bg-background min-h-screen flex items-center justify-center font-body-md text-text-primary p-4 sm:p-6">
      <div className="w-full max-w-[1100px] min-h-[700px] flex rounded-2xl overflow-hidden shadow-2xl bg-surface border border-border relative">
        
        {/* Left Panel: Brand Expression (Hidden on Mobile) */}
        <div className="hidden lg:flex w-1/2 brand-gradient relative flex-col justify-between p-12 xl:p-16 text-on-primary overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <svg className="absolute w-[800px] h-[800px] -top-64 -left-64 animate-[spin_60s_linear_infinite]" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeDasharray="2 4" strokeWidth="0.5"></circle>
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeDasharray="1 3" strokeWidth="0.5"></circle>
            </svg>
            <svg className="absolute w-[600px] h-[600px] -bottom-32 -right-32 animate-[spin_45s_linear_infinite_reverse]" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="35" stroke="currentColor" strokeDasharray="3 5" strokeWidth="0.3"></circle>
            </svg>
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <Link to="/" className="flex items-center gap-3 mb-8 hover:opacity-90 w-fit">
                <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-10 h-10 object-contain" />
                <span className="font-display-lg text-3xl font-extrabold tracking-tight text-on-primary">LearnLoom</span>
              </Link>
              <p className="font-body-lg text-body-lg text-inverse-primary max-w-md leading-relaxed">Empowering the next generation of learners with AI-driven, personalized educational pathways.</p>
            </div>
            <div className="space-y-6 my-auto">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-primary font-semibold">Master New Skills</h3>
                </div>
                <p className="font-body-sm text-body-sm text-inverse-primary leading-relaxed">Join over 500,000 professionals accelerating their careers through our adaptive curriculum.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-primary font-semibold">AI-Powered Guidance</h3>
                </div>
                <p className="font-body-sm text-body-sm text-inverse-primary leading-relaxed">Receive real-time feedback and dynamic content tailored perfectly to your unique learning style.</p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4 text-inverse-primary font-label-md text-label-md">
              <span>&copy; {new Date().getFullYear()} LearnLoom AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-inverse-primary"></span>
              <span>Enterprise Grade</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Login Interface */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 bg-surface relative">
          {/* Mobile Brand Header */}
          <div className="lg:hidden mb-8 flex flex-col items-center gap-2">
            <Link to="/" className="flex items-center gap-3 no-underline">
              <img src="/images/logo/logo-icon.png" alt="LearnLoom Logo" className="w-8 h-8 object-contain" />
              <span className="font-display text-2xl font-bold text-primary tracking-tight">LearnLoom</span>
            </Link>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <h2 className="font-headline-lg text-headline-lg text-text-primary mb-2 font-extrabold">Welcome back</h2>
              <p className="font-body-md text-body-md text-text-secondary">Please enter your details to sign in.</p>
            </div>

            {unverifiedEmail && (
              <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-destructive mt-0.5 text-[20px]">error</span>
                <div>
                  <p className="font-label-md text-label-md text-destructive mb-1 font-bold">Email not verified</p>
                  <p className="font-body-sm text-body-sm text-muted-foreground mb-2">Please verify your email before signing in. Check your inbox or resend the link.</p>
                  <button type="button" onClick={handleResend} disabled={resending} className="font-label-sm text-label-sm text-destructive hover:underline flex items-center gap-1 min-h-[32px]">
                    {resending ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">refresh</span>}
                    Resend verification email
                  </button>
                </div>
              </div>
            )}

            {/* Google Sign-In — Full Width Primary */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl border border-border bg-surface hover:bg-accent hover:shadow-md transition-all duration-300 group disabled:opacity-50 min-h-[44px] mb-6"
            >
              {googleLoading ? (
                <span className="material-symbols-outlined animate-spin mr-3 text-[20px]">sync</span>
              ) : (
                <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span className="font-label-md text-label-md text-text-primary font-semibold">Continue with Google</span>
            </button>

            <div className="relative flex items-center py-2 mb-6">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-4 font-body-sm text-body-sm text-muted-foreground font-medium">Or continue with email</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
              {/* Dummy hidden inputs to defeat aggressive browser autofill */}
              <input type="email" style={{ display: 'none' }} name="fake_email_autofill" />
              <input type="password" style={{ display: 'none' }} name="fake_password_autofill" />

              <div>
                <label className="block font-label-md text-label-md text-text-primary mb-2 font-semibold" htmlFor="email">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                  <input 
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-body-md text-body-md text-foreground placeholder:text-muted-foreground min-h-[44px]" 
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
                <label className="block font-label-md text-label-md text-text-primary mb-2 font-semibold" htmlFor="password">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input 
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-body-md text-body-md text-foreground placeholder:text-muted-foreground min-h-[44px]" 
                    id="password" 
                    placeholder="Enter your password" 
                    required 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="new-password"
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-primary transition-colors min-w-[44px] justify-center" type="button">
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 mb-2">
                <label className="flex items-center cursor-pointer min-h-[44px]">
                  <input className="form-checkbox h-4.5 w-4.5 text-primary border-border rounded focus:ring-primary transition-colors" type="checkbox"/>
                  <span className="ml-2.5 font-body-sm text-body-sm text-muted-foreground">Remember me</span>
                </label>
                <Link className="font-label-md text-label-md text-primary hover:text-primary/80 transition-colors min-h-[44px] flex items-center font-semibold" to="/forgot-password">Forgot password?</Link>
              </div>

              <button
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--chart-4))] text-white font-label-md text-label-md font-bold hover:shadow-lg hover:shadow-primary/25 focus:ring-4 focus:ring-primary/20 transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 min-h-[44px]"
                type="submit"
              >
                {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : null}
                Sign In
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </form>

            {/* Trust Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span className="font-body-sm text-[12px]">Protected with 256-bit SSL encryption</span>
            </div>

            <p className="mt-6 text-center font-body-sm text-body-sm text-muted-foreground">
              Don't have an account? <Link className="font-label-md text-label-md text-primary hover:underline min-h-[44px] inline-flex items-center px-1 font-semibold" to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
