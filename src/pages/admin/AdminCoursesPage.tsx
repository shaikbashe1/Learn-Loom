import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Video,
  Upload, Loader2, X, Link2,
  GraduationCap, ClipboardList, BookOpen, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { uploadFile } from '@/lib/uploadFile';
import { useAuth } from '@/contexts/AuthContext';
import type { DBCourse, DBModule, DifficultyLevel } from '@/types/types';

interface AIQuizQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

interface AICodingTestCase {
  input: string;
  expected_output: string;
  is_hidden?: boolean;
}

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
      <Label className="text-[13px] font-bold text-text-primary">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Paste URL or upload below"
          className="bg-surface border-border-base text-text-primary flex-1 min-w-0 shadow-inner"
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="shrink-0 border border-border-base text-text-primary hover:bg-surface-container"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="ml-2 hidden sm:inline">Upload</span>
        </Button>
        {value && (
          <Button type="button" variant="outline" onClick={() => onChange('')}
            className="shrink-0 border border-error/30 text-error hover:bg-error/10">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-1">
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
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<DBCourse | null>(null);

  // AI Generator state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFiles, setAiFiles] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState({ step: '', progress: 0 });

  // Course form
  const [form, setForm] = useState(blankCourse());
  const [modules, setModules] = useState<(Omit<DBModule, 'id' | 'course_id' | 'created_at'>)[]>([]);
  const [assignment, setAssignment] = useState(blankAssignment());
  const [quiz, setQuiz] = useState(blankQuiz());
  const [questions, setQuestions] = useState([blankQuestion()]);

  // ── load courses ────────────────────────────────────────────────────────
  const fetchCourses = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load courses');
    else setCourses(data ?? []);
    setLoadingList(false);
  };

  useEffect(() => { fetchCourses(); }, []);

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

  // ── handle AI generation ────────────────────────────────────────────────
  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiProgress({ step: 'Generating Course Outline...', progress: 10 });
    
    try {
      // 1. Generate Course Outline
      const outlineRes = await fetch('/api/ai-course-generator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: aiPrompt, description: '', fileUrls: aiFiles })
      });
      if (!outlineRes.ok) throw new Error(await outlineRes.text());
      const outline = await outlineRes.json();
      
      // 2. Save Course to DB
      setAiProgress({ step: 'Creating Course...', progress: 20 });
      const { data: courseData, error: courseError } = await supabase.from('courses').insert({
        title: outline.title || aiPrompt,
        description: outline.description || null,
        difficulty: 'Beginner',
        is_published: false,
        created_by: user?.id ?? null,
      }).select('id').single();
      if (courseError) throw courseError;
      const courseId = courseData.id;

      const totalModules = outline.modules.length;
      let mIndex = 0;

      // 3. Generate Content for each Module
      for (const m of outline.modules) {
        setAiProgress({ step: `Generating Module ${mIndex + 1} of ${totalModules}...`, progress: 20 + Math.floor((mIndex / totalModules) * 60) });
        
        const includeCoding = (mIndex + 1) % 2 === 0; // Every 2 modules
        const modRes = await fetch('/api/ai-module-generator', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseTitle: outline.title, moduleTitle: m.title, moduleDescription: m.description, fileUrls: aiFiles, includeCoding })
        });
        
        if (!modRes.ok) {
          console.warn(`Failed to generate module ${m.title}`);
          mIndex++;
          continue;
        }
        
        const modContent = await modRes.json();
        
        // Save Module
        const { data: modData } = await supabase.from('course_modules').insert({
          course_id: courseId,
          title: m.title,
          description: m.description || '',
          order_index: m.order_index ?? mIndex,
          type: includeCoding ? 'coding' : 'reading',
          duration_minutes: 60,
          is_free_preview: mIndex === 0,
          learning_objectives: modContent.content?.learning_objectives?.join('\n'),
          content: modContent.content?.detailed_explanation,
          key_takeaways: modContent.content?.key_takeaways || [],
          examples: modContent.content?.examples || [],
          real_world_use_cases: modContent.content?.real_world_use_cases || [],
          key_concepts: modContent.content?.key_concepts || [],
          summary: modContent.content?.summary || null,
        }).select('id').single();

        if (modData) {
          // Save Quiz 1
          if (modContent.quiz1?.questions?.length) {
            const { data: q1 } = await supabase.from('quizzes').insert({
              course_id: courseId, module_id: modData.id, title: modContent.quiz1.title || 'Quiz 1: Basics',
              quiz_type: 'quiz_1', passing_score: 70
            }).select('id').single();
            if (q1) {
              await supabase.from('quiz_questions').insert(modContent.quiz1.questions.map((q: AIQuizQuestion, i: number) => ({
                quiz_id: q1.id, question: q.question, options: q.options, answer_index: q.answer_index, explanation: q.explanation, sort_order: i
              })));
            }
          }
          // Save Quiz 2
          if (modContent.quiz2?.questions?.length) {
            const { data: q2 } = await supabase.from('quizzes').insert({
              course_id: courseId, module_id: modData.id, title: modContent.quiz2.title || 'Quiz 2: Scenarios',
              quiz_type: 'quiz_2', passing_score: 70
            }).select('id').single();
            if (q2) {
              await supabase.from('quiz_questions').insert(modContent.quiz2.questions.map((q: AIQuizQuestion, i: number) => ({
                quiz_id: q2.id, question: q.question, options: q.options, answer_index: q.answer_index, explanation: q.explanation, sort_order: i
              })));
            }
          }
          // Save Coding Assessment
          if (includeCoding && modContent.coding_assessment) {
             const { data: cq } = await supabase.from('coding_questions').insert({
               course_id: courseId, module_id: modData.id, title: modContent.coding_assessment.title || 'Coding Challenge',
               difficulty: modContent.coding_assessment.difficulty || 'Beginner', problem_statement: modContent.coding_assessment.problem_statement,
               constraints: modContent.coding_assessment.constraints || [], starter_code: { "python": modContent.coding_assessment.starter_code || "" },
               is_assessment: true, sort_order: 0
             }).select('id').single();
             if (cq && modContent.coding_assessment.test_cases?.length) {
               await supabase.from('coding_test_cases').insert(modContent.coding_assessment.test_cases.map((tc: AICodingTestCase) => ({
                 question_id: cq.id, input: tc.input, expected_output: tc.expected_output, is_hidden: tc.is_hidden || false
               })));
             }
          }
        }
        mIndex++;
      }

      // 4. Generate Final Assessment
      setAiProgress({ step: 'Generating Final Assessment...', progress: 90 });
      const finalRes = await fetch('/api/ai-final-assessment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseTitle: outline.title, courseDescription: outline.description, modulesList: outline.modules, isTechnical: true })
      });
      if (finalRes.ok) {
        const finalExam = await finalRes.json();
        const { data: fq } = await supabase.from('quizzes').insert({
          course_id: courseId, title: finalExam.title || 'Final Assessment',
          is_grand_test: true, quiz_type: 'final_assessment', passing_score: 75
        }).select('id').single();
        if (fq) {
           let qs: AIQuizQuestion[] = [];
           if (finalExam.section_a) qs = qs.concat(finalExam.section_a);
           if (finalExam.section_b) qs = qs.concat(finalExam.section_b);
           if (qs.length) {
              await supabase.from('quiz_questions').insert(qs.map((q: AIQuizQuestion, i: number) => ({
                quiz_id: fq.id, question: q.question, options: q.options, answer_index: q.answer_index, explanation: q.explanation, sort_order: i
              })));
           }
        }
      }

      setAiProgress({ step: 'Done!', progress: 100 });
      toast.success('AI Course successfully generated!');
      await fetchCourses();
      setAiDialogOpen(false);
    } catch (err: any) {
      toast.error('AI Generation Failed', { description: err.message });
    } finally {
      setAiGenerating(false);
    }
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
        // Delete old
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
            course_id: courseId, title: m.title, description: m.description || '',
            content_url: m.content_url || null, notes_url: m.notes_url || null,
            order_index: i, duration_minutes: m.duration_minutes ?? 60, type: m.type ?? 'video',
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

  // ── module/question helpers ─────────────────────────────────────────────
  const addModule = () => setModules(p => [...p, blankModule()]);
  const removeModule = (i: number) => setModules(p => p.filter((_, idx) => idx !== i));
  const updateModule = (i: number, field: string, val: string) =>
    setModules(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const addQuestion = () => setQuestions(p => [...p, blankQuestion()]);
  const removeQuestion = (i: number) => setQuestions(p => p.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: string, val: string | number | string[]) =>
    setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Course Library" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Course Library</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Manage your educational catalog. Create new modules, review drafts, and monitor performance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-base bg-surface text-text-primary hover:bg-surface-container font-label-md text-[14px] font-bold transition-all card-lift shadow-sm">
                <span className="material-symbols-outlined text-[18px]">upload</span> Import
             </button>
             <button onClick={() => setAiDialogOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface text-tertiary-container border border-tertiary-container/30 hover:bg-tertiary-container/5 font-label-md text-[14px] font-bold transition-all shadow-[0_0_15px_rgba(125,76,231,0.1)] card-lift">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span> AI Generator
             </button>
             <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-label-md text-[14px] font-bold shadow-sm transition-all card-lift">
                <span className="material-symbols-outlined text-[18px]">add</span> Create Course
             </button>
          </div>
        </section>

        {/* Filters Bar */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-base pb-4 gap-4">
          <div className="flex gap-6 font-label-md text-[14px] font-bold overflow-x-auto custom-scrollbar pb-1">
             <button className="text-primary border-b-2 border-primary pb-4 -mb-[17px] whitespace-nowrap">All Courses ({courses.length})</button>
             <button className="text-text-secondary hover:text-primary transition-colors pb-4 -mb-[17px] whitespace-nowrap">Published ({courses.filter(c => c.is_published).length})</button>
             <button className="text-text-secondary hover:text-primary transition-colors pb-4 -mb-[17px] whitespace-nowrap">Drafts ({courses.filter(c => !c.is_published).length})</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group min-w-[250px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors text-[20px]">search</span>
              <input className="w-full bg-surface-container border border-border-base rounded-full py-2 pl-10 pr-4 font-body-sm text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner" placeholder="Search courses..." type="text"/>
            </div>
             <button className="flex items-center gap-1 text-text-secondary hover:text-primary font-label-sm text-[12px] font-bold px-3 py-2 rounded-lg hover:bg-surface-container transition-colors bg-surface border border-border-base shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
             </button>
          </div>
        </section>

        {/* Grid Layout for Course Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {loadingList ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="glass-panel border border-border-base rounded-xl overflow-hidden h-80">
                 <Skeleton className="h-40 w-full" />
                 <div className="p-5 space-y-3">
                   <Skeleton className="h-6 w-3/4" />
                   <Skeleton className="h-4 w-1/2" />
                 </div>
              </div>
            ))
          ) : courses.map((course, idx) => {
            const gradients = [
              'from-primary to-secondary',
              'from-tertiary-container to-primary',
              'from-secondary to-primary-container',
              'from-warning/80 to-error/80'
            ];
            const gradient = gradients[idx % gradients.length];
            
            return (
              <article key={course.id} className="glass-panel rounded-2xl border border-border-base overflow-hidden group relative flex flex-col transition-all duration-300 card-lift h-full">
                
                {/* Thumbnail Area */}
                <div className={`h-44 relative overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                   {course.thumbnail_url ? (
                     <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                   ) : (
                     <div className="text-[64px] font-bold text-white/30 tracking-tighter group-hover:scale-105 transition-transform duration-500">{course.title.substring(0, 2).toUpperCase()}</div>
                   )}
                   
                   {/* Status Badge */}
                   <div className={`absolute top-3 right-3 bg-surface/90 backdrop-blur-md px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-sm ${course.is_published ? 'border-success/20' : 'border-outline-variant/30'}`}>
                     <div className={`w-2 h-2 rounded-full ${course.is_published ? 'bg-success' : 'bg-outline-variant'}`}></div>
                     <span className={`font-label-sm text-[11px] font-bold uppercase tracking-wider ${course.is_published ? 'text-text-primary' : 'text-text-secondary'}`}>
                       {course.is_published ? 'Published' : 'Draft'}
                     </span>
                   </div>
                   
                   {idx === 0 && course.is_published && (
                      <div className="absolute top-3 left-3 bg-tertiary text-white px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-sm">
                         <span className="material-symbols-outlined text-[14px]">verified</span> Featured
                      </div>
                   )}
                </div>

                {/* Content Area */}
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div>
                    <h3 className="font-headline-md text-[20px] font-bold text-text-primary line-clamp-1 mb-1">{course.title}</h3>
                    <p className="font-body-sm text-[14px] text-text-secondary flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-[16px]">folder</span> {course.category || 'General'}
                    </p>
                  </div>
                  
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3 border-t border-border-base pt-4 mt-auto">
                    <div>
                      <p className="font-label-sm text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Students</p>
                      <p className="font-body-md text-[16px] font-bold text-text-primary">{(course.student_count ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-label-sm text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Level</p>
                      <p className="font-body-md text-[16px] font-bold text-text-primary truncate">{course.difficulty.substring(0,3).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="font-label-sm text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Status</p>
                      <p className={`font-body-md text-[16px] font-bold ${course.is_published ? 'text-success' : 'text-text-secondary'}`}>
                        {course.is_published ? 'Active' : 'WIP'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions Strip on mobile, Hover overlay on desktop */}
                <div className="relative md:absolute md:inset-0 flex md:hidden items-center justify-center gap-4 py-3 bg-surface-container/30 border-t border-border-base md:border-t-0 md:bg-surface/60 md:backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10">
                   <button onClick={() => openEdit(course)} className="w-11 h-11 rounded-full bg-surface shadow-md flex items-center justify-center text-text-primary hover:text-primary hover:scale-110 transition-all border border-border-base" title="Edit Course">
                      <span className="material-symbols-outlined text-[22px]">edit</span>
                   </button>
                   <button onClick={async (e) => {
                       e.stopPropagation();
                       const { error } = await supabase.from('courses').update({ is_published: !course.is_published }).eq('id', course.id);
                       if(!error) fetchCourses();
                   }} className={`w-11 h-11 rounded-full bg-surface shadow-md flex items-center justify-center hover:scale-110 transition-all border border-border-base ${course.is_published ? 'text-warning hover:text-warning' : 'text-success hover:text-success'}`} title={course.is_published ? 'Unpublish' : 'Publish'}>
                      <span className="material-symbols-outlined text-[22px]">{course.is_published ? 'visibility_off' : 'visibility'}</span>
                   </button>
                </div>
                <div className="hidden md:flex absolute inset-0 bg-surface/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center gap-4 z-10">
                   <button onClick={() => openEdit(course)} className="w-12 h-12 rounded-full bg-surface shadow-lg flex items-center justify-center text-text-primary hover:text-primary hover:scale-110 transition-transform border border-border-base" title="Edit Course">
                      <span className="material-symbols-outlined text-[24px]">edit</span>
                   </button>
                   <button onClick={async (e) => {
                       e.stopPropagation();
                       const { error } = await supabase.from('courses').update({ is_published: !course.is_published }).eq('id', course.id);
                       if(!error) fetchCourses();
                   }} className={`w-12 h-12 rounded-full bg-surface shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-border-base ${course.is_published ? 'text-warning hover:text-warning' : 'text-success hover:text-success'}`} title={course.is_published ? 'Unpublish' : 'Publish'}>
                      <span className="material-symbols-outlined text-[24px]">{course.is_published ? 'visibility_off' : 'visibility'}</span>
                   </button>
                </div>
              </article>
            );
          })}

          {/* Create New Prompt Card */}
          <article onClick={openCreate} className="bg-surface-container/30 rounded-2xl border-2 border-dashed border-border-base overflow-hidden flex flex-col items-center justify-center p-8 text-center transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 cursor-pointer min-h-[360px] group">
            <div className="w-16 h-16 rounded-full bg-surface border border-border-base flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-[32px]">add</span>
            </div>
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary mb-2">Create New Course</h3>
            <p className="font-body-sm text-[14px] text-text-secondary max-w-[220px] mx-auto mb-6">Set up syllabus, modules, quizzes, and publish to the platform.</p>
            <button className="px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-label-md text-[14px] font-bold shadow-sm transition-colors">
                Start from Scratch
            </button>
          </article>
        </section>
      </div>

      {/* ── Create / Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border-base max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto rounded-2xl shadow-2xl p-0">
          <DialogHeader className="p-6 md:p-8 border-b border-border-base bg-surface-container/30">
            <DialogTitle className="text-text-primary text-balance font-headline-md text-[24px] font-bold">
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </DialogTitle>
            <p className="text-text-secondary text-[14px] mt-1">Configure your course content, modules, and assessments below.</p>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 md:p-8">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-8 bg-surface-container rounded-xl p-1 border border-border-base shadow-inner h-12">
                <TabsTrigger value="info" className="text-[13px] font-bold rounded-lg data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"><BookOpen className="w-4 h-4 mr-2 hidden sm:inline" />Info</TabsTrigger>
                <TabsTrigger value="modules" className="text-[13px] font-bold rounded-lg data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"><Video className="w-4 h-4 mr-2 hidden sm:inline" />Modules</TabsTrigger>
                <TabsTrigger value="assignment" className="text-[13px] font-bold rounded-lg data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"><ClipboardList className="w-4 h-4 mr-2 hidden sm:inline" />Assignment</TabsTrigger>
                <TabsTrigger value="quiz" className="text-[13px] font-bold rounded-lg data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"><GraduationCap className="w-4 h-4 mr-2 hidden sm:inline" />Quiz</TabsTrigger>
              </TabsList>

              {/* ── Tab: Course Info ──────────────────────────────────────── */}
              <TabsContent value="info" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="c-title" className="text-[13px] font-bold text-text-primary">Course Title *</Label>
                  <Input id="c-title" placeholder="e.g., Python for Beginners" className="bg-surface border-border-base text-text-primary h-11"
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-text-primary">Description</Label>
                  <Textarea placeholder="What students will learn..." className="bg-surface border-border-base text-text-primary resize-none min-h-[120px]"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-bold text-text-primary">Difficulty Level</Label>
                    <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v as DifficultyLevel }))}>
                      <SelectTrigger className="bg-surface border-border-base text-text-primary h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border-base text-text-primary">
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-yt" className="text-[13px] font-bold text-text-primary">Preview Video URL</Label>
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <Input id="c-yt" placeholder="https://youtube.com/..." className="pl-10 bg-surface border-border-base text-text-primary h-11"
                        value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <PdfUploadField
                  label="Course Syllabus / Notes (PDF)"
                  value={form.notes_url}
                  onChange={v => setForm(f => ({ ...f, notes_url: v }))}
                  folder="notes"
                />
              </TabsContent>

              {/* ── Tab: Modules ──────────────────────────────────────────── */}
              <TabsContent value="modules" className="space-y-6">
                <div className="flex items-center justify-between border-b border-border-base pb-4">
                  <p className="text-[14px] font-medium text-text-secondary">Structure your course content</p>
                  <Button type="button" size="sm" onClick={addModule}
                    className="bg-primary text-white hover:bg-primary-container hover:text-on-primary-container h-9 px-4 rounded-lg font-bold shadow-sm transition-colors">
                    <Plus className="w-4 h-4 mr-1.5" /> Add Module
                  </Button>
                </div>
                {modules.length === 0 && (
                  <div className="text-center py-16 text-text-secondary text-[14px] border-2 border-dashed border-border-base rounded-xl bg-surface-container/30">
                    No modules added yet. Click <strong>Add Module</strong> to begin.
                  </div>
                )}
                <div className="space-y-4">
                  {modules.map((m, i) => (
                    <div key={i} className="glass-panel border border-border-base rounded-xl p-5 shadow-sm relative group">
                      <div className="absolute top-4 right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                         <Button type="button" size="sm" variant="outline" onClick={() => removeModule(i)}
                           className="h-8 w-8 p-0 text-error border-error/20 hover:bg-error/10 hover:border-error/30 rounded-lg">
                           <X className="w-4 h-4" />
                         </Button>
                      </div>
                      <h4 className="font-bold text-[14px] text-primary mb-4">Module {i + 1}</h4>
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-bold text-text-primary">Module Title *</Label>
                          <Input placeholder="e.g., Introduction to Syntax" className="bg-surface border-border-base text-text-primary h-10"
                            value={m.title} onChange={e => updateModule(i, 'title', e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-bold text-text-primary">Video Content URL</Label>
                          <Input placeholder="https://youtube.com/..." className="bg-surface border-border-base text-text-primary h-10"
                            value={m.content_url ?? ''} onChange={e => updateModule(i, 'content_url', e.target.value)} />
                        </div>
                        <PdfUploadField
                          label="Module Resources (PDF)"
                          value={m.notes_url ?? ''}
                          onChange={v => updateModule(i, 'notes_url', v)}
                          folder={`modules/${i}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ── Tab: Assignment ──────────────────────────────────────── */}
              <TabsContent value="assignment" className="space-y-6">
                <div className="border-b border-border-base pb-4">
                  <p className="text-[14px] font-medium text-text-secondary">Attach an assignment for grading</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-text-primary">Assignment Title</Label>
                  <Input placeholder="e.g., Build a Calculator App" className="bg-surface border-border-base text-text-primary h-11"
                    value={assignment.title} onChange={e => setAssignment(a => ({ ...a, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-text-primary">Instructions</Label>
                  <Textarea placeholder="Describe what students need to submit..." className="bg-surface border-border-base text-text-primary resize-none min-h-[150px]"
                    value={assignment.instructions} onChange={e => setAssignment(a => ({ ...a, instructions: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-text-primary">Due Days (from enrollment)</Label>
                  <Input type="number" min={1} max={365} className="bg-surface border-border-base text-text-primary w-full max-w-[200px] h-11"
                    value={assignment.due_days} onChange={e => setAssignment(a => ({ ...a, due_days: Number(e.target.value) }))} />
                </div>
              </TabsContent>

              {/* ── Tab: Quiz ─────────────────────────────────────────────── */}
              <TabsContent value="quiz" className="space-y-6">
                <div className="space-y-2 pb-6 border-b border-border-base">
                  <Label className="text-[13px] font-bold text-text-primary">Quiz Title</Label>
                  <Input placeholder="e.g., Python Basics Quiz" className="bg-surface border-border-base text-text-primary h-11"
                    value={quiz.title} onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))} />
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium text-text-secondary">{questions.length} Question{questions.length !== 1 ? 's' : ''}</p>
                  <Button type="button" size="sm" onClick={addQuestion}
                    className="bg-primary text-white hover:bg-primary-container hover:text-on-primary-container h-9 px-4 rounded-lg font-bold shadow-sm transition-colors">
                    <Plus className="w-4 h-4 mr-1.5" /> Add Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qi) => (
                    <div key={qi} className="glass-panel border border-border-base rounded-xl p-5 shadow-sm relative group">
                      <div className="absolute top-4 right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                         {questions.length > 1 && (
                           <Button type="button" size="sm" variant="outline" onClick={() => removeQuestion(qi)}
                             className="h-8 w-8 p-0 text-error border-error/20 hover:bg-error/10 hover:border-error/30 rounded-lg">
                             <X className="w-4 h-4" />
                           </Button>
                         )}
                      </div>
                      <h4 className="font-bold text-[14px] text-primary mb-4">Question {qi + 1}</h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-bold text-text-primary">Question Text *</Label>
                          <Textarea placeholder="Type the question..." className="bg-surface border-border-base text-text-primary resize-none text-[14px] min-h-[80px]"
                            value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)} />
                        </div>
                        
                        <div className="space-y-3 bg-surface-container/30 p-4 rounded-xl border border-border-base">
                          <Label className="text-[12px] font-bold text-text-primary mb-2 block">Answer Options (Select correct one)</Label>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-3">
                              <input type="radio" name={`q${qi}-answer`} checked={q.answer_index === oi}
                                onChange={() => updateQuestion(qi, 'answer_index', oi)}
                                className="w-4 h-4 text-primary focus:ring-primary border-outline-variant cursor-pointer" />
                              <Input placeholder={`Option ${oi + 1}`} className={`bg-surface border-border-base h-10 text-[13px] flex-1 ${q.answer_index === oi ? 'border-primary/50 ring-1 ring-primary/20 bg-primary/5' : ''}`}
                                value={opt} onChange={e => {
                                  const opts = [...q.options]; opts[oi] = e.target.value;
                                  updateQuestion(qi, 'options', opts);
                                }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-6 border-t border-border-base justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                className="w-full sm:w-auto h-11 px-6 border-border-base text-text-primary hover:bg-surface-container font-bold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={saving}
                className="w-full sm:w-auto h-11 px-8 bg-primary text-white font-bold rounded-xl shadow-sm hover:opacity-90">
                {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                {editingCourse ? 'Save Changes' : 'Save as Draft'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* ── AI Generator Dialog ─────────────────────────────────────────── */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="bg-surface border-border-base max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-text-primary text-balance font-headline-md text-[20px] font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-tertiary" /> Generate with AI
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAIGenerate} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-text-primary">What should the course be about?</Label>
              <Textarea 
                placeholder="e.g. A comprehensive guide to Next.js 14 and React Server Components..." 
                className="bg-surface border-border-base text-text-primary resize-none min-h-[100px]"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                disabled={aiGenerating}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-text-primary">Upload Documents (PDF, TXT, DOCX)</Label>
              <p className="text-[12px] text-text-secondary mb-2">Upload any syllabus, guidelines, or core material for the AI to base the course on.</p>
              <PdfUploadField 
                label="Reference Material" 
                value={aiFiles[0] || ''} 
                onChange={url => setAiFiles(url ? [url] : [])} 
                folder="ai-uploads" 
              />
            </div>

            {aiGenerating && (
               <div className="py-4 space-y-2">
                  <div className="flex justify-between text-sm font-label-sm font-bold text-primary">
                     <span>{aiProgress.step}</span>
                     <span>{aiProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2">
                     <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${aiProgress.progress}%` }}></div>
                  </div>
               </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border-base">
              <Button type="button" variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiGenerating}
                className="h-10 px-4 border-border-base text-text-primary hover:bg-surface-container font-bold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={aiGenerating || !aiPrompt.trim()}
                className="h-10 px-6 bg-tertiary text-white font-bold rounded-xl shadow-sm hover:opacity-90 flex items-center gap-2">
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiGenerating ? 'Generating...' : 'Generate Full Course'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
