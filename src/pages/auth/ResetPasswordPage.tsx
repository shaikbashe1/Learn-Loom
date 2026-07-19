import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PasswordCriteria {
  minChar: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
}

function checkPasswordCriteria(pw: string): PasswordCriteria {
  return {
    minChar: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasDigit: /\d/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  };
}

function getPasswordStrength(criteria: PasswordCriteria): { label: string; percent: number; color: string; textColor: string } {
  let score = 0;
  if (criteria.minChar) score += 1;
  if (criteria.hasUpper) score += 1;
  if (criteria.hasLower) score += 1;
  if (criteria.hasDigit) score += 1;
  if (criteria.hasSpecial) score += 1;

  if (score === 0) return { label: '', percent: 0, color: '', textColor: '' };
  if (score <= 2) return { label: 'Weak Password', percent: score * 20, color: 'bg-destructive', textColor: 'text-destructive' };
  if (score <= 4) return { label: 'Good Password', percent: score * 20, color: 'bg-amber-500', textColor: 'text-amber-500' };
  return { label: 'Strong Password', percent: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500' };
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Validation States
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Password criteria checklist & strength calculations
  const criteria = useMemo(() => checkPasswordCriteria(password), [password]);
  const strength = useMemo(() => getPasswordStrength(criteria), [criteria]);

  // Handle Caps Lock
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  // Validation functions
  const validatePassword = (val: string) => {
    if (!val) return 'Password is required';
    const check = checkPasswordCriteria(val);
    if (!check.minChar || !check.hasUpper || !check.hasLower || !check.hasDigit || !check.hasSpecial) {
      return 'Password does not meet all security requirements';
    }
    return '';
  };

  const validateConfirmPassword = (val: string, pw: string) => {
    if (!val) return 'Please confirm your password';
    if (val !== pw) return 'Passwords do not match';
    return '';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordTouched) setPasswordError(validatePassword(val));
    if (confirmPasswordTouched) setConfirmPasswordError(validateConfirmPassword(confirmPassword, val));
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);
    if (confirmPasswordTouched) setConfirmPasswordError(validateConfirmPassword(val, password));
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));
  };

  const handleConfirmPasswordBlur = () => {
    setConfirmPasswordTouched(true);
    setConfirmPasswordError(validateConfirmPassword(confirmPassword, password));
  };

  const isFormValid = !validatePassword(password) && !validateConfirmPassword(confirmPassword, password);

  // Supabase sends a PKCE recovery token via hash fragment — listen for recovery event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        toast.info('Enter your new password below.');
      }
    });

    // Check if recovery session exists
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // No recovery session -> either expired, invalid, or accessed directly without token
        setTokenExpired(true);
        toast.error('Invalid or Expired Token', { description: 'Please request a new password reset link.' });
      }
    };
    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    const pErr = validatePassword(password);
    const cpErr = validateConfirmPassword(confirmPassword, password);

    if (pErr || cpErr) {
      setPasswordError(pErr);
      setConfirmPasswordError(cpErr);
      if (pErr && passwordRef.current) passwordRef.current.focus();
      else if (cpErr && confirmPasswordRef.current) confirmPasswordRef.current.focus();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) {
        toast.error('Failed to reset password', { description: error.message });
      } else {
        setDone(true);
        toast.success('Password updated successfully!');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    } catch (err) {
      setLoading(false);
      toast.error('Network failure', { description: 'Please check your connection and try again.' });
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chart-4/5 blur-[120px] pointer-events-none z-0" />

      <main className="w-full max-w-[440px] relative z-10 py-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 no-underline justify-center mb-2" aria-label="Go to Homepage">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
              <img src="/images/logo/logo-icon-light.png" alt="Quovexi Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-display text-xl font-bold text-foreground tracking-tight">Quovexi</span>
          </Link>
          <p className="text-xs text-muted-foreground font-semibold">Engineer your potential.</p>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border rounded-3xl shadow-xl p-6 sm:p-8 flex flex-col items-center relative">
          {done ? (
            <div className="text-center py-4 w-full">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">Password updated!</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6 font-semibold">
                Your password has been successfully updated. Redirecting you to sign in...
              </p>
              
              <Link 
                to="/login" 
                className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-xl font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex justify-center items-center min-h-[44px] shadow-md shadow-primary/10 text-xs focus:outline-none"
              >
                Go to Sign In
              </Link>
            </div>
          ) : tokenExpired ? (
            <div className="text-center py-4 w-full">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-6 border border-destructive/20">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">Invalid or Expired Link</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6 font-semibold">
                This password reset link is invalid, expired, or has already been used. Please request a new one.
              </p>
              
              <Link 
                to="/forgot-password" 
                className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-xl font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex justify-center items-center min-h-[44px] shadow-md shadow-primary/10 text-xs focus:outline-none"
              >
                Request Reset Link
              </Link>
            </div>
          ) : (
            <div className="w-full">
              <div className="mb-6">
                <h2 className="text-base font-bold text-foreground mb-1">Set new password</h2>
                <p className="text-xs text-muted-foreground font-semibold">
                  Enter your new secure password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Password Field */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground" htmlFor="password">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input 
                      ref={passwordRef}
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyDown}
                      className={`w-full pl-11 pr-11 py-2.5 rounded-xl border bg-background focus:ring-2 focus:outline-none transition-all duration-200 text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[42px] font-semibold ${
                        passwordTouched && passwordError 
                          ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' 
                          : 'border-border focus:ring-primary/20 focus:border-primary'
                      }`}
                      aria-invalid={!!passwordError}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors min-w-[40px] justify-center focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordTouched && passwordError && (
                    <p className="text-destructive text-[10px] font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {passwordError}
                    </p>
                  )}
                  {capsLockActive && (
                    <p className="text-amber-500 text-[9px] font-bold mt-1">⚠️ Caps Lock is ON</p>
                  )}

                  {/* Password Strength Meter & Live Checklist */}
                  {password && (
                    <div className="pt-2 space-y-2 animate-in fade-in duration-200">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-muted-foreground">Password Strength</span>
                        <span className={strength.textColor}>{strength.label}</span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.percent}%` }} />
                      </div>

                      {/* Live Checklist */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                          <span className={criteria.minChar ? 'text-emerald-500' : 'text-muted-foreground/50'}>
                            {criteria.minChar ? '✓' : '✗'} 8+ characters
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                          <span className={criteria.hasUpper ? 'text-emerald-500' : 'text-muted-foreground/50'}>
                            {criteria.hasUpper ? '✓' : '✗'} Uppercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                          <span className={criteria.hasLower ? 'text-emerald-500' : 'text-muted-foreground/50'}>
                            {criteria.hasLower ? '✓' : '✗'} Lowercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                          <span className={criteria.hasDigit ? 'text-emerald-500' : 'text-muted-foreground/50'}>
                            {criteria.hasDigit ? '✓' : '✗'} One number
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold col-span-2">
                          <span className={criteria.hasSpecial ? 'text-emerald-500' : 'text-muted-foreground/50'}>
                            {criteria.hasSpecial ? '✓' : '✗'} One special character (e.g. !@#$)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground" htmlFor="confirm">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input 
                      ref={confirmPasswordRef}
                      id="confirm" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      placeholder="Repeat your new password"
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      onBlur={handleConfirmPasswordBlur}
                      className={`w-full pl-11 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:outline-none transition-all duration-200 text-xs text-foreground placeholder:text-muted-foreground/60 min-h-[42px] font-semibold ${
                        confirmPasswordTouched && confirmPasswordError 
                          ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' 
                          : 'border-border focus:ring-primary/20 focus:border-primary'
                      }`}
                      aria-invalid={!!confirmPasswordError}
                    />
                  </div>
                  {confirmPasswordTouched && confirmPasswordError && (
                    <p className="text-destructive text-[10px] font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> {confirmPasswordError}
                    </p>
                  )}
                </div>

                {/* Primary Action */}
                <Button 
                  type="submit" 
                  disabled={loading || !isFormValid}
                  className="w-full h-11 bg-primary text-primary-foreground py-3 px-6 rounded-xl font-bold hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex justify-center items-center gap-2 shadow-md shadow-primary/10 mt-6 focus:outline-none"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Resetting password...</span>
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </div>
          )}
          
          {/* Trust Badge */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-muted-foreground w-full">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-semibold">Secured with enterprise-grade encryption</span>
          </div>
        </div>
      </main>
    </div>
  );
}
