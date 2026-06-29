import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw 
} from 'lucide-react';

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
        toast.info('Enter your new password below.');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password too short', { description: 'Password must be at least 6 characters.' });
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
    <div className="bg-background text-foreground min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chart-4/5 blur-[120px] pointer-events-none z-0" />

      <main className="w-full max-w-md relative z-10 py-12 flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 no-underline justify-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
              <img src="/images/logo/logo-icon-light.png" alt="LearnLoom Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-display text-xl font-bold text-foreground tracking-tight">LearnLoom</span>
          </Link>
          <p className="text-xs text-muted-foreground">Engineer your potential.</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="w-full bg-card/60 backdrop-blur-xl border border-border rounded-3xl shadow-2xl p-8 sm:p-10 flex flex-col items-center relative group">
          {done ? (
            <div className="text-center py-4 w-full">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-500/5">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Password updated!</h2>
              <p className="font-body-md text-sm text-muted-foreground leading-relaxed mb-6">
                Your password has been successfully updated. Redirecting you to sign in...
              </p>
              
              <Link 
                to="/login" 
                className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-xl font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex justify-center items-center min-h-[44px] shadow-md shadow-primary/10"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <div className="w-full">
              <div className="mb-6 text-center">
                <h2 className="font-display text-xl font-bold text-foreground mb-2">Set new password</h2>
                <p className="font-body-md text-sm text-muted-foreground">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2" htmlFor="password">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 min-h-[44px]" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors min-w-[40px] justify-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2" htmlFor="confirm">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input 
                      id="confirm" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      placeholder="Repeat your new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`w-full pl-11 pr-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-all duration-200 min-h-[44px] ${
                        confirmPassword && password !== confirmPassword 
                          ? 'border-destructive focus:ring-2 focus:ring-destructive/20 focus:border-destructive' 
                          : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                      }`} 
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-destructive text-[11px] font-bold mt-1.5">Passwords do not match</p>
                  )}
                </div>

                {/* Primary Action */}
                <button 
                  type="submit" 
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                  className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-xl font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-primary/10 mt-6 min-h-[44px]"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
