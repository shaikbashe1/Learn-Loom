'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { 
  Trophy, 
  Flame, 
  Loader2, 
  Award,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/gamification/leaderboard');
        setBoard(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load leaderboard data.');
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  // Split top 3 podium users
  const top3 = board.slice(0, 3);
  const rest = board.slice(3);

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none text-slate-100 p-6 sm:p-12 relative overflow-hidden">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Banner */}
        <section className="bg-slate-900/60 border border-slate-800/80 backdrop-blur rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" /> Honor Roll
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Global Leaderboard</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Earn XP credits by completing NetAcad textbook readings, timed quiz assessments, and coding playground challenges.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-slate-900/20 border border-rose-500/10 text-rose-400 text-sm font-semibold rounded-2xl">
            {error}
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Top 3 Podium layout */}
            {top3.length > 0 && (
              <div className="flex flex-col sm:flex-row items-end justify-center gap-4 pt-6">
                
                {/* 2nd Place */}
                {top3[1] && (
                  <div className="w-full sm:w-48 bg-slate-900/50 border border-slate-850 p-6 rounded-3xl text-center flex flex-col items-center justify-between gap-4 h-56 order-2 sm:order-1">
                    <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-850 font-bold font-mono text-sm relative">
                      2
                      <div className="absolute -bottom-1 -right-1 bg-slate-700 text-white rounded-full p-0.5 text-[8px] font-bold">2nd</div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{top3[1].fullName}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">{top3[1].credits} XP</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                      <Flame className="w-3.5 h-3.5 fill-amber-500" /> {top3[1].streakDays} Days
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="w-full sm:w-56 bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border border-indigo-500/20 p-8 rounded-3xl text-center flex flex-col items-center justify-between gap-4 h-64 order-1 sm:order-2 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/10">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/30 font-bold font-mono text-lg relative">
                      1
                      <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-1 text-[8px] font-bold">1st</div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-white truncate max-w-[150px]">{top3[0].fullName}</h4>
                      <p className="text-xs text-indigo-400 font-bold font-mono">{top3[0].credits} XP</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                      <Flame className="w-4 h-4 fill-amber-500" /> {top3[0].streakDays} Days Streak
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div className="w-full sm:w-48 bg-slate-900/50 border border-slate-850 p-6 rounded-3xl text-center flex flex-col items-center justify-between gap-4 h-52 order-3">
                    <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center text-amber-700 border border-slate-850 font-bold font-mono text-sm relative">
                      3
                      <div className="absolute -bottom-1 -right-1 bg-amber-800 text-white rounded-full p-0.5 text-[8px] font-bold">3rd</div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{top3[2].fullName}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">{top3[2].credits} XP</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                      <Flame className="w-3.5 h-3.5 fill-amber-500" /> {top3[2].streakDays} Days
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Remaining Ranks Table */}
            {rest.length > 0 && (
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px] bg-slate-950/20">
                        <th className="p-4 pl-6">Rank</th>
                        <th className="p-4">Student</th>
                        <th className="p-4 text-right">Streak</th>
                        <th className="p-4 pr-6 text-right">Score Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((user) => (
                        <tr 
                          key={user.rank}
                          className="border-b border-slate-850/60 hover:bg-slate-900/20 transition-colors text-slate-300"
                        >
                          <td className="p-4 pl-6 font-mono text-slate-500 font-bold">#{user.rank}</td>
                          <td className="p-4">
                            <span className="font-bold text-slate-200 block">{user.fullName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">@{user.username}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                              <Flame className="w-3.5 h-3.5 fill-amber-500" /> {user.streakDays}d
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right font-mono font-bold text-indigo-400">{user.credits} XP</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
