import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/* ─── Password strength helper ─── */
function getPasswordStrength(pw: string): { label: string; percent: number; color: string } {
  if (!pw) return { label: '', percent: 0, color: '' };
  const hasMix = /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);
  if (pw.length >= 12 && hasMix) return { label: 'Strong', percent: 100, color: 'bg-green-500' };
  if (pw.length >= 8 && hasMix)  return { label: 'Good',   percent: 75,  color: 'bg-blue-500' };
  if (pw.length >= 6)            return { label: 'Fair',   percent: 50,  color: 'bg-orange-400' };
  return                                { label: 'Weak',   percent: 25,  color: 'bg-red-500' };
}

export default function SignupPage() {
  /* ── state ── */
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

  /* ── handlers ── */
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

  /* ─────────────────────────── JSX ─────────────────────────── */
  return (
    <div className="flex min-h-screen bg-background p-4 sm:p-6 items-center justify-center">
      <div className="w-full max-w-[1100px] min-h-[700px] flex rounded-2xl overflow-hidden shadow-2xl bg-surface border border-border relative">

        {/* ═══════════ LEFT BRAND PANEL ═══════════ */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 brand-gradient relative overflow-hidden flex-col justify-between p-12 xl:p-16 text-on-primary">

          {/* Decorative animated SVG circles */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <svg className="absolute w-[800px] h-[800px] -top-64 -left-64 animate-[spin_60s_linear_infinite]" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeDasharray="2 4" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeDasharray="1 3" strokeWidth="0.5" />
            </svg>
            <svg className="absolute w-[600px] h-[600px] -bottom-40 -right-40 animate-[spin_45s_linear_infinite_reverse]" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeDasharray="3 5" strokeWidth="0.4" />
              <circle cx="50" cy="50" r="25" stroke="currentColor" strokeDasharray="2 6" strokeWidth="0.4" />
            </svg>
          </div>

          {/* Brand header */}
          <div className="relative z-10">
            <Link className="flex items-center gap-3 no-underline w-fit" to="/">
              <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-10 h-10 object-contain" />
              <span className="font-display text-3xl font-extrabold text-on-primary tracking-tight">LearnLoom</span>
            </Link>
          </div>

          {/* Value proposition */}
          <div className="relative z-10 flex flex-col gap-6 my-auto">
            <h1 className="font-display-lg text-4xl font-extrabold text-on-primary leading-tight">
              Accelerate your learning with AI.
            </h1>
            <p className="font-body-lg text-body-lg text-inverse-primary max-w-md leading-relaxed">
              Join thousands of professionals upskilling with personalized, adaptive learning paths designed for the modern workplace.
            </p>

            {/* Feature cards grid */}
            <div className="grid grid-cols-2 gap-6 mt-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-on-primary">psychology</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-primary mb-2 text-lg font-semibold">Adaptive Paths</h3>
                <p className="font-body-sm text-body-sm text-inverse-primary">AI analyzes your pace and adapts content in real-time.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-on-primary">speed</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-primary mb-2 text-lg font-semibold">Learn Faster</h3>
                <p className="font-body-sm text-body-sm text-inverse-primary">Summarized insights and micro-learning modules.</p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="relative z-10 mt-6 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl flex items-center gap-4">
            <img
              alt="Sarah J."
              className="w-12 h-12 rounded-full border-2 border-white/30 object-cover flex-shrink-0"
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
            />
            <div>
              <p className="font-body-sm text-body-sm text-on-primary italic">
                &ldquo;LearnLoom cut my upskilling time in half. The AI mentor is game-changing.&rdquo;
              </p>
              <p className="font-label-sm text-label-sm text-inverse-primary mt-1 font-semibold">Sarah J. — Data Scientist</p>
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT SIGNUP PANEL ═══════════ */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-surface">
          <div className="mx-auto w-full max-w-md">

            {/* Mobile brand header */}
            <div className="lg:hidden text-center mb-8 flex flex-col items-center gap-2">
              <Link to="/" className="flex items-center gap-3 no-underline">
                <img src="/images/logo/logo-icon.png" alt="LearnLoom Logo" className="w-8 h-8 object-contain" />
                <span className="font-display text-2xl font-bold text-primary tracking-tight">LearnLoom</span>
              </Link>
            </div>

            {/* ── VERIFY-SENT STAGE ── */}
            {stage === 'verify-sent' ? (
              <div className="bg-surface border border-border-base rounded-2xl p-6 sm:p-8 shadow-sm relative z-10 text-center">
                {/* Glowing icon */}
                <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(var(--primary-rgb,99,102,241),0.25)]">
                  <span className="material-symbols-outlined text-3xl text-primary">mark_email_read</span>
                </div>

                <h2 className="font-headline-lg text-headline-lg text-text-primary mb-2 font-bold">Check your inbox</h2>
                <p className="font-body-md text-body-md text-text-secondary mb-6">
                  We&apos;ve sent a verification code to{' '}
                  <span className="text-text-primary font-medium">{submittedEmail}</span>. Enter the 6-digit code below.
                </p>

                <form onSubmit={handleVerify} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="123456"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    autoComplete="one-time-code"
                    className="w-full text-center tracking-[0.35em] text-2xl bg-surface border border-border-base text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary rounded-xl py-3 font-body-md transition-all duration-300 min-h-[44px]"
                  />
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length < 6}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--chart-4))] text-on-primary font-label-md text-label-md font-bold hover:opacity-90 transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-h-[44px]"
                  >
                    {loading && <span className="material-symbols-outlined animate-spin mr-2 text-[20px]">sync</span>}
                    Verify Account
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full mt-2 font-label-md text-label-md text-primary hover:underline flex justify-center items-center min-h-[44px] transition-all duration-300"
                  >
                    {resending
                      ? <span className="material-symbols-outlined animate-spin mr-1 text-[18px]">sync</span>
                      : <span className="material-symbols-outlined mr-1 text-[18px]">refresh</span>
                    }
                    Resend verification code
                  </button>
                </form>
              </div>
            ) : (
              /* ── FORM STAGE ── */
              <>
                <div className="text-center lg:text-left mb-6">
                  <h2 className="font-display-lg text-display-lg text-text-primary tracking-tight font-extrabold">
                    Create your account
                  </h2>
                  <p className="mt-2 font-body-md text-body-md text-text-secondary">
                    Already have an account?{' '}
                    <Link
                      className="font-label-md text-label-md text-primary hover:text-primary-container font-semibold transition-colors min-h-[44px] inline-flex items-center"
                      to="/login"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>

                <div className="bg-surface border border-border-base rounded-2xl p-6 sm:p-8 shadow-sm relative z-10">

                  {/* ── Google signup button (full-width) ── */}
                  <button
                    onClick={handleGoogleSignup}
                    disabled={loading || googleLoading}
                    className="flex items-center justify-center w-full px-4 py-3 border border-border-base rounded-xl bg-surface hover:bg-surface-container-low transition-all duration-300 disabled:opacity-50 group min-h-[44px] mb-4"
                  >
                    {googleLoading ? (
                      <span className="material-symbols-outlined animate-spin mr-3">sync</span>
                    ) : (
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    <span className="font-label-md text-label-md text-text-primary font-semibold">Continue with Google</span>
                  </button>

                  {/* ── Divider ── */}
                  <div className="relative mb-4">
                    <div aria-hidden="true" className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border-base" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-surface text-text-secondary font-label-sm text-label-sm font-medium">
                        Or continue with email
                      </span>
                    </div>
                  </div>

                  {/* ── Email signup form ── */}
                  <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                    {/* Dummy hidden inputs to defeat browser autofill */}
                    <input type="email" style={{ display: 'none' }} name="fake_email_autofill" tabIndex={-1} aria-hidden="true" />
                    <input type="password" style={{ display: 'none' }} name="fake_password_autofill" tabIndex={-1} aria-hidden="true" />

                    {/* Full Name */}
                    <div>
                      <label className="block font-label-md text-label-md text-text-primary mb-1 font-semibold" htmlFor="name">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-text-secondary text-xl">person</span>
                        </div>
                        <input
                          className="block w-full pl-10 pr-3 py-3 border border-border-base rounded-xl text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md placeholder-text-secondary transition-all duration-300 min-h-[44px]"
                          id="name"
                          placeholder="Jane Doe"
                          required
                          type="text"
                          value={name}
                          autoComplete="name"
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Work Email */}
                    <div>
                      <label className="block font-label-md text-label-md text-text-primary mb-1 font-semibold" htmlFor="email">
                        Work Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-text-secondary text-xl">mail</span>
                        </div>
                        <input
                          className="block w-full pl-10 pr-3 py-3 border border-border-base rounded-xl text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md placeholder-text-secondary transition-all duration-300 min-h-[44px]"
                          id="email"
                          placeholder="jane@company.com"
                          required
                          type="email"
                          value={email}
                          autoComplete="email"
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block font-label-md text-label-md text-text-primary mb-1 font-semibold" htmlFor="password">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-text-secondary text-xl">lock</span>
                        </div>
                        <input
                          className="block w-full pl-10 pr-10 py-3 border border-border-base rounded-xl text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md placeholder-text-secondary transition-all duration-300 min-h-[44px]"
                          id="password"
                          placeholder="••••••••"
                          required
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          autoComplete="new-password"
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-primary transition-colors min-w-[44px] justify-center"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>

                      {/* Password strength meter */}
                      {password.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="w-full h-1.5 bg-border-base rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                              style={{ width: `${strength.percent}%` }}
                            />
                          </div>
                          <p className={`text-xs font-medium ${
                            strength.percent <= 25 ? 'text-red-500' :
                            strength.percent <= 50 ? 'text-orange-400' :
                            strength.percent <= 75 ? 'text-blue-500' :
                            'text-green-500'
                          }`}>
                            {strength.label}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Terms checkbox */}
                    <div className="flex items-start mt-4">
                      <input
                        className="h-5 w-5 mt-0.5 text-primary focus:ring-primary border-border-base rounded cursor-pointer flex-shrink-0"
                        id="terms"
                        required
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />
                      <label className="ml-2 block font-body-sm text-body-sm text-text-secondary cursor-pointer select-none py-0.5 leading-snug" htmlFor="terms">
                        I agree to the{' '}
                        <Link className="text-primary hover:underline font-semibold" to="/terms">Terms of Service</Link>
                        {' '}and{' '}
                        <Link className="text-primary hover:underline font-semibold" to="/privacy">Privacy Policy</Link>
                      </label>
                    </div>

                    {/* Submit button */}
                    <div className="pt-2">
                      <button
                        disabled={loading}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm font-label-md text-label-md text-on-primary bg-gradient-to-r from-primary to-[hsl(var(--chart-4))] font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 min-h-[44px]"
                        type="submit"
                      >
                        {loading && <span className="material-symbols-outlined animate-spin mr-2">sync</span>}
                        Create Account
                      </button>
                    </div>
                  </form>

                  {/* Trust badge */}
                  <div className="flex items-center justify-center gap-1.5 mt-5 text-text-secondary">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    <span className="font-body-sm text-body-sm text-xs">Protected with 256-bit SSL encryption</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
