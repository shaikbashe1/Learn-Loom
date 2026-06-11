import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to send reset link', { description: error.message });
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — navy branding */}
      <div className="hidden lg:flex lg:w-2/5 bg-secondary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">LearnLoom</h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-xs text-pretty">
            We'll send a secure link to your email so you can reset your password.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">LearnLoom</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground text-balance">
              {submitted ? 'Check your email' : 'Reset your password'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {submitted
                ? `We sent a reset link to ${email}`
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          <Card className="bg-card border-border shadow-md">
            <CardContent className="p-6">
              {submitted ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty">
                    Didn't receive it? Check your spam folder or{' '}
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      try again
                    </button>
                  </p>
                  <Link to="/login">
                    <Button className="w-full bg-secondary text-white hover:bg-secondary/90 h-11">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 bg-background border-border text-foreground"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-secondary text-white hover:bg-secondary/90 h-11 font-medium shadow-sm"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Send Reset Link
                  </Button>
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Sign In
                  </Link>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

