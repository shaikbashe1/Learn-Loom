'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../services/api';
import { 
  Award, 
  BookOpen, 
  Clock, 
  Loader2, 
  Play, 
  CheckCircle,
  FileText,
  Star
} from 'lucide-react';
import Link from 'next/link';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();

  const courseId = params.slug as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/courses/${courseId}`);
        setCourse(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load course details.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      await api.post(`/courses/${courseId}/enroll`);
      
      // Navigate to the first lesson
      const firstLesson = course?.modules[0]?.chapters[0]?.lessons[0];
      if (firstLesson) {
        router.push(`/courses/${courseId}/learn/${firstLesson.id}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to enroll.');
    } finally {
      setEnrolling(false);
    }
  };

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
        <p className="text-rose-400 text-sm font-semibold mb-4">{error}</p>
        <Link href="/courses" className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold hover:bg-slate-850 transition">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const lessonsCount = course?.modules.flatMap((m: any) => m.chapters.flatMap((c: any) => c.lessons)).length || 0;

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none text-slate-100 p-6 sm:p-12 relative overflow-hidden">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
          <span>/</span>
          <Link href="/courses" className="hover:text-white transition">Courses</Link>
          <span>/</span>
          <span className="text-slate-400 font-semibold">{course?.title}</span>
        </div>

        {/* Hero Card */}
        <section className="bg-slate-900/60 border border-slate-800/80 backdrop-blur rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="space-y-4 relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
              {course?.difficulty}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">{course?.title}</h1>
            <p className="text-slate-400 text-sm leading-relaxed">{course?.description}</p>
            
            <div className="flex items-center gap-5 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-400" /> {lessonsCount} Lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" /> ~10 Hours
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {course?.rating.toFixed(1)} Ratings
              </span>
            </div>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto">
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {enrolling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start Learning Path
                </>
              )}
            </button>
          </div>
        </section>

        {/* Syllabus Modules Accordion */}
        <section className="space-y-4">
          <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Syllabus Blueprint
          </h2>

          <div className="space-y-4">
            {course?.modules.map((mod: any) => (
              <div 
                key={mod.id} 
                className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Module {mod.order}
                    </span>
                    <h3 className="text-sm font-bold text-white leading-snug">{mod.title}</h3>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{mod.description}</p>
                  </div>
                </div>

                <div className="pl-4 border-l border-slate-850 mt-4 space-y-2">
                  {mod.chapters.flatMap((c: any) => c.lessons).map((les: any) => (
                    <div 
                      key={les.id}
                      className="flex items-center justify-between py-1.5 text-xs text-slate-400 font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-slate-600" /> {les.title}
                      </span>
                      <CheckCircle className="w-4 h-4 text-slate-800" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
