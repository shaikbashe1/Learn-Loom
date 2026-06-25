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
  const [githubLoading, setGithubLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending]         = useState(false);
  const { signInWithEmail, signInWithGoogle, signInWithGitHub, resendVerificationEmail } = useAuth();
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

  const handleGitHubLogin = async () => {
    setGithubLoading(true);
    const { error } = await signInWithGitHub();
    if (error) {
      setGithubLoading(false);
      toast.error('GitHub sign-in failed', { description: error.message });
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
    <div className="bg-background min-h-screen flex items-center justify-center font-body-md text-text-primary p-4 sm:p-gutter">
      <div className="w-full max-w-container-max min-h-[750px] flex rounded-2xl overflow-hidden shadow-2xl bg-surface border border-border-base relative">
        
        {/* Left Panel: Brand Expression (Hidden on Mobile) */}
        <div className="hidden lg:flex w-1/2 brand-gradient relative flex-col justify-between p-12 xl:p-16 text-on-primary overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <svg className="absolute w-[800px] h-[800px] -top-64 -left-64 animate-[spin_60s_linear_infinite]" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeDasharray="2 4" strokeWidth="0.5"></circle>
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeDasharray="1 3" strokeWidth="0.5"></circle>
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
              <div className="glass-panel p-6 rounded-xl text-text-primary bg-white/10 border-white/20">
                <div className="flex items-center gap-4 mb-2">
                  <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  <h3 className="font-headline-md text-headline-md text-on-primary font-semibold">Master New Skills</h3>
                </div>
                <p className="font-body-sm text-body-sm text-inverse-primary leading-relaxed">Join over 500,000 professionals accelerating their careers through our adaptive curriculum.</p>
              </div>
              <div className="glass-panel p-6 rounded-xl text-text-primary bg-white/10 border-white/20">
                <div className="flex items-center gap-4 mb-2">
                  <span className="material-symbols-outlined text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  <h3 className="font-headline-md text-headline-md text-on-primary font-semibold">AI-Powered Guidance</h3>
                </div>
                <p className="font-body-sm text-body-sm text-inverse-primary leading-relaxed">Receive real-time feedback and dynamic content tailored perfectly to your unique learning style.</p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4 text-inverse-primary font-label-md text-label-md">
              <span>© {new Date().getFullYear()} LearnLoom AI</span>
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
              <div className="mb-6 rounded-lg border border-error-container/50 bg-error-container/20 p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-error mt-0.5 text-[20px]">error</span>
                <div>
                  <p className="font-label-md text-label-md text-error mb-1 font-bold">Email not verified</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Please verify your email before signing in. Check your inbox or resend the link.</p>
                  <button type="button" onClick={handleResend} disabled={resending} className="font-label-sm text-label-sm text-error hover:underline flex items-center gap-1 min-h-[32px]">
                    {resending ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">refresh</span>}
                    Resend verification email
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
              {/* Dummy hidden inputs to defeat aggressive browser autofill */}
              <input type="email" style={{ display: 'none' }} name="fake_email_autofill" />
              <input type="password" style={{ display: 'none' }} name="fake_password_autofill" />

              <div>
                <label className="block font-label-md text-label-md text-text-primary mb-2 font-semibold" htmlFor="email">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <input 
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-border-base bg-surface-bright focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-body-md text-body-md min-h-[44px]" 
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
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                    <span className="material-symbols-outlined">lock</span>
                  </div>
                  <input 
                    className="w-full pl-12 pr-12 py-3.5 rounded-lg border border-border-base bg-surface-bright focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-body-md text-body-md min-h-[44px]" 
                    id="password" 
                    placeholder="••••••••" 
                    required 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="new-password"
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-secondary hover:text-primary transition-colors min-w-[44px] justify-center" type="button">
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 mb-6">
                <label className="flex items-center cursor-pointer min-h-[44px]">
                  <input className="form-checkbox h-5 w-5 text-primary border-border-base rounded focus:ring-primary transition-colors" type="checkbox"/>
                  <span className="ml-2 font-body-sm text-body-sm text-text-secondary">Remember me</span>
                </label>
                <Link className="font-label-md text-label-md text-primary hover:text-surface-tint transition-colors min-h-[44px] flex items-center" to="/forgot-password">Forgot password?</Link>
              </div>

              <button disabled={loading} className="w-full py-3.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-bold hover:bg-surface-tint focus:ring-4 focus:ring-surface-variant transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 min-h-[44px]" type="submit">
                {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : null}
                Sign In
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </form>

            <div className="mt-8">
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-border-base"></div>
                <span className="flex-shrink-0 mx-4 font-body-sm text-body-sm text-text-secondary font-medium">Or continue with</span>
                <div className="flex-grow border-t border-border-base"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <button onClick={handleGoogleLogin} disabled={googleLoading || githubLoading || loading} className="flex items-center justify-center py-3 px-4 rounded-lg border border-border-base bg-surface hover:bg-surface-container-low transition-colors group disabled:opacity-50 min-h-[44px]">
                  {googleLoading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <img alt="Google" className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsGDtv1wfqRaaAmWvM_A5rKjcBNVQBLRNCZcc66jb_B8yiQbLKy_xOGLnd4f50Riy9E2hqerBhCwhTV9wpJkcavRSeWaGYup6-vDp7xJLbcs8rBhVqoWKMCzQxxerf0li8kFhGu_hosH8rnOuu3Rz9C5pGGtqFVd-Ru0cHdwEb8_T33JsPD-y0RosYAue1vzgMt_5gI9fnq3QI1fAlFskc4pWz1NLSqoIFSUsOjdPPunIpL0VdOVDZn0le5VtoQd3mvbyWje1nWpR5"/>}
                  <span className="font-label-md text-label-md text-text-primary font-semibold">Google</span>
                </button>
                <button onClick={handleGitHubLogin} disabled={googleLoading || githubLoading || loading} className="flex items-center justify-center py-3 px-4 rounded-lg border border-border-base bg-surface hover:bg-surface-container-low transition-colors group disabled:opacity-50 min-h-[44px]">
                  {githubLoading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <span className="material-symbols-outlined mr-2 group-hover:scale-110 transition-transform text-[20px]">code</span>}
                  <span className="font-label-md text-label-md text-text-primary font-semibold">GitHub</span>
                </button>
              </div>
            </div>

            <p className="mt-8 text-center font-body-sm text-body-sm text-text-secondary">
              Don't have an account? <Link className="font-label-md text-label-md text-primary hover:underline min-h-[44px] inline-flex items-center px-1" to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
