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
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      {/* Abstract Background */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(192,193,255,0.05)_0%,rgba(19,19,21,1)_70%)] -z-20 pointer-events-none"></div>
      
      {/* Using inline styles for the nebula blobs for simplicity */}
      <div className="fixed rounded-full blur-[100px] opacity-30 -z-10 animate-[pulse_10s_ease-in-out_infinite_alternate]" style={{ top: '-10%', left: '20%', width: '40vw', height: '40vw', background: 'rgba(128, 131, 255, 0.15)' }}></div>
      <div className="fixed rounded-full blur-[100px] opacity-30 -z-10 animate-[pulse_12s_ease-in-out_infinite_alternate_reverse]" style={{ bottom: '-10%', right: '10%', width: '50vw', height: '50vw', background: 'rgba(221, 183, 255, 0.1)' }}></div>

      <main className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-2xl">
          <h1 className="font-display text-display text-primary tracking-tight mb-sm">LearnLoom</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Engineer your potential.</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/60 rounded-xl p-xl sm:p-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative group transition-all duration-300 hover:border-outline-variant">
          
          {unverifiedEmail && (
            <div className="mb-lg rounded-lg border border-error-container/50 bg-error-container/20 p-md flex gap-md items-start">
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

          <form onSubmit={handleLogin} className="flex flex-col gap-xl">
            {/* Email Field */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-sm" htmlFor="email">USER_IDENTIFIER</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="developer@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md pl-[3.5rem] pr-md font-body-md text-body-md placeholder:text-outline transition-all duration-200" 
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="password">AUTH_KEY</label>
                <Link to="/forgot-password" className="font-label-sm text-label-sm text-primary hover:text-primary-fixed transition-colors">Forgot Password?</Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                <input 
                  id="password" 
                  name="password" 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md pl-[3.5rem] pr-12 font-body-md text-body-md placeholder:text-outline transition-all duration-200" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Primary Action */}
            <button 
              type="submit" 
              disabled={loading || googleLoading}
              className="w-full bg-primary text-on-primary font-headline-md text-headline-md rounded-full py-md mt-sm hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center gap-sm"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : null}
              Initialize Session
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-md my-xl">
            <div className="h-px bg-outline-variant/50 flex-1"></div>
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">or authenticate via</span>
            <div className="h-px bg-outline-variant/50 flex-1"></div>
          </div>

          {/* Social Logins */}
          <div className="flex flex-col gap-md">
            <button onClick={handleGoogleLogin} disabled={loading || googleLoading || githubLoading} className="w-full flex items-center justify-center gap-sm bg-surface-container-high border border-outline-variant/50 rounded-full py-md hover:bg-surface-bright hover:border-outline-variant transition-colors font-label-md text-label-md text-on-surface disabled:opacity-50">
              {googleLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">mail</span>}
              Continue with Google
            </button>
            <button onClick={handleGitHubLogin} disabled={loading || googleLoading || githubLoading} className="w-full flex items-center justify-center gap-sm bg-surface-container-high border border-outline-variant/50 rounded-full py-md hover:bg-surface-bright hover:border-outline-variant transition-colors font-label-md text-label-md text-on-surface disabled:opacity-50">
              {githubLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">code</span>}
              Continue with GitHub
            </button>
          </div>

          {/* Signup Link */}
          <div className="mt-xl text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              No active instance? <Link to="/signup" className="text-primary hover:text-primary-fixed hover:underline transition-all">Provision Account</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
