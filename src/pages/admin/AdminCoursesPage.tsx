import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Video,
  Upload,
  Loader2,
  X,
  Link2,
  GraduationCap,
  ClipboardList,
  BookOpen,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Folder,
  Edit2,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { db, storage } from '@/db/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { uploadFile } from '@/lib/uploadFile';
import { useAuth } from '@/contexts/AuthContext';
import type { DBCourse, DBModule, DifficultyLevel } from '@/types/types';

interface AIQuizQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const vid = u.searchParams.get('v') ?? u.pathname.split('/').pop();
    return vid ? `https://www.youtube.com/embed/${vid}` : null;
  } catch { return null; }
}

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
      <Label className="text-xs font-bold text-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Paste URL or upload below"
          className="bg-background border-border text-xs h-10 rounded-xl flex-1 min-w-0 shadow-inner"
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="shrink-0 border border-border text-foreground hover:bg-muted/50 h-10 rounded-xl text-xs font-bold"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="ml-1.5 hidden sm:inline">Upload</span>
        </Button>
        {value && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onChange('')}
            className="shrink-0 border border-destructive/20 text-destructive hover:bg-destructive/10 h-10 rounded-xl"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
      {value && (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 mt-1"
        >
          <Link2 className="w-3.5 h-3.5" /> View uploaded file
        </a>
      )}
    </div>
  );
}

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

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<DBCourse | null>(null);

  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFiles, setAiFiles] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState({ step: '', progress: 0 });

  const [form, setForm] = useState(blankCourse());
  const [modules, setModules] = useState<(Omit<DBModule, 'id' | 'course_id' | 'created_at'>)[]>([]);
  const [assignment, setAssignment] = useState(blankAssignment());
  const [quiz, setQuiz] = useState(blankQuiz());
  const [questions, setQuestions] = useState([blankQuestion()]);

  const fetchCourses = async () => {
    setLoadingList(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'courses'), orderBy('created_at', 'desc')));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(data as DBCourse[]);
    } catch (error) {
      toast.error('Failed to load courses');
    }
    setLoadingList(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openCreate = () => {
    setEditingCourse(null);
    setForm(blankCourse());
    setModules([]);
    setAssignment(blankAssignment());
    setQuiz(blankQuiz());
    setQuestions([blankQuestion()]);
    setDialogOpen(true);
  };

  const openEdit = async (course: DBCourse) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description ?? '',
      difficulty: course.difficulty,
      youtube_url: course.youtube_url ?? '',
      notes_url: course.notes_url ?? '',
    });
    
    try {
      const modsSnap = await getDocs(query(collection(db, 'course_modules'), where('course_id', '==', course.id), orderBy('order_index')));
      const mods = modsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setModules((mods ?? []).map(m => ({
        title: m.title,
        description: m.description ?? '',
        content_url: m.content_url ?? m.youtube_url ?? '',
        order_index: m.order_index ?? 0,
        duration_minutes: m.duration_minutes ?? 60,
        type: (m.type ?? 'video') as 'video' | 'reading' | 'coding',
        is_free_preview: m.is_free_preview ?? false,
      })));
      
      const asgsSnap = await getDocs(query(collection(db, 'assignments'), where('course_id', '==', course.id), limit(1)));
      const asgs = asgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setAssignment(asgs?.[0] ? { title: asgs[0].title, instructions: asgs[0].instructions ?? '', due_days: asgs[0].due_days ?? 7 } : blankAssignment());
      
      const qzsSnap = await getDocs(query(collection(db, 'quizzes'), where('course_id', '==', course.id), limit(1)));
      const qzs = qzsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      if (qzs?.[0]) {
        setQuiz({ title: qzs[0].title });
        const qsSnap = await getDocs(query(collection(db, 'quiz_questions'), where('quiz_id', '==', qzs[0].id), orderBy('sort_order')));
        const qs = qsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setQuestions((qs ?? []).map(q => ({ question: q.question, options: q.options as string[], answer_index: q.answer_index })));
      } else {
        setQuiz(blankQuiz()); setQuestions([blankQuestion()]);
      }
    } catch(err) {
      console.error(err);
    }
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let courseId: string;

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), {
          title: form.title, description: form.description || null,
          difficulty: form.difficulty,
          youtube_url: form.youtube_url || null, notes_url: form.notes_url || null,
        });
        courseId = editingCourse.id;
        
        const oldModsSnap = await getDocs(query(collection(db, 'course_modules'), where('course_id', '==', courseId)));
        await Promise.all(oldModsSnap.docs.map(d => deleteDoc(doc(db, 'course_modules', d.id))));
        
        const oldAsgsSnap = await getDocs(query(collection(db, 'assignments'), where('course_id', '==', courseId)));
        await Promise.all(oldAsgsSnap.docs.map(d => deleteDoc(doc(db, 'assignments', d.id))));
        
        const oldQuizzesSnap = await getDocs(query(collection(db, 'quizzes'), where('course_id', '==', courseId)));
        if (!oldQuizzesSnap.empty) {
          for (const qDoc of oldQuizzesSnap.docs) {
            const oldQsSnap = await getDocs(query(collection(db, 'quiz_questions'), where('quiz_id', '==', qDoc.id)));
            await Promise.all(oldQsSnap.docs.map(d => deleteDoc(doc(db, 'quiz_questions', d.id))));
          }
          await Promise.all(oldQuizzesSnap.docs.map(d => deleteDoc(doc(db, 'quizzes', d.id))));
        }
      } else {
        const newCourseRef = await addDoc(collection(db, 'courses'), {
          title: form.title, description: form.description || null,
          difficulty: form.difficulty,
          youtube_url: form.youtube_url || null, notes_url: form.notes_url || null,
          created_by: user?.uid ?? (user as any)?.id ?? null,
          created_at: new Date().toISOString(),
        });
        courseId = newCourseRef.id;
      }

      if (modules.length > 0) {
        await Promise.all(modules.map((m, i) => addDoc(collection(db, 'course_modules'), {
          course_id: courseId, title: m.title, description: m.description || '',
          content_url: m.content_url || null, notes_url: m.notes_url || null,
          order_index: i, duration_minutes: m.duration_minutes ?? 60, type: m.type ?? 'video',
          is_free_preview: m.is_free_preview ?? false,
        })));
      }
      
      if (assignment.title.trim()) {
        await addDoc(collection(db, 'assignments'), {
          course_id: courseId, title: assignment.title,
          instructions: assignment.instructions || null, due_days: assignment.due_days,
        });
      }
      
      if (quiz.title.trim() && questions.some(q => q.question.trim())) {
        const newQuizRef = await addDoc(collection(db, 'quizzes'), { course_id: courseId, title: quiz.title });
        await Promise.all(
          questions.filter(q => q.question.trim()).map((q, i) => addDoc(collection(db, 'quiz_questions'), {
            quiz_id: newQuizRef.id, question: q.question, options: q.options, answer_index: q.answer_index, sort_order: i,
          }))
        );
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

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiProgress({ step: 'Initializing AI model...', progress: 5 });
    
    try {
      const token = typeof (user as any)?.getIdToken === 'function' ? await (user as any).getIdToken() : '';
      const response = await fetch(`${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://api.example.com'}/generateCourseAi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt, files: aiFiles })
      });
      
      if (!response.ok) throw new Error('AI Generation service failed');
      const data = await response.json();
      
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

  const addModule = () => setModules(p => [...p, blankModule()]);
  const removeModule = (i: number) => setModules(p => p.filter((_, idx) => idx !== i));
  const updateModule = (i: number, field: string, val: string) =>
    setModules(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const addQuestion = () => setQuestions(p => [...p, blankQuestion()]);
  const removeQuestion = (i: number) => setQuestions(p => p.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: string, val: string | number | string[]) =>
    setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

  return (
    <AppLayout title="Course Library" isAdmin>
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Course Library</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Manage your educational catalog. Create new modules, review drafts, and monitor performance.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button 
               variant="outline" 
               className="flex items-center gap-1.5 px-5 h-10 rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 text-xs font-bold"
             >
                <Upload className="w-4 h-4" /> Import
             </Button>
             
             <Button 
               onClick={() => setAiDialogOpen(true)} 
               className="flex items-center gap-1.5 px-5 h-10 rounded-xl bg-card border border-border text-primary hover:bg-muted/50 text-xs font-bold shadow-sm"
             >
                <Sparkles className="w-4 h-4 text-primary" /> AI Generator
             </Button>
             
             <Button 
               onClick={openCreate} 
               className="flex items-center gap-1.5 px-5 h-10 rounded-xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99] text-xs font-bold shadow-md shadow-primary/10"
             >
                <Plus className="w-4 h-4" /> Create Course
             </Button>
          </div>
        </section>

        {/* Filters Bar */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="flex gap-6 text-xs font-bold overflow-x-auto pb-1">
             <button className="text-primary border-b-2 border-primary pb-4 -mb-[17px] whitespace-nowrap">
               All Courses ({courses.length})
             </button>
             <button className="text-muted-foreground hover:text-foreground transition-colors pb-4 -mb-[17px] whitespace-nowrap">
               Published ({courses.filter(c => c.is_published).length})
             </button>
             <button className="text-muted-foreground hover:text-foreground transition-colors pb-4 -mb-[17px] whitespace-nowrap">
               Drafts ({courses.filter(c => !c.is_published).length})
             </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative group min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                className="w-full bg-card border border-border rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all shadow-inner placeholder:text-muted-foreground/60" 
                placeholder="Search courses..." 
                type="text"
              />
            </div>
            
             <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs font-bold px-4 py-2 rounded-xl bg-card border border-border shadow-sm shrink-0 h-10">
                <Filter className="w-4 h-4" /> <span>Filter</span>
             </button>
          </div>
        </section>

        {/* Grid Layout for Course Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingList ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-3xl overflow-hidden h-80 space-y-4 p-6">
                 <Skeleton className="h-40 w-full rounded-2xl" />
                 <Skeleton className="h-6 w-3/4 rounded-lg" />
                 <Skeleton className="h-4 w-1/2 rounded-lg" />
              </div>
            ))
          ) : courses.map((course, idx) => {
            const gradients = [
              'from-primary to-chart-4',
              'from-chart-4 to-primary',
              'from-primary/80 to-primary-container',
              'from-amber-500/85 to-destructive/85'
            ];
            const gradient = gradients[idx % gradients.length];
            
            return (
              <article key={course.id} className="bg-card rounded-3xl border border-border overflow-hidden group relative flex flex-col transition-all duration-300 hover:border-border/80 shadow-sm h-full">
                
                {/* Thumbnail Area */}
                <div className={`h-44 relative overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                   {course.thumbnail_url ? (
                     <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                   ) : (
                     <div className="text-4xl font-extrabold text-white/30 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                       {course.title.substring(0, 2).toUpperCase()}
                     </div>
                   )}
                   
                   {/* Status Badge */}
                   <div className={`absolute top-3 right-3 bg-card/90 backdrop-blur-md px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-sm ${course.is_published ? 'border-emerald-500/20' : 'border-border'}`}>
                     <div className={`w-1.5 h-1.5 rounded-full ${course.is_published ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                     <span className={`text-[10px] font-extrabold uppercase tracking-wider ${course.is_published ? 'text-foreground' : 'text-muted-foreground'}`}>
                       {course.is_published ? 'Published' : 'Draft'}
                     </span>
                   </div>
                   
                   {idx === 0 && course.is_published && (
                      <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-[9px] font-extrabold tracking-wider uppercase flex items-center gap-1 shadow-md">
                         <CheckCircle2 className="w-3.5 h-3.5" /> Featured
                      </div>
                   )}
                </div>

                {/* Content Area */}
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1 mb-1">{course.title}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-semibold">
                      <Folder className="w-3.5 h-3.5 text-primary" /> {course.category || 'General'}
                    </p>
                  </div>
                  
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 mt-auto">
                    <div>
                      <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Students</p>
                      <p className="text-xs font-bold text-foreground">{(course.student_count ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Level</p>
                      <p className="text-xs font-bold text-foreground truncate">{course.difficulty.substring(0,3).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                      <p className={`text-xs font-bold ${course.is_published ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {course.is_published ? 'Active' : 'WIP'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions overlay */}
                <div className="hidden md:flex absolute inset-0 bg-card/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center gap-4 z-10">
                   <button 
                     onClick={() => openEdit(course)} 
                     className="w-11 h-11 rounded-xl bg-background shadow-lg flex items-center justify-center text-foreground hover:text-primary hover:scale-105 transition-all border border-border" 
                     title="Edit Course"
                   >
                      <Edit2 className="w-5 h-5" />
                   </button>
                   
                   <button 
                     onClick={async (e) => {
                       e.stopPropagation();
                       try {
                         await updateDoc(doc(db, 'courses', course.id), { is_published: !course.is_published });
                         fetchCourses();
                       } catch (error) {
                         toast.error('Failed to update status');
                       }
                     }} 
                     className={`w-11 h-11 rounded-xl bg-background shadow-lg flex items-center justify-center hover:scale-105 transition-all border border-border ${
                       course.is_published ? 'text-amber-500' : 'text-emerald-500'
                     }`} 
                     title={course.is_published ? 'Unpublish' : 'Publish'}
                   >
                      {course.is_published ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                   </button>
                </div>
              </article>
            );
          })}

          {/* Create New Prompt Card */}
          <article 
            onClick={openCreate} 
            className="bg-muted/10 rounded-3xl border-2 border-dashed border-border overflow-hidden flex flex-col items-center justify-center p-8 text-center transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 cursor-pointer min-h-[340px] group"
          >
            <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
              <Plus className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">Create New Course</h3>
            <p className="text-xs text-muted-foreground max-w-[220px] mx-auto mb-6 font-semibold leading-relaxed">
              Set up syllabus, modules, quizzes, and publish to the platform.
            </p>
            <Button className="px-6 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/10">
              Start from Scratch
            </Button>
          </article>
        </section>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto rounded-3xl shadow-2xl p-0 text-foreground">
          <DialogHeader className="p-6 md:p-8 border-b border-border bg-muted/20">
            <DialogTitle className="text-base font-bold text-foreground">
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              Configure your course content, modules, and assessments below.
            </p>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 md:p-8">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-8 bg-muted rounded-xl p-1 border border-border shadow-inner h-12">
                <TabsTrigger value="info" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <BookOpen className="w-4 h-4 mr-1.5 hidden sm:inline" />Info
                </TabsTrigger>
                <TabsTrigger value="modules" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <Video className="w-4 h-4 mr-1.5 hidden sm:inline" />Modules
                </TabsTrigger>
                <TabsTrigger value="assignment" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <ClipboardList className="w-4 h-4 mr-1.5 hidden sm:inline" />Assignment
                </TabsTrigger>
                <TabsTrigger value="quiz" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <GraduationCap className="w-4 h-4 mr-1.5 hidden sm:inline" />Quiz
                </TabsTrigger>
              </TabsList>

              {/* Tab: Course Info */}
              <TabsContent value="info" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="c-title" className="text-xs font-bold text-foreground">Course Title *</Label>
                  <Input 
                    id="c-title" 
                    placeholder="e.g., Python for Beginners" 
                    className="bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 shadow-inner"
                    value={form.title} 
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Description</Label>
                  <Textarea 
                    placeholder="What students will learn..." 
                    className="bg-background border-border text-xs resize-none min-h-[120px] rounded-xl focus:ring-primary/20 shadow-inner font-semibold leading-relaxed"
                    value={form.description} 
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Difficulty Level</Label>
                    <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v as DifficultyLevel }))}>
                      <SelectTrigger className="bg-background border-border text-xs h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="c-yt" className="text-xs font-bold text-foreground">Preview Video URL</Label>
                    <div className="relative">
                      <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                      <Input 
                        id="c-yt" 
                        placeholder="https://youtube.com/..." 
                        className="pl-10 bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 shadow-inner font-semibold"
                        value={form.youtube_url} 
                        onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} 
                      />
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

              {/* Tab: Modules */}
              <TabsContent value="modules" className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <p className="text-xs font-semibold text-muted-foreground">Structure your course content</p>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={addModule}
                    className="bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99] h-9 px-4 rounded-xl font-bold text-xs shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add Module
                  </Button>
                </div>
                
                {modules.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground text-xs border-2 border-dashed border-border rounded-2xl bg-muted/20 font-semibold">
                    No modules added yet. Click <strong>Add Module</strong> to begin.
                  </div>
                )}
                
                <div className="space-y-4">
                  {modules.map((m, i) => (
                    <div key={i} className="bg-background border border-border rounded-2xl p-5 shadow-sm relative group">
                      <div className="absolute top-4 right-4">
                         <Button 
                           type="button" 
                           size="sm" 
                           variant="outline" 
                           onClick={() => removeModule(i)}
                           className="h-8 w-8 p-0 text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl"
                         >
                           <X className="w-4 h-4" />
                         </Button>
                      </div>
                      
                      <h4 className="font-bold text-xs text-primary mb-4">Module {i + 1}</h4>
                      
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-foreground">Module Title *</Label>
                          <Input 
                            placeholder="e.g., Introduction to Syntax" 
                            className="bg-background border-border text-xs h-10 rounded-xl focus:ring-primary/20 shadow-inner font-semibold"
                            value={m.title} 
                            onChange={e => updateModule(i, 'title', e.target.value)} 
                            required 
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-foreground">Video Content URL</Label>
                          <Input 
                            placeholder="https://youtube.com/..." 
                            className="bg-background border-border text-xs h-10 rounded-xl focus:ring-primary/20 shadow-inner font-semibold"
                            value={m.content_url ?? ''} 
                            onChange={e => updateModule(i, 'content_url', e.target.value)} 
                          />
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

              {/* Tab: Assignment */}
              <TabsContent value="assignment" className="space-y-6">
                <div className="border-b border-border pb-4">
                  <p className="text-xs font-semibold text-muted-foreground">Attach an assignment for grading</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Assignment Title</Label>
                  <Input 
                    placeholder="e.g., Build a Calculator App" 
                    className="bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 shadow-inner font-semibold"
                    value={assignment.title} 
                    onChange={e => setAssignment(a => ({ ...a, title: e.target.value }))} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Instructions</Label>
                  <Textarea 
                    placeholder="Describe what students need to submit..." 
                    className="bg-background border-border text-xs resize-none min-h-[150px] rounded-xl focus:ring-primary/20 shadow-inner font-semibold leading-relaxed"
                    value={assignment.instructions} 
                    onChange={e => setAssignment(a => ({ ...a, instructions: e.target.value }))} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Due Days (from enrollment)</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={365} 
                    className="bg-background border-border text-xs w-full max-w-[200px] h-11 rounded-xl focus:ring-primary/20 shadow-inner font-bold"
                    value={assignment.due_days} 
                    onChange={e => setAssignment(a => ({ ...a, due_days: Number(e.target.value) }))} 
                  />
                </div>
              </TabsContent>

              {/* Tab: Quiz */}
              <TabsContent value="quiz" className="space-y-6">
                <div className="space-y-2 pb-6 border-b border-border">
                  <Label className="text-xs font-bold text-foreground">Quiz Title</Label>
                  <Input 
                    placeholder="e.g., Python Basics Quiz" 
                    className="bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 shadow-inner font-semibold"
                    value={quiz.title} 
                    onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground">
                    {questions.length} Question{questions.length !== 1 ? 's' : ''}
                  </p>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={addQuestion}
                    className="bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99] h-9 px-4 rounded-xl font-bold text-xs shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qi) => (
                    <div key={qi} className="bg-background border border-border rounded-2xl p-5 shadow-sm relative group">
                      <div className="absolute top-4 right-4">
                         {questions.length > 1 && (
                           <Button 
                             type="button" 
                             size="sm" 
                             variant="outline" 
                             onClick={() => removeQuestion(qi)}
                             className="h-8 w-8 p-0 text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl"
                           >
                             <X className="w-4 h-4" />
                           </Button>
                         )}
                      </div>
                      
                      <h4 className="font-bold text-xs text-primary mb-4">Question {qi + 1}</h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-foreground">Question Text *</Label>
                          <Textarea 
                            placeholder="Type the question..." 
                            className="bg-background border-border text-xs resize-none min-h-[80px] rounded-xl focus:ring-primary/20 shadow-inner font-semibold leading-relaxed"
                            value={q.question} 
                            onChange={e => updateQuestion(qi, 'question', e.target.value)} 
                          />
                        </div>
                        
                        <div className="space-y-3 bg-muted/25 p-4 rounded-2xl border border-border">
                          <Label className="text-xs font-bold text-foreground mb-2 block">
                            Answer Options (Select correct one)
                          </Label>
                          
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name={`q${qi}-answer`} 
                                checked={q.answer_index === oi}
                                onChange={() => updateQuestion(qi, 'answer_index', oi)}
                                className="w-4 h-4 text-primary focus:ring-primary border-border cursor-pointer accent-primary" 
                              />
                              <Input 
                                placeholder={`Option ${oi + 1}`} 
                                className={`bg-background border-border h-10 text-xs rounded-xl flex-1 focus:ring-primary/20 font-semibold shadow-inner ${
                                  q.answer_index === oi ? 'border-primary/50 bg-primary/5' : ''
                                }`}
                                value={opt} 
                                onChange={e => {
                                  const opts = [...q.options]; opts[oi] = e.target.value;
                                  updateQuestion(qi, 'options', opts);
                                }} 
                              />
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
            <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-6 border-t border-border justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="w-full sm:w-auto h-11 px-6 border-border text-foreground hover:bg-muted/50 font-bold rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="w-full sm:w-auto h-11 px-8 bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.98] transition-all text-xs"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingCourse ? 'Save Changes' : 'Save as Draft'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* AI Generator Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-md rounded-3xl shadow-2xl p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" /> 
              <span>Generate with AI</span>
            </DialogTitle>
            <DialogDescription className="hidden" />
          </DialogHeader>
          
          <form onSubmit={handleAIGenerate} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">What should the course be about?</Label>
              <Textarea 
                placeholder="e.g. A comprehensive guide to Next.js 14 and React Server Components..." 
                className="bg-background border-border text-xs resize-none min-h-[100px] rounded-xl focus:ring-primary/20 shadow-inner font-semibold leading-relaxed"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                disabled={aiGenerating}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Upload Documents (PDF, TXT, DOCX)</Label>
              <p className="text-[11px] text-muted-foreground mb-2 font-semibold">
                Upload any syllabus, guidelines, or core material for the AI to base the course on.
              </p>
              <PdfUploadField 
                label="Reference Material" 
                value={aiFiles[0] || ''} 
                onChange={url => setAiFiles(url ? [url] : [])} 
                folder="ai-uploads" 
              />
            </div>

            {aiGenerating && (
               <div className="py-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-primary">
                     <span>{aiProgress.step}</span>
                     <span>{aiProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 border border-border overflow-hidden">
                     <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${aiProgress.progress}%` }} />
                  </div>
               </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAiDialogOpen(false)} 
                disabled={aiGenerating}
                className="h-10 px-4 border-border text-foreground hover:bg-muted/50 font-bold rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={aiGenerating || !aiPrompt.trim()}
                className="h-10 px-6 bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.99] flex items-center gap-1.5 text-xs"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{aiGenerating ? 'Generating...' : 'Generate Full Course'}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
export { AdminCoursesPage };
