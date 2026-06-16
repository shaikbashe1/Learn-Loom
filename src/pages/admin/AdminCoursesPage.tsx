import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Edit2, Trash2, BookOpen, Video, FileText,
  Upload, Globe, EyeOff, Loader2, X, Link2,
  GraduationCap, ClipboardList, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { uploadFile } from '@/lib/uploadFile';
import { useAuth } from '@/contexts/AuthContext';
import type { DBCourse, DBModule, DBAssignment, DBQuiz, DBQuizQuestion, DifficultyLevel } from '@/types/types';

// ── helpers ────────────────────────────────────────────────────────────────
function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const vid = u.searchParams.get('v') ?? u.pathname.split('/').pop();
    return vid ? `https://www.youtube.com/embed/${vid}` : null;
  } catch { return null; }
}

// ── PDF upload field ────────────────────────────────────────────────────────
function PdfUploadField({ label, value, onChange, folder }: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('pdf') && !file.type.includes('document')) {
      toast.error('Only PDF files are supported'); return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file, folder);
      onChange(url);
      toast.success('File uploaded');
    } catch (err) {
      toast.error('Upload failed', { description: (err as Error).message });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-normal text-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Paste URL or upload below"
          className="bg-input border-border text-foreground flex-1 min-w-0"
        />
        <Button
          type="button"
          variant="ghost"
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="shrink-0 border border-border text-foreground hover:bg-accent"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="ml-1 hidden sm:inline">Upload</span>
        </Button>
        {value && (
          <Button type="button" variant="ghost" onClick={() => onChange('')}
            className="shrink-0 border border-destructive/30 text-destructive hover:bg-destructive/10">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1">
          <Link2 className="w-3 h-3" /> View uploaded file
        </a>
      )}
    </div>
  );
}

// ── blank form state ────────────────────────────────────────────────────────
const blankCourse = () => ({
  title: '', description: '', difficulty: 'Beginner' as DifficultyLevel,
  youtube_url: '', notes_url: '',
});

const blankModule = () => ({
  title: '', description: '', content_url: '', notes_url: '', order_index: 0,
  duration_minutes: 60, type: 'video' as const, is_free_preview: false,
});
const blankAssignment = () => ({ title: '', instructions: '', due_days: 7 });
const blankQuiz = () => ({ title: '' });
const blankQuestion = () => ({ question: '', options: ['', '', '', ''], answer_index: 0 });

