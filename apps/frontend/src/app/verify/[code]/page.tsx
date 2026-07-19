'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../services/api';
import { 
  Award, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FileText,
  User,
  Calendar,
  Layers
} from 'lucide-react';
import Link from 'next/link';

export default function CertVerifyPage() {
  const params = useParams();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!code) return;

    const verify = async () => {
      try {
        setLoading(true);
        setError('');
        // No tokens needed, public endpoint
        const res = await api.get(`/certificates/verify/${code}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Verification failed. Credentials invalid.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6 sm:p-12 font-sans select-none relative overflow-hidden">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6 text-center">
        
        {error ? (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-white">Invalid Certificate</h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
              {error}. Check the URL parameter string or submit a ticket to the Quovexi support team.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">Verified Credential</h2>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider font-extrabold">
                Active Certification
              </span>
            </div>

            {/* Certificate Holder Info */}
            <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-2xl text-left space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Recipient</span>
                  <span className="text-xs font-bold text-slate-200">{data?.recipientName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Course Title</span>
                  <span className="text-xs font-bold text-slate-200">{data?.courseTitle}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Issued Date</span>
                  <span className="text-xs font-bold text-slate-200">{new Date(data?.issuedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Verify Hash ID</span>
                  <span className="text-xs font-mono font-bold text-slate-400">{data?.verificationCode}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-slate-850 pt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:underline">
            Go to Quovexi Platform
          </Link>
        </div>
      </div>
    </div>
  );
}
