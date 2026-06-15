import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  // Supabase sends a PKCE recovery token via hash fragment — listen for the session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is now in a password-recovery session — allow them to set a new password
        toast.info('Enter your new password below.');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error('Failed to reset password', { description: error.message });
    } else {
      setDone(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      {/* Abstract Background */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(192,193,255,0.05)_0%,rgba(19,19,21,1)_70%)] -z-20 pointer-events-none"></div>
      
      {/* Nebula Blobs */}
      <div className="fixed rounded-full blur-[100px] opacity-30 -z-10 animate-[pulse_10s_ease-in-out_infinite_alternate]" style={{ top: '-10%', left: '20%', width: '40vw', height: '40vw', background: 'rgba(128, 131, 255, 0.15)' }}></div>
      <div className="fixed rounded-full blur-[100px] opacity-30 -z-10 animate-[pulse_12s_ease-in-out_infinite_alternate_reverse]" style={{ bottom: '-10%', right: '10%', width: '50vw', height: '50vw', background: 'rgba(221, 183, 255, 0.1)' }}></div>

      <main className="w-full max-w-md relative z-10 py-2xl">
        {/* Brand Header */}
        <div className="text-center mb-2xl">
          <h1 className="font-display text-display text-primary tracking-tight mb-sm">LearnLoom</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Engineer your potential.</p>
        </div>

        <div className="bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/60 rounded-xl p-xl sm:p-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative group transition-all duration-300 hover:border-outline-variant">
          {done ? (
            <div className="text-center py-sm space-y-md">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-md">
                <span className="material-symbols-outlined text-[32px] text-primary">check_circle</span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Password updated!</h2>
              <p className="font-body-md text-body-md text-on-surface-variant text-pretty mb-xl">
                Your password has been successfully updated. Redirecting you to sign in...
              </p>
              
              <Link to="/login" className="block w-full bg-primary text-on-primary font-label-md text-label-md rounded-full py-md hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(192,193,255,0.2)]">
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-xl text-center">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Set new password</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
                {/* Password Field */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-sm" htmlFor="password">NEW_AUTH_KEY</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                    <input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md pl-[3.5rem] pr-12 font-body-md text-body-md placeholder:text-outline transition-all duration-200" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-sm" htmlFor="confirm">VERIFY_NEW_AUTH_KEY</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                    <input 
                      id="confirm" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      placeholder="Repeat your new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`w-full bg-surface-container border ${confirmPassword && password !== confirmPassword ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'} text-on-surface focus:bg-surface-container-high focus:outline-none focus:ring-1 rounded-full py-md pl-[3.5rem] pr-12 font-body-md text-body-md placeholder:text-outline transition-all duration-200`} 
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-error font-label-sm mt-xs">Keys do not match</p>
                  )}
                </div>

                {/* Primary Action */}
                <button 
                  type="submit" 
                  disabled={loading || !password || !confirmPassword}
                  className="w-full bg-primary text-on-primary font-headline-md text-headline-md rounded-full py-md mt-sm hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center gap-sm"
                >
                  {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : null}
                  Update Password
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