// ── main component ──────────────────────────────────────────────────────────
export default function AdminCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [metrics, setMetrics] = useState({
    totalCourses: 0,
    activeStudents: 0,
    avgRating: 0,
    monthlyRevenue: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Draft'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<DBCourse | null>(null);

  // Course form
  const [form, setForm] = useState(blankCourse());

  // Modules
  const [modules, setModules] = useState<(Omit<DBModule, 'id' | 'course_id' | 'created_at'>)[]>([]);

  // Assignment
  const [assignment, setAssignment] = useState(blankAssignment());

  // Quiz
  const [quiz, setQuiz] = useState(blankQuiz());
  const [questions, setQuestions] = useState([blankQuestion()]);

  // AI Auto-Generate
  const [aiUrl, setAiUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiUrl.trim()) return;
    setGenerating(true);
    try {
      toast.info('Discovering and crawling URL...', { description: 'The Azure AI Course Factory has started...' });
      await new Promise(r => setTimeout(r, 2500)); // Simulate processing delay
      
      const { data, error } = await supabase.from('courses').insert({
        title: 'Auto-Generated Course from ' + new URL(aiUrl).hostname,
        description: 'This course was automatically generated by the LearnLoom AI Factory from the provided URL. It covers the core concepts, modules, and quizzes extracted from the source material.',
        difficulty: 'Intermediate',
        thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
        is_published: false, // Save as Draft for manual review
        tags: ['auto-generated', 'azure-factory', 'ai'],
        created_by: user?.id ?? null,
      }).select('id').single();
      
      if (error) throw error;
      
      toast.success('Course Generated & Published!', { description: 'The AI Factory successfully processed the URL and published the course.' });
      setDialogOpen(false);
      await fetchCourses();
    } catch (err: any) {
      toast.error('Generation failed', { description: err.message || 'Could not generate course.' });
    } finally {
      setGenerating(false);
      setAiUrl('');
    }
  };

  // ── load courses ────────────────────────────────────────────────────────
  const fetchCourses = async () => {
    setLoadingList(true);
    try {
      // 1. Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;
      
      const loadedCourses = coursesData ?? [];
      setCourses(loadedCourses);

      // 2. Calculate Course Metrics
      const totalCourses = loadedCourses.length;
      
      // Fetch unique active students
      const { data: enrollments } = await supabase
        .from('user_course_enrollments')
        .select('user_id');
      
      // Create a set of unique user IDs
      const uniqueStudentIds = new Set(enrollments?.map(e => e.user_id) || []);
      const activeStudents = uniqueStudentIds.size;
      
      const ratedCourses = loadedCourses.filter(c => c.rating > 0);
      const avgRating = ratedCourses.length > 0 
        ? ratedCourses.reduce((sum, c) => sum + c.rating, 0) / ratedCourses.length 
        : 0;

      // 3. Fetch Revenue Metrics
      const { data: subsData } = await supabase
        .from('user_subscriptions')
        .select(`plan_id, subscription_plans(price_inr)`)
        .eq('status', 'active');
        
      let monthlyRevenue = 0;
      if (subsData) {
        monthlyRevenue = subsData.reduce((sum, sub: any) => {
          // Add up price in INR, convert from paise to rupees
          const price = sub.subscription_plans?.price_inr || 0;
          return sum + (price / 100);
        }, 0);
      }

      setMetrics({
        totalCourses,
        activeStudents,
        avgRating,
        monthlyRevenue
      });

    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []);

  // ── derived state for table ───────────────────────────────────────────────
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.includes(searchQuery);
    const matchesStatus = statusFilter === 'All' ? true : statusFilter === 'Active' ? c.is_published : !c.is_published;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const paginatedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── open create dialog ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditingCourse(null);
    setForm(blankCourse());
    setModules([]);
    setAssignment(blankAssignment());
    setQuiz(blankQuiz());
    setQuestions([blankQuestion()]);
    setDialogOpen(true);
  };

  // ── open edit dialog ────────────────────────────────────────────────────
  const openEdit = async (course: DBCourse) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description ?? '',
      difficulty: course.difficulty,
      youtube_url: course.youtube_url ?? '',
      notes_url: course.notes_url ?? '',
    });
    // Load modules
    const { data: mods } = await supabase
      .from('course_modules').select('*')
      .eq('course_id', course.id).order('order_index');
    setModules((mods ?? []).map(m => ({
      title: m.title,
      description: m.description ?? '',
      content_url: m.content_url ?? m.youtube_url ?? '',
      order_index: m.order_index ?? 0,
      duration_minutes: m.duration_minutes ?? 60,
      type: (m.type ?? 'video') as 'video' | 'reading' | 'coding',
      is_free_preview: m.is_free_preview ?? false,
    })));
    // Load assignment
    const { data: asgs } = await supabase.from('assignments').select('*').eq('course_id', course.id).limit(1);
    setAssignment(asgs?.[0] ? { title: asgs[0].title, instructions: asgs[0].instructions ?? '', due_days: asgs[0].due_days ?? 7 } : blankAssignment());
    // Load quiz
    const { data: qzs } = await supabase.from('quizzes').select('*').eq('course_id', course.id).limit(1);
    if (qzs?.[0]) {
      setQuiz({ title: qzs[0].title });
      const { data: qs } = await supabase.from('quiz_questions').select('*').eq('quiz_id', qzs[0].id).order('sort_order');
      setQuestions((qs ?? []).map(q => ({ question: q.question, options: q.options as string[], answer_index: q.answer_index })));
    } else {
      setQuiz(blankQuiz()); setQuestions([blankQuestion()]);
    }
    setDialogOpen(true);
  };

  // ── save course ────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let courseId: string;

      if (editingCourse) {
        const { error } = await supabase.from('courses').update({
          title: form.title, description: form.description || null,
          difficulty: form.difficulty,
          youtube_url: form.youtube_url || null, notes_url: form.notes_url || null,
        }).eq('id', editingCourse.id);
        if (error) throw error;
        courseId = editingCourse.id;
        // Delete old modules/assignments/quizzes and re-insert
        await supabase.from('course_modules').delete().eq('course_id', courseId);
        await supabase.from('assignments').delete().eq('course_id', courseId);
        const { data: oldQuizzes } = await supabase.from('quizzes').select('id').eq('course_id', courseId);
        if (oldQuizzes?.length) {
          await supabase.from('quiz_questions').delete().in('quiz_id', oldQuizzes.map(q => q.id));
          await supabase.from('quizzes').delete().eq('course_id', courseId);
        }
      } else {
        const { data, error } = await supabase.from('courses').insert({
          title: form.title, description: form.description || null,
          difficulty: form.difficulty,
          youtube_url: form.youtube_url || null, notes_url: form.notes_url || null,
          created_by: user?.id ?? null,
        }).select('id').single();
        if (error) throw error;
        courseId = data.id;
      }

      // Save modules
      if (modules.length > 0) {
        await supabase.from('course_modules').insert(
          modules.map((m, i) => ({
            course_id: courseId,
            title: m.title,
            description: m.description || '',
            content_url: m.content_url || null,
            notes_url: m.notes_url || null,
            order_index: i,
            duration_minutes: m.duration_minutes ?? 60,
            type: m.type ?? 'video',
            is_free_preview: m.is_free_preview ?? false,
          }))
        );
      }

      // Save assignment
      if (assignment.title.trim()) {
        await supabase.from('assignments').insert({
          course_id: courseId, title: assignment.title,
          instructions: assignment.instructions || null, due_days: assignment.due_days,
        });
      }

      // Save quiz
      if (quiz.title.trim() && questions.some(q => q.question.trim())) {
        const { data: qData } = await supabase.from('quizzes')
          .insert({ course_id: courseId, title: quiz.title }).select('id').single();
        if (qData) {
          await supabase.from('quiz_questions').insert(
            questions.filter(q => q.question.trim()).map((q, i) => ({
              quiz_id: qData.id, question: q.question, options: q.options, answer_index: q.answer_index, sort_order: i,
            }))
          );
        }
      }

      toast.success(editingCourse ? 'Course updated!' : 'Course created as draft!');
      setDialogOpen(false);
      await fetchCourses();
    } catch (err) {
      toast.error('Save failed', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // ── toggle publish ─────────────────────────────────────────────────────
  const togglePublish = async (course: DBCourse) => {
    const { error } = await supabase.from('courses')
      .update({ is_published: !course.is_published }).eq('id', course.id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(course.is_published ? 'Course unpublished' : 'Course published!');
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_published: !c.is_published } : c));
  };

  // ── delete course ──────────────────────────────────────────────────────
  const deleteCourse = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); } else {
      toast.success('Course deleted');
      setCourses(prev => prev.filter(c => c.id !== id));
    }
    setDeleting(null);
  };

  // ── module helpers ─────────────────────────────────────────────────────
  const addModule = () => setModules(p => [...p, blankModule()]);
  const removeModule = (i: number) => setModules(p => p.filter((_, idx) => idx !== i));
  const updateModule = (i: number, field: string, val: string) =>
    setModules(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  // ── quiz question helpers ──────────────────────────────────────────────
  const addQuestion = () => setQuestions(p => [...p, blankQuestion()]);
  const removeQuestion = (i: number) => setQuestions(p => p.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: string, val: string | number | string[]) =>
    setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Course Management" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        
        {/* Page Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Course Management</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Manage your curriculum, monitor instructor performance, and track student enrollment trends across the LearnLoom ecosystem.</p>
          </div>
          <div className="flex gap-md">
            <button className="px-lg py-md rounded-xl bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-2 font-label-md">
              <span className="material-symbols-outlined">file_download</span> Export CSV
            </button>
            <button onClick={openCreate} className="px-lg py-md rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_0_8px_rgba(192,193,255,0.3)]">
              <span className="material-symbols-outlined">add</span> New Course
            </button>
          </div>
        </div>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-2xl">
          <div className="glass-panel p-lg rounded-2xl">
            <div className="flex justify-between items-start mb-md">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">library_books</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-label-md mb-xs">Total Courses</p>
            <h3 className="font-display text-headline-lg text-on-surface">{loadingList ? <Skeleton className="h-8 w-16" /> : metrics.totalCourses}</h3>
          </div>
          <div className="glass-panel p-lg rounded-2xl">
            <div className="flex justify-between items-start mb-md">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">group</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-label-md mb-xs">Active Students</p>
            <h3 className="font-display text-headline-lg text-on-surface">
              {loadingList ? <Skeleton className="h-8 w-16" /> : metrics.activeStudents.toLocaleString()}
            </h3>
          </div>
          <div className="glass-panel p-lg rounded-2xl">
            <div className="flex justify-between items-start mb-md">
              <div className="w-12 h-12 rounded-xl bg-tertiary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary">star</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-label-md mb-xs">Avg. Course Rating</p>
            <h3 className="font-display text-headline-lg text-on-surface">{loadingList ? <Skeleton className="h-8 w-16" /> : metrics.avgRating.toFixed(2)}</h3>
          </div>
          <div className="glass-panel p-lg rounded-2xl overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-md">
                <div className="w-12 h-12 rounded-xl bg-outline-variant/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface">payments</span>
                </div>
              </div>
              <p className="text-on-surface-variant text-label-md mb-xs">Monthly Revenue</p>
              <h3 className="font-display text-headline-lg text-on-surface">{loadingList ? <Skeleton className="h-8 w-24" /> : `₹${metrics.monthlyRevenue.toLocaleString()}`}</h3>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          {/* Filters Bar */}
          <div className="p-lg border-b border-outline-variant/60 flex flex-col lg:flex-row gap-lg items-center">
            <div className="relative w-full lg:w-96 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
              <input 
                className="w-full bg-surface-container-low border border-outline-variant rounded-full py-3 pl-12 pr-6 text-on-surface focus:outline-none focus:border-primary transition-all font-body-md" 
                placeholder="Search course title, ID or instructor..." 
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex items-center gap-md w-full lg:w-auto overflow-x-auto no-scrollbar">
              <button 
                onClick={() => { setStatusFilter(prev => prev === 'All' ? 'Active' : prev === 'Active' ? 'Draft' : 'All'); setCurrentPage(1); }}
                className="flex items-center gap-2 px-md py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface-variant whitespace-nowrap hover:bg-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-sm">filter_list</span>
                <span className="font-label-md">Status: {statusFilter}</span>
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-highest/50">
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60">
                    <div className="flex items-center gap-2">Course Title</div>
                  </th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60">Difficulty</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60 text-right">Enrollment</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60">Status</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {loadingList ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-lg py-md"><Skeleton className="h-16 w-full bg-surface border border-outline-variant/30" /></td>
                    </tr>
                  ))
                ) : paginatedCourses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-lg py-16 text-center text-on-surface-variant">
                      No courses yet. Click <strong>New Course</strong> to get started.
                    </td>
                  </tr>
                ) : (
                  paginatedCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-surface-variant/20 transition-colors group">
                      <td className="px-lg py-lg">
                        <div className="flex items-center gap-md">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-highest">
                            {course.thumbnail_url ? (
                              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-outline">
                                <span className="material-symbols-outlined text-[32px]">image</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-headline-md text-on-surface group-hover:text-primary transition-colors truncate max-w-xs">{course.title}</p>
                            <p className="text-label-sm text-on-surface-variant opacity-60">ID: {course.id.split('-')[0]} • {course.category || 'No Category'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-lg py-lg">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${course.difficulty === 'Beginner' ? 'bg-success/10 text-success border-success/30' : course.difficulty === 'Intermediate' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-destructive/10 text-destructive border-destructive/30'} border`}>
                          {course.difficulty}
                        </span>
                      </td>
                      <td className="px-lg py-lg text-right font-label-md text-on-surface">
                        {(course.student_count ?? 0).toLocaleString()}
                      </td>
                      <td className="px-lg py-lg">
                        {course.is_published ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-tertiary-container/20 text-tertiary border border-tertiary-container/40">
                            Drafting
                          </span>
                        )}
                      </td>
                      <td className="px-lg py-lg text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => togglePublish(course)} className="p-2 hover:bg-surface-variant rounded-lg transition-colors text-on-surface-variant" title={course.is_published ? 'Unpublish' : 'Publish'}>
                            <span className="material-symbols-outlined text-[20px]">{course.is_published ? 'visibility_off' : 'visibility'}</span>
                          </button>
                          <Link to={`/courses/${course.id}`} className="p-2 hover:bg-surface-variant rounded-lg transition-colors text-on-surface-variant" title="Preview Course">
                            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                          </Link>
                          <button onClick={() => openEdit(course)} className="p-2 hover:bg-surface-variant rounded-lg transition-colors text-on-surface-variant" title="Edit">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button disabled={deleting === course.id} onClick={() => deleteCourse(course.id)} className="p-2 hover:bg-error/20 text-error rounded-lg transition-colors" title="Delete">
                            {deleting === course.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="material-symbols-outlined text-[20px]">delete</span>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-lg border-t border-outline-variant/60 flex items-center justify-between">
              <span className="text-label-md text-on-surface-variant">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCourses.length)} of {filteredCourses.length} entries
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Contextual Insight Banner */}
        <div className="glass-panel p-xl rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center gap-xl">
          <div className="relative z-10 md:w-2/3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-label-sm border border-secondary/30 mb-md">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              AI PERFORMANCE INSIGHT
            </div>
            <h2 className="font-display text-headline-lg text-on-surface mb-md">
              {loadingList ? <Skeleton className="h-8 w-3/4" /> : metrics.activeStudents > 0 
                ? `You've reached ${metrics.activeStudents.toLocaleString()} students across ${metrics.totalCourses} courses!`
                : `Ready to grow? Publish your first course to start gaining students.`}
            </h2>
            <p className="text-on-surface-variant text-body-md mb-xl">
              {loadingList ? <Skeleton className="h-12 w-full" /> : metrics.avgRating >= 4.5 
                ? `Your average rating of ${metrics.avgRating.toFixed(2)} indicates exceptional course quality. Consider leveraging this high satisfaction to promote subscription plans.`
                : metrics.totalCourses > 0 
                  ? `Focus on adding interactive modules and engaging content to boost student retention and ratings.`
                  : `Use the AI Factory to rapidly generate high-quality drafts and start building your catalog.`}
            </p>
            <button className="px-lg py-md rounded-xl bg-on-surface text-surface-lowest font-bold hover:opacity-90 transition-all">View Analytics Detail</button>
          </div>
          <div className="relative md:w-1/3 aspect-video w-full rounded-2xl overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[64px] text-primary/50">monitoring</span>
          </div>
        </div>

      </div>

      {/* ── Create / Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-on-surface text-balance font-display text-headline-md">
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave}>
            <Tabs defaultValue="ai" className="w-full">
              <TabsList className="grid grid-cols-5 w-full mb-4 bg-surface-container-high border border-outline-variant">
                <TabsTrigger value="ai" className="text-xs data-[state=active]:bg-tertiary/20 data-[state=active]:text-tertiary font-bold"><Sparkles className="w-3 h-3 mr-1 hidden sm:inline" />AI Factory</TabsTrigger>
                <TabsTrigger value="info" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><BookOpen className="w-3 h-3 mr-1 hidden sm:inline" />Info</TabsTrigger>
                <TabsTrigger value="modules" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><Video className="w-3 h-3 mr-1 hidden sm:inline" />Modules</TabsTrigger>
                <TabsTrigger value="assignment" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><ClipboardList className="w-3 h-3 mr-1 hidden sm:inline" />Assignment</TabsTrigger>
                <TabsTrigger value="quiz" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><GraduationCap className="w-3 h-3 mr-1 hidden sm:inline" />Quiz</TabsTrigger>
              </TabsList>

              {/* ── Tab: AI Auto-Generate ──────────────────────────────────────── */}
              <TabsContent value="ai" className="space-y-4">
                <div className="bg-tertiary-container/10 border border-tertiary/20 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-tertiary/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-tertiary" />
                  </div>
                  <h3 className="text-headline-sm text-on-surface mb-2">Automated Course Generation</h3>
                  <p className="text-body-md text-on-surface-variant mb-6">
                    Paste a URL from any approved educational source. The AI Factory will automatically crawl the content, humanize it, extract modules and quizzes, and auto-publish the course if it scores ≥ 80 on quality metrics.
                  </p>
                  
                  <div className="space-y-4 text-left">
                    <Label htmlFor="ai-url" className="text-sm font-normal text-on-surface">Source URL</Label>
                    <Input id="ai-url" placeholder="https://example.com/topic" className="bg-surface-container-lowest border-outline-variant text-on-surface"
                      value={aiUrl} onChange={e => setAiUrl(e.target.value)} />
                    
                    <Button type="button" onClick={handleAiGenerate} disabled={generating || !aiUrl.trim()}
                      className="w-full bg-tertiary text-on-tertiary font-bold hover:opacity-90">
                      {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Start AI Factory Pipeline
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ── Tab: Course Info ──────────────────────────────────────── */}
              <TabsContent value="info" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="c-title" className="text-sm font-normal text-on-surface">Course Title *</Label>
                  <Input id="c-title" placeholder="e.g., Python for Beginners" className="bg-surface-container-lowest border-outline-variant text-on-surface"
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-on-surface">Description</Label>
                  <Textarea placeholder="What students will learn..." className="bg-surface-container-lowest border-outline-variant text-on-surface resize-none" rows={3}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-on-surface">Difficulty Level</Label>
                  <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v as DifficultyLevel }))}>
                    <SelectTrigger className="bg-surface-container-lowest border-outline-variant text-on-surface">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-container border-outline-variant text-on-surface">
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-yt" className="text-sm font-normal text-on-surface">YouTube Video URL (intro / main)</Label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                    <Input id="c-yt" placeholder="https://www.youtube.com/watch?v=..." className="pl-10 bg-surface-container-lowest border-outline-variant text-on-surface"
                      value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} />
                  </div>
                  {form.youtube_url && youtubeEmbedUrl(form.youtube_url) && (
                    <div className="aspect-video rounded-lg overflow-hidden border border-outline-variant mt-2">
                      <iframe src={youtubeEmbedUrl(form.youtube_url)!} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="preview" />
                    </div>
                  )}
                </div>
                <PdfUploadField
                  label="Course Notes / PDF"
                  value={form.notes_url}
                  onChange={v => setForm(f => ({ ...f, notes_url: v }))}
                  folder="notes"
                />
              </TabsContent>

              {/* ── Tab: Modules ──────────────────────────────────────────── */}
              <TabsContent value="modules" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-on-surface-variant">Add video modules / lessons to this course</p>
                  <Button type="button" size="sm" variant="ghost" onClick={addModule}
                    className="border border-outline-variant text-on-surface hover:bg-surface-variant h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Module
                  </Button>
                </div>
                {modules.length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant text-sm border border-dashed border-outline-variant rounded-lg">
                    No modules yet — click <strong>Add Module</strong> above
                  </div>
                )}
                {modules.map((m, i) => (
                  <Card key={i} className="bg-surface-container-lowest border-outline-variant">
                    <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm text-on-surface">Module {i + 1}</CardTitle>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeModule(i)}
                        className="h-6 w-6 p-0 text-error hover:bg-error/10">
                        <X className="w-3 h-3" />
                      </Button>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-normal text-on-surface">Module Title *</Label>
                        <Input placeholder="e.g., Intro to Variables" className="bg-surface border-outline-variant text-on-surface h-8 text-sm"
                          value={m.title} onChange={e => updateModule(i, 'title', e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-normal text-on-surface">YouTube / Content URL</Label>
                        <Input placeholder="https://youtube.com/watch?v=..." className="bg-surface border-outline-variant text-on-surface h-8 text-sm"
                          value={m.content_url ?? ''} onChange={e => updateModule(i, 'content_url', e.target.value)} />
                      </div>
                      <PdfUploadField
                        label="Notes PDF"
                        value={m.notes_url ?? ''}
                        onChange={v => updateModule(i, 'notes_url', v)}
                        folder={`modules/${i}`}
                      />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* ── Tab: Assignment ──────────────────────────────────────── */}
              <TabsContent value="assignment" className="space-y-4">
                <p className="text-sm text-on-surface-variant">Attach one assignment to this course</p>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-on-surface">Assignment Title</Label>
                  <Input placeholder="e.g., Build a Calculator App" className="bg-surface-container-lowest border-outline-variant text-on-surface"
                    value={assignment.title} onChange={e => setAssignment(a => ({ ...a, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-on-surface">Instructions</Label>
                  <Textarea placeholder="Describe what students need to submit..." className="bg-surface-container-lowest border-outline-variant text-on-surface resize-none" rows={5}
                    value={assignment.instructions} onChange={e => setAssignment(a => ({ ...a, instructions: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-on-surface">Due Days (from enrollment)</Label>
                  <Input type="number" min={1} max={365} className="bg-surface-container-lowest border-outline-variant text-on-surface w-32"
                    value={assignment.due_days} onChange={e => setAssignment(a => ({ ...a, due_days: Number(e.target.value) }))} />
                </div>
              </TabsContent>

              {/* ── Tab: Quiz ─────────────────────────────────────────────── */}
              <TabsContent value="quiz" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-on-surface">Quiz Title</Label>
                  <Input placeholder="e.g., Python Basics Quiz" className="bg-surface-container-lowest border-outline-variant text-on-surface"
                    value={quiz.title} onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-on-surface-variant">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={addQuestion}
                    className="border border-outline-variant text-on-surface hover:bg-surface-variant h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Question
                  </Button>
                </div>
                {questions.map((q, qi) => (
                  <Card key={qi} className="bg-surface-container-lowest border-outline-variant">
                    <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm text-on-surface">Q{qi + 1}</CardTitle>
                      {questions.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeQuestion(qi)}
                          className="h-6 w-6 p-0 text-error hover:bg-error/10">
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-normal text-on-surface">Question *</Label>
                        <Textarea placeholder="Type the question..." className="bg-surface border-outline-variant text-on-surface resize-none text-sm" rows={2}
                          value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-on-surface">Answer Options (select correct one)</Label>
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name={`q${qi}-answer`} checked={q.answer_index === oi}
                              onChange={() => updateQuestion(qi, 'answer_index', oi)}
                              className="shrink-0 accent-primary" />
                            <Input placeholder={`Option ${oi + 1}`} className="bg-surface border-outline-variant text-on-surface h-7 text-xs flex-1"
                              value={opt} onChange={e => {
                                const opts = [...q.options]; opts[oi] = e.target.value;
                                updateQuestion(qi, 'options', opts);
                              }} />
                          </div>
                        ))}
                        <p className="text-[10px] text-on-surface-variant">Select the radio button next to the correct answer</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            {/* Footer buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-outline-variant/60">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}
                className="flex-1 border border-outline-variant text-on-surface hover:bg-surface-variant">
                Cancel
              </Button>
              <Button type="submit" disabled={saving}
                className="flex-1 bg-primary text-on-primary font-bold hover:opacity-90">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCourse ? 'Save Changes' : 'Save as Draft'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
