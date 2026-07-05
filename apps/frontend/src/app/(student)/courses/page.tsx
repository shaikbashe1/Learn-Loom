'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { 
  BookOpen, 
  Search, 
  Loader2, 
  Compass, 
  Star,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError('');
      
      let path = '/courses';
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (difficultyFilter) params.append('difficulty', difficultyFilter);
      
      const queryStr = params.toString();
      if (queryStr) path += `?${queryStr}`;

      const res = await api.get(path);
      setCourses(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [difficultyFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCourses();
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none text-slate-100 p-6 sm:p-12 relative overflow-hidden">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Banner Section */}
        <section className="bg-slate-900/60 border border-slate-800/80 backdrop-blur rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" /> Course Catalog
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Explore Technical Paths</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Launch your career in networking systems, routing architecture, cybersecurity operations, and systems programming.
            </p>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/30 border border-slate-850 p-4 rounded-2xl">
          
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search Cisco NetAcad blueprints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition font-medium"
            />
          </form>

          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            {['', 'Beginner', 'Intermediate', 'Advanced'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                  difficultyFilter === diff 
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/10' 
                    : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-white'
                }`}
              >
                {diff || 'All Levels'}
              </button>
            ))}
          </div>
        </section>

        {/* Catalog Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-slate-900/20 border border-rose-500/10 text-rose-400 text-sm font-semibold rounded-2xl">
            {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
            <p className="text-slate-500 text-xs font-semibold">No courses found matching criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Link 
                key={course.id}
                href={`/courses/${course.id}`}
                className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 p-6 rounded-3xl flex flex-col justify-between gap-6 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {course.difficulty}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500" /> {course.rating.toFixed(1)}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-indigo-400 transition-colors">
                    {course.title}
                  </h3>
                  
                  <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                    {course.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-850/60 pt-4 mt-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Core Syllabus
                  </span>
                  
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1 hover:underline">
                    View outline <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
