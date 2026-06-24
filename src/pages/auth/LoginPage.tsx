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
    <div className="bg-background min-h-screen flex items-center justify-center font-body-md text-text-primary p-gutter">
      <div className="w-full max-w-container-max min-h-[800px] flex rounded-2xl overflow-hidden shadow-2xl bg-surface border border-border-base relative">
        {/* Left Panel: Brand Expression */}
        <div className="hidden lg:flex w-1/2 brand-gradient relative flex-col justify-between p-stack-xl text-on-primary overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <svg className="absolute w-[800px] h-[800px] -top-64 -left-64 animate-[spin_60s_linear_infinite]" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeDasharray="2 4" strokeWidth="0.5"></circle>
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeDasharray="1 3" strokeWidth="0.5"></circle>
            </svg>
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <Link to="/" className="font-display-lg text-display-lg mb-stack-sm tracking-tight hover:opacity-90 inline-block">LearnLoom</Link>
              <p className="font-body-lg text-body-lg text-inverse-primary max-w-md">Empowering the next generation of learners with AI-driven, personalized educational pathways.</p>
            </div>
            <div className="space-y-stack-lg">
              <div className="glass-panel p-stack-md rounded-xl text-text-primary bg-white/10 border-white/20">
                <div className="flex items-center gap-4 mb-2">
                  <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  <h3 className="font-headline-md text-headline-md text-on-primary">Master New Skills</h3>
                </div>
                <p className="font-body-sm text-body-sm text-inverse-primary">Join over 500,000 professionals accelerating their careers through our adaptive curriculum.</p>
              </div>
              <div className="glass-panel p-stack-md rounded-xl text-text-primary bg-white/10 border-white/20">
                <div className="flex items-center gap-4 mb-2">
                  <span className="material-symbols-outlined text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  <h3 className="font-headline-md text-headline-md text-on-primary">AI-Powered Guidance</h3>
                </div>
                <p className="font-body-sm text-body-sm text-inverse-primary">Receive real-time feedback and dynamic content tailored perfectly to your unique learning style.</p>
              </div>
            </div>
            <div className="mt-stack-xl flex items-center gap-4 text-inverse-primary font-label-md text-label-md">
              <span>© {new Date().getFullYear()} LearnLoom AI</span>
              <span className="w-1 h-1 rounded-full bg-inverse-primary"></span>
              <span>Enterprise Grade</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Login Interface */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-margin-desktop lg:p-stack-xl bg-surface relative">
          {/* Mobile Brand Header */}
          <div className="lg:hidden mb-stack-xl text-center">
            <Link to="/" className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-tertiary">LearnLoom</Link>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-stack-lg text-center lg:text-left">
              <h2 className="font-headline-lg text-headline-lg text-text-primary mb-2">Welcome back</h2>
              <p className="font-body-md text-body-md text-text-secondary">Please enter your details to sign in.</p>
            </div>

            {unverifiedEmail && (
              <div className="mb-stack-lg rounded-lg border border-error-container/50 bg-error-container/20 p-md flex gap-md items-start">
                <span className="material-symbols-outlined text-error mt-xs text-[20px]">error</span>
                <div>
                  <p className="font-label-md text-label-md text-error mb-xs">Email not verified</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-sm">Please verify your email before signing in. Check your inbox or resend the link.</p>
                  <button type="button" onClick={handleResend} disabled={resending} className="font-label-sm text-label-sm text-error hover:underline flex items-center gap-xs">
                    {resending ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">refresh</span>}
                    Resend verification email
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-stack-md" autoComplete="off">
              {/* Dummy hidden inputs to defeat aggressive browser autofill */}
              <input type="email" style={{ display: 'none' }} name="fake_email_autofill" />
              <input type="password" style={{ display: 'none' }} name="fake_password_autofill" />

              <div>
                <label className="block font-label-md text-label-md text-text-primary mb-2" htmlFor="email">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <input 
                    className="w-full pl-12 pr-4 py-4 rounded-lg border border-border-base bg-surface-bright focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-body-md text-body-md" 
                    id="email" 
                    placeholder="name@company.com" 
                    required 
                    type="email"
                    value={email}
                    autoComplete="username"
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-text-primary mb-2" htmlFor="password">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                    <span className="material-symbols-outlined">lock</span>
                  </div>
                  <input 
                    className="w-full pl-12 pr-12 py-4 rounded-lg border border-border-base bg-surface-bright focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-body-md text-body-md" 
                    id="password" 
                    placeholder="••••••••" 
                    required 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="current-password"
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-secondary hover:text-primary transition-colors" type="button">
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-stack-sm mb-stack-lg">
                <label className="flex items-center cursor-pointer">
                  <input className="form-checkbox h-5 w-5 text-primary border-border-base rounded focus:ring-primary transition-colors" type="checkbox"/>
                  <span className="ml-2 font-body-sm text-body-sm text-text-secondary">Remember me</span>
                </label>
                <Link className="font-label-md text-label-md text-primary hover:text-surface-tint transition-colors" to="/forgot-password">Forgot password?</Link>
              </div>

              <button disabled={loading} className="w-full py-4 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-bold hover:bg-surface-tint focus:ring-4 focus:ring-surface-variant transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2" type="submit">
                {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : null}
                Sign In
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </form>

            <div className="mt-stack-lg">
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-border-base"></div>
                <span className="flex-shrink-0 mx-4 font-body-sm text-body-sm text-text-secondary">Or continue with</span>
                <div className="flex-grow border-t border-border-base"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button onClick={handleGoogleLogin} disabled={googleLoading || githubLoading || loading} className="flex items-center justify-center py-3 px-4 rounded-lg border border-border-base bg-surface hover:bg-surface-container-low transition-colors group disabled:opacity-50">
                  {googleLoading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <img alt="Google" className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsGDtv1wfqRaaAmWvM_A5rKjcBNVQBLRNCZcc66jb_B8yiQbLKy_xOGLnd4f50Riy9E2hqerBhCwhTV9wpJkcavRSeWaGYup6-vDp7xJLbcs8rBhVqoWKMCzQxxerf0li8kFhGu_hosH8rnOuu3Rz9C5pGGtqFVd-Ru0cHdwEb8_T33JsPD-y0RosYAue1vzgMt_5gI9fnq3QI1fAlFskc4pWz1NLSqoIFSUsOjdPPunIpL0VdOVDZn0le5VtoQd3mvbyWje1nWpR5"/>}
                  <span className="font-label-md text-label-md text-text-primary">Google</span>
                </button>
                <button onClick={handleGitHubLogin} disabled={googleLoading || githubLoading || loading} className="flex items-center justify-center py-3 px-4 rounded-lg border border-border-base bg-surface hover:bg-surface-container-low transition-colors group disabled:opacity-50">
                  {githubLoading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <img alt="GitHub" className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB36CeHYV5KtKDpqE6qmqAHdACpGXa3_HqrhTSHbqiGhrRiRkYFA_4FHfR36ArzbjNfTFAkvMD3j1w2LnFzKEgudiWyMKVVyvogiuXJ9vK9acnAFnqpt_2U-1_KEwhZ5EzzbZ5jKcDqn-dsflswrFaxO9OeCxtbHWZbIcGy_PYWmHyc6TqZXgkhaBA9Jp9RTT58LmQLf6HxoikAQwjwqzjFuY0Nj5doSqo52zMb3TPpYeZThA8BPETj6EJq6YfGQDbGZSLXkaPNcfI1"/>}
                  <span className="font-label-md text-label-md text-text-primary">GitHub</span>
                </button>
              </div>
            </div>

            <p className="mt-stack-xl text-center font-body-sm text-body-sm text-text-secondary">
              Don't have an account? <Link className="font-label-md text-label-md text-primary hover:underline" to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
