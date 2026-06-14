import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const [verificationCode, setVerificationCode] = useState('');

  const { signUpWithEmail, signInWithGoogle, resendVerificationEmail, verifyEmailCode } = useAuth();
  const navigate = useNavigate();

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
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      {/* Abstract Background */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(192,193,255,0.05)_0%,rgba(19,19,21,1)_70%)] -z-20 pointer-events-none"></div>
      
      {/* Using inline styles for the nebula blobs for simplicity */}
      <div className="fixed rounded-full blur-[100px] opacity-30 -z-10 animate-[pulse_10s_ease-in-out_infinite_alternate]" style={{ top: '-10%', left: '20%', width: '40vw', height: '40vw', background: 'rgba(128, 131, 255, 0.15)' }}></div>
      <div className="fixed rounded-full blur-[100px] opacity-30 -z-10 animate-[pulse_12s_ease-in-out_infinite_alternate_reverse]" style={{ bottom: '-10%', right: '10%', width: '50vw', height: '50vw', background: 'rgba(221, 183, 255, 0.1)' }}></div>

      <main className="w-full max-w-md relative z-10 py-2xl">
        {stage === 'verify-sent' ? (
          /* ── Email verification pending ── */
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/60 rounded-xl p-xl sm:p-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-md">
              <span className="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">Check your inbox</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
              We&apos;ve sent a verification code to <span className="text-on-surface font-bold">{submittedEmail}</span>. Enter the 6-digit code below to activate your account.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              const { error } = await verifyEmailCode(verificationCode);
              setLoading(false);
              if (error) { toast.error('Verification failed', { description: error.message }); }
              else {
                toast.success('Account verified!');
                navigate('/dashboard', { replace: true });
              }
            }} className="space-y-md">
              <div>
                <input 
                  type="text" 
                  required 
                  placeholder="123456"
                  maxLength={6}
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                  className="w-full text-center tracking-widest text-2xl bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-xl py-md font-body-md placeholder:text-outline transition-all duration-200" 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || verificationCode.length < 6}
                className="w-full bg-primary text-on-primary font-headline-md text-headline-md rounded-full py-md hover:bg-primary-fixed transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center"
              >
                {loading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : null}
                Verify Account
              </button>
              <button 
                type="button" 
                onClick={handleResend} 
                disabled={resending}
                className="w-full mt-4 bg-transparent text-on-surface-variant font-label-md text-label-md hover:text-on-surface transition-colors disabled:opacity-70 flex justify-center items-center gap-sm"
              >
                {resending ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : <span className="material-symbols-outlined text-[18px]">refresh</span>}
                Resend verification code
              </button>
            </form>
          </div>
        ) : (
          /* ── Signup form ── */
          <>
            {/* Brand Header */}
            <div className="text-center mb-2xl">
              <h1 className="font-display text-display text-primary tracking-tight mb-sm">LearnLoom</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Engineer your potential.</p>
            </div>

            {/* Signup Card */}
            <div className="bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/60 rounded-xl p-xl sm:p-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative group transition-all duration-300 hover:border-outline-variant">
              
              <form onSubmit={handleSignup} className="flex flex-col gap-lg">
                {/* Full Name */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-sm" htmlFor="name">FULL_NAME</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-muted">person</span>
                    <input 
                      id="name" 
                      type="text" 
                      required 
                      placeholder="Alex Johnson"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md pl-[3.5rem] pr-md font-body-md text-body-md placeholder:text-outline transition-all duration-200" 
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-sm" htmlFor="email">USER_IDENTIFIER</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-muted">mail</span>
                    <input 
                      id="email" 
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
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-sm" htmlFor="password">AUTH_KEY</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-muted">lock</span>
                    <input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md pl-[3.5rem] pr-12 font-body-md text-body-md placeholder:text-outline transition-all duration-200" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-md top-1/2 -translate-y-1/2 text-outline-muted hover:text-on-surface transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-sm" htmlFor="confirm">VERIFY_AUTH_KEY</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-muted">lock</span>
                    <input 
                      id="confirm" 
                      type={showConfirm ? 'text' : 'password'} 
                      required 
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`w-full bg-surface-container border ${confirmPassword && password !== confirmPassword ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'} text-on-surface focus:bg-surface-container-high focus:outline-none focus:ring-1 rounded-full py-md pl-[3.5rem] pr-12 font-body-md text-body-md placeholder:text-outline transition-all duration-200`} 
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-md top-1/2 -translate-y-1/2 text-outline-muted hover:text-on-surface transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-error font-label-sm mt-xs">Keys do not match</p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-sm mt-xs">
                  <input 
                    type="checkbox" 
                    id="terms"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-background"
                  />
                  <label htmlFor="terms" className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer">
                    I agree to the <a href="/terms" className="text-primary hover:text-primary-fixed hover:underline transition-all">Terms of Service</a> and <a href="/privacy" className="text-primary hover:text-primary-fixed hover:underline transition-all">Privacy Policy</a>
                  </label>
                </div>

                {/* Primary Action */}
                <button 
                  type="submit" 
                  disabled={loading || googleLoading || (!!confirmPassword && password !== confirmPassword)}
                  className="w-full bg-primary text-on-primary font-headline-md text-headline-md rounded-full py-md mt-sm hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center gap-sm"
                >
                  {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : null}
                  Provision Account
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-md my-xl">
                <div className="h-px bg-outline-variant/50 flex-1"></div>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">or authenticate via</span>
                <div className="h-px bg-outline-variant/50 flex-1"></div>
              </div>

              {/* Social Logins */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <button className="flex items-center justify-center gap-sm bg-surface-container-high border border-outline-variant/50 rounded-full py-md hover:bg-surface-bright hover:border-outline-variant transition-colors font-label-md text-label-md text-on-surface disabled:opacity-50" disabled>
                  <span className="material-symbols-outlined text-[20px]">code</span>
                  GitHub
                </button>
                <button onClick={handleGoogleSignup} disabled={loading || googleLoading} className="flex items-center justify-center gap-sm bg-surface-container-high border border-outline-variant/50 rounded-full py-md hover:bg-surface-bright hover:border-outline-variant transition-colors font-label-md text-label-md text-on-surface disabled:opacity-50">
                  {googleLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">mail</span>}
                  Google
                </button>
              </div>

              {/* Login Link */}
              <div className="mt-xl text-center">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Already have an instance? <Link to="/login" className="text-primary hover:text-primary-fixed hover:underline transition-all">Initialize Session</Link>
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
