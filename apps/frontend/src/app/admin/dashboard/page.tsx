'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { 
  Users, 
  Award, 
  BookOpen, 
  Activity, 
  Loader2, 
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Settings
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/admin/stats');
        setStats(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unauthorized admin access.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <ShieldAlert className="w-12 h-12 text-rose-400 mb-4" />
        <p className="text-rose-400 text-sm font-semibold mb-4">{error}</p>
        <Link href="/dashboard" className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold hover:bg-slate-850 transition">
          Return to Student Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none text-slate-100 p-6 sm:p-12 relative overflow-hidden">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Banner */}
        <section className="bg-slate-900/60 border border-slate-800/80 backdrop-blur rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
              <Settings className="w-3.5 h-3.5" /> Administrative Suite
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Console Overview</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Monitor student statistics, evaluate curriculum publishing pipelines, and audit authentication log security.
            </p>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Students</span>
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-3xl font-extrabold text-white block">{stats?.totalStudents}</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Credentials</span>
              <Award className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-3xl font-extrabold text-white block">{stats?.activeCertificates}</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Catalog Sizes</span>
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-3xl font-extrabold text-white block">{stats?.totalCourses} Courses</span>
          </div>
        </section>

        {/* Split Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* Quick links list */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl flex flex-col gap-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Management Panels</h3>
            <div className="space-y-2">
              <Link 
                href="/admin/students"
                className="w-full p-3 bg-slate-950/40 hover:bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-400 hover:text-white flex items-center justify-between transition"
              >
                <span>Students Listing</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Audit Logs list */}
          <div className="md:col-span-2 bg-slate-900/40 border border-slate-850 p-6 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-400" /> Administrative Audit Logs
            </h3>

            <div className="space-y-3">
              {stats?.recentActivity.map((log: any) => (
                <div 
                  key={log.id}
                  className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between text-xs text-slate-400 font-medium"
                >
                  <div className="truncate pr-3">
                    <span className="font-bold text-slate-200 block">{log.email}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{log.action}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-bold shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
