'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { 
  Users, 
  Search, 
  Loader2, 
  ShieldAlert,
  Settings,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/students');
      setStudents(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch student lists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleToggleSuspend = async (studentId: string) => {
    try {
      await api.post(`/admin/students/${studentId}/suspend`);
      alert('Student account suspension status toggled successfully.');
      loadStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed.');
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none text-slate-100 p-6 sm:p-12 relative overflow-hidden">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation back */}
        <Link 
          href="/admin/dashboard" 
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin overview
        </Link>

        {/* Header and Search */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" /> Student Directory
            </h1>
            <p className="text-slate-500 text-xs mt-1">Manage, audit, and toggle active status parameters on student accounts.</p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search directory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </section>

        {/* Directory lists table */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-20 border border-slate-850 rounded-2xl bg-slate-900/10 text-slate-500 text-xs font-semibold">
            No students found matching filters.
          </div>
        ) : (
          <div className="bg-slate-900/30 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px] bg-slate-950/20">
                    <th className="p-4 pl-6">Full Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4 text-center">Score Credits</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr 
                      key={s.id}
                      className="border-b border-slate-850/60 hover:bg-slate-900/20 transition-colors text-slate-300"
                    >
                      <td className="p-4 pl-6">
                        <span className="font-bold text-slate-200 block">{s.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">@{s.username}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-400">{s.email}</td>
                      <td className="p-4 text-center font-mono font-bold text-indigo-400">{s.credits} XP</td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleToggleSuspend(s.id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold transition"
                        >
                          Suspend
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
