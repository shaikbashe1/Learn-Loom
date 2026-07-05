'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { 
  Award, 
  ExternalLink, 
  Download, 
  Loader2, 
  ShieldCheck, 
  Compass,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function CertificatesPage() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCerts = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/certificates');
        setCerts(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load certificates.');
      } finally {
        setLoading(false);
      }
    };

    loadCerts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none text-slate-100 p-6 sm:p-12 relative overflow-hidden">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Banner Section */}
        <section className="bg-slate-900/60 border border-slate-800/80 backdrop-blur rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Verification Center
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Your Certificate Portfolio</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Cryptographically signed certificate credentials verifying your mastery in cloud architecture and computer networks routing protocols.
            </p>
          </div>
        </section>

        {/* Portfolio Grids */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-slate-900/20 border border-rose-500/10 text-rose-400 text-sm font-semibold rounded-2xl">
            {error}
          </div>
        ) : certs.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-850 rounded-3xl bg-slate-900/10 space-y-4">
            <Award className="w-12 h-12 text-slate-700 mx-auto" />
            <p className="text-slate-500 text-xs font-semibold">No certificates generated yet.</p>
            <Link href="/courses" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:underline">
              Complete a course syllabus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certs.map((c) => (
              <div 
                key={c.id}
                className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl flex flex-col justify-between gap-6 hover:border-slate-850 transition relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">{c.verificationCode}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white leading-snug">{c.course.title}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold">Issued on: {new Date(c.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-850/60">
                  <Link
                    href={`/verify/${c.verificationCode}`}
                    target="_blank"
                    className="flex-1 py-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-xl text-[10px] font-extrabold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Public Link
                  </Link>

                  <button
                    onClick={() => alert('Svg file download initiated.')}
                    className="flex-1 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-[10px] font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download SVG
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
