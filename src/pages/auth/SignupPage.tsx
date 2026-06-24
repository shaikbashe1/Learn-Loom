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
  const [githubLoading, setGithubLoading]   = useState(false);
  const [resending, setResending]           = useState(false);
  const [stage, setStage]                   = useState<'form' | 'verify-sent'>('form');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const { signUpWithEmail, signInWithGoogle, signInWithGitHub, resendVerificationEmail, verifyEmailCode } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast.error('Google sign-in failed', { description: error.message });
    }
  };

  const handleGitHubSignup = async () => {
    setGithubLoading(true);
    const { error } = await signInWithGitHub();
    if (error) {
      setGithubLoading(false);
      toast.error('GitHub sign-in failed', { description: error.message });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { toast.error('Please agree to the Terms of Service and Privacy Policy'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    // If you want to check confirmPassword, re-enable it in the UI and here. The design only showed one password field.
    // For now we'll stick to the design which only has 1 password field to simplify signup.
    // Or we can add confirmPassword back. I will use the design's single password field.
    
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
    <div className="flex min-h-screen bg-background font-body-md text-text-primary antialiased">
      {/* Left Panel: Brand Experience */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-primary via-secondary to-tertiary relative overflow-hidden flex-col justify-between p-margin-desktop rounded-r-3xl shadow-2xl">
        {/* Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-secondary-container/30 rounded-full blur-3xl mix-blend-overlay"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-tertiary-container/30 rounded-full blur-3xl mix-blend-overlay"></div>
        
        {/* Brand Header */}
        <div className="relative z-10">
          <Link className="flex items-center gap-3 no-underline" to="/">
            <span className="material-symbols-outlined text-4xl text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
            <span className="font-headline-lg text-headline-lg text-on-primary">LearnLoom</span>
          </Link>
        </div>
        
        {/* Value Proposition */}
        <div className="relative z-10 flex flex-col gap-stack-lg mt-stack-xl">
          <h1 className="font-display-lg text-display-lg text-on-primary leading-tight">
            Accelerate your learning with AI.
          </h1>
          <p className="font-body-lg text-body-lg text-inverse-primary max-w-md">
            Join thousands of professionals upskilling with personalized, adaptive learning paths designed for the modern workplace.
          </p>
          
          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mt-stack-md">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-stack-md rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-on-primary">psychology</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-primary mb-2 text-lg">Adaptive Paths</h3>
              <p className="font-body-sm text-body-sm text-inverse-primary">AI analyzes your pace and adapts content in real-time.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-stack-md rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-on-primary">speed</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-primary mb-2 text-lg">Learn Faster</h3>
              <p className="font-body-sm text-body-sm text-inverse-primary">Summarized insights and micro-learning modules.</p>
            </div>
          </div>
        </div>
        
        {/* Testimonial */}
        <div className="relative z-10 mt-stack-xl bg-white/10 backdrop-blur-md border border-white/20 p-stack-md rounded-2xl flex items-center gap-4">
          <img alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white/30 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBz_sFwDRDSlk3UJK-R9pdy6qfT1dU4WGNKXG5CcDUbi5DOze8rq2bjN0FilOfg9sF1YYgfGI2pQb7QYlEb1-5Uuu3qlLnJGYYQEii0rLHl-mWSBEupeXvRs8GrwA1fieiExUFq6gjcRkyuReBPZJK4Q84Aw9xzYrAcx5Htq5QNBV9eVuXMGWjM4QgiMQr_i07AmHAglAIw9spnpGF81-bVqWk5O32X8-d4ouk5mBpj73WNlFbsTSgRg-ItFz9YU8M3cwJtLKBphvry"/>
          <div>
            <p className="font-body-sm text-body-sm text-on-primary italic">"LearnLoom cut my upskilling time in half. The AI mentor is game-changing."</p>
            <p className="font-label-sm text-label-sm text-inverse-primary mt-1">Sarah J. — Data Scientist</p>
          </div>
        </div>
      </div>

      {/* Right Panel: Registration Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-32 py-12 bg-surface">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-stack-lg">
            <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile ai-gradient-text mt-4">LearnLoom</h2>
          </div>

          {stage === 'verify-sent' ? (
            <div className="bg-surface border border-border-base rounded-2xl p-6 sm:p-8 shadow-md relative z-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">mark_email_read</span>
              </div>
              <h2 className="font-headline-md text-headline-md text-text-primary mb-2">Check your inbox</h2>
              <p className="font-body-md text-body-md text-text-secondary mb-6">
                We've sent a verification code to <span className="text-text-primary font-medium">{submittedEmail}</span>. Enter the 6-digit code below.
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
              }} className="space-y-4">
                <input 
                  type="text" 
                  required 
                  placeholder="123456"
                  maxLength={6}
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                  className="w-full text-center tracking-widest text-2xl bg-surface border border-border-base text-text-primary focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 font-body-md transition-shadow" 
                />
                <button 
                  type="submit" 
                  disabled={loading || verificationCode.length < 6}
                  className="w-full py-3 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-medium hover:bg-primary transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? <span className="material-symbols-outlined animate-spin mr-2 text-[20px]">sync</span> : null}
                  Verify Account
                </button>
                <button 
                  type="button" 
                  onClick={handleResend} 
                  disabled={resending}
                  className="w-full mt-2 font-label-md text-label-md text-primary hover:underline flex justify-center items-center"
                >
                  {resending ? <span className="material-symbols-outlined animate-spin mr-1 text-[18px]">sync</span> : <span className="material-symbols-outlined mr-1 text-[18px]">refresh</span>}
                  Resend verification code
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="text-center lg:text-left mb-stack-lg">
                <h2 className="font-display-lg-mobile lg:font-headline-lg text-display-lg-mobile lg:text-headline-lg text-text-primary tracking-tight">
                  Create your account
                </h2>
                <p className="mt-2 font-body-md text-body-md text-text-secondary">
                  Already have an account? <Link className="font-label-md text-label-md text-primary hover:text-primary-container font-semibold transition-colors" to="/login">Sign in here</Link>
                </p>
              </div>

              <div className="bg-surface border border-border-base rounded-2xl p-6 sm:p-8 shadow-sm relative z-10">
                {/* Social Signup */}
                <div className="grid grid-cols-2 gap-4 mb-stack-md">
                  <button onClick={handleGoogleSignup} disabled={loading || googleLoading || githubLoading} className="flex items-center justify-center w-full px-4 py-3 border border-border-base rounded-xl bg-surface hover:bg-surface-container-low transition-colors duration-200 disabled:opacity-50 group">
                    {googleLoading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <img alt="Google" className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsGDtv1wfqRaaAmWvM_A5rKjcBNVQBLRNCZcc66jb_B8yiQbLKy_xOGLnd4f50Riy9E2hqerBhCwhTV9wpJkcavRSeWaGYup6-vDp7xJLbcs8rBhVqoWKMCzQxxerf0li8kFhGu_hosH8rnOuu3Rz9C5pGGtqFVd-Ru0cHdwEb8_T33JsPD-y0RosYAue1vzgMt_5gI9fnq3QI1fAlFskc4pWz1NLSqoIFSUsOjdPPunIpL0VdOVDZn0le5VtoQd3mvbyWje1nWpR5"/>}
                    <span className="font-label-md text-label-md text-text-primary">Google</span>
                  </button>
                  <button onClick={handleGitHubSignup} disabled={loading || googleLoading || githubLoading} className="flex items-center justify-center w-full px-4 py-3 border border-border-base rounded-xl bg-surface hover:bg-surface-container-low transition-colors duration-200 disabled:opacity-50 group">
                    {githubLoading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <img alt="GitHub" className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB36CeHYV5KtKDpqE6qmqAHdACpGXa3_HqrhTSHbqiGhrRiRkYFA_4FHfR36ArzbjNfTFAkvMD3j1w2LnFzKEgudiWyMKVVyvogiuXJ9vK9acnAFnqpt_2U-1_KEwhZ5EzzbZ5jKcDqn-dsflswrFaxO9OeCxtbHWZbIcGy_PYWmHyc6TqZXgkhaBA9Jp9RTT58LmQLf6HxoikAQwjwqzjFuY0Nj5doSqo52zMb3TPpYeZThA8BPETj6EJq6YfGQDbGZSLXkaPNcfI1"/>}
                    <span className="font-label-md text-label-md text-text-primary">GitHub</span>
                  </button>
                </div>

                <div className="relative mb-stack-md">
                  <div aria-hidden="true" className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-base"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-surface text-text-secondary font-label-sm text-label-sm">Or continue with email</span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block font-label-md text-label-md text-text-primary mb-1" htmlFor="name">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-text-secondary text-xl">person</span>
                      </div>
                      <input 
                        className="block w-full pl-10 pr-3 py-3 border border-border-base rounded-xl text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md placeholder-text-secondary transition-shadow" 
                        id="name" 
                        placeholder="Jane Doe" 
                        required 
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-text-primary mb-1" htmlFor="email">Work Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-text-secondary text-xl">mail</span>
                      </div>
                      <input 
                        className="block w-full pl-10 pr-3 py-3 border border-border-base rounded-xl text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md placeholder-text-secondary transition-shadow" 
                        id="email" 
                        placeholder="jane@company.com" 
                        required 
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-text-primary mb-1" htmlFor="password">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-text-secondary text-xl">lock</span>
                      </div>
                      <input 
                        className="block w-full pl-10 pr-10 py-3 border border-border-base rounded-xl text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md placeholder-text-secondary transition-shadow" 
                        id="password" 
                        placeholder="••••••••" 
                        required 
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center mt-4">
                    <input 
                      className="h-4 w-4 text-primary-container focus:ring-primary-container border-border-base rounded text-primary" 
                      id="terms" 
                      required 
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                    />
                    <label className="ml-2 block font-body-sm text-body-sm text-text-secondary" htmlFor="terms">
                      I agree to the <Link className="text-primary hover:underline" to="/terms">Terms of Service</Link> and <Link className="text-primary hover:underline" to="/privacy">Privacy Policy</Link>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm font-label-md text-label-md text-on-primary bg-primary-container hover:bg-surface-tint focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50" type="submit">
                      {loading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : null}
                      Create Account
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
