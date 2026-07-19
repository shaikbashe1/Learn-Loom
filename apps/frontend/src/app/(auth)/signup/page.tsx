'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { Lock, Mail, User, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Password strength meter states
  const [strength, setStrength] = useState({ score: 0, text: 'Weak', color: 'bg-rose-500' });
  
  useEffect(() => {
    if (!password) {
      setStrength({ score: 0, text: 'Empty', color: 'bg-slate-800' });
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    let text = 'Weak';
    let color = 'bg-rose-500';
    if (score === 2) { text = 'Fair'; color = 'bg-amber-500'; }
    if (score === 3) { text = 'Good'; color = 'bg-indigo-500'; }
    if (score === 4) { text = 'Strong'; color = 'bg-emerald-500'; }

    setStrength({ score, text, color });
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    const result = await signUp(email, password, fullName);
    setLoading(false);

    if (result.success) {
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 font-sans select-none overflow-hidden relative">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Left Panel (Desktop-only) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-12 flex-col justify-between relative border-r border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-bold text-white text-base">LL</span>
          </div>
          <span className="font-bold text-lg text-slate-100 tracking-tight">LEARNLoom</span>
        </div>

        <div className="space-y-6 max-w-lg">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            Curriculum Seeding Enabled
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Build your skills. Validate your knowledge.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Gain access to our textbook-quality structured chapters, dynamic timed exam modules, Piston compilers playground, and complete personal study guides.
          </p>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-slate-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Interactive CLI Command Sandboxes</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>13 Question Types Dynamic Assessments</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Cryptographic QR-Verified PDF Certificates</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          © 2026 Quovexi. All rights reserved. Secure SSL 256-bit encryption.
        </div>
      </div>

      {/* Auth Right Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 p-8 sm:p-10 rounded-3xl shadow-2xl relative">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white tracking-tight">Create your account</h2>
            <p className="text-slate-400 text-xs mt-1.5">Enter details below to launch your technical learning profile.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-2xl animate-fade-in">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-2xl animate-fade-in">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Bashe Shaik"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="student@quovexi.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                />
              </div>

              {/* Password Strength Meter */}
              {password && (
                <div className="space-y-1.5 pt-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-500">PASSWORD STRENGTH</span>
                    <span className="text-indigo-400 uppercase">{strength.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((stepValue) => (
                      <div
                        key={stepValue}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          stepValue <= strength.score ? strength.color : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:brightness-110 active:scale-[0.99] transition-all text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Register Profile <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
            <span className="text-slate-400 text-xs">Already have an account? </span>
            <Link href="/login" className="text-xs font-bold text-indigo-400 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
