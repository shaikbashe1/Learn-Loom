import { useState, useEffect, useRef } from 'react';
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
  GraduationCap, ClipboardList
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground text-balance">Course Management</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{courses.length} course{courses.length !== 1 ? 's' : ''} total</p>
          </div>
          <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Create Course
          </Button>
        </div>

        {/* Course list */}
        {loadingList ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg bg-muted" />)}
          </div>
        ) : courses.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <BookOpen className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No courses yet. Click <strong>Create Course</strong> to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <Card key={course.id} className="bg-card border-border h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{course.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 text-pretty">{course.description ?? 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <Badge variant="outline" className={`text-[11px] ${course.difficulty === 'Beginner' ? 'border-success/40 text-success' : course.difficulty === 'Intermediate' ? 'border-warning/40 text-warning' : 'border-destructive/40 text-destructive'}`}>
                            {course.difficulty}
                          </Badge>
                          <Badge variant="outline" className={`text-[11px] ${course.is_published ? 'border-primary/40 text-primary' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                            {course.is_published ? '● Published' : '○ Draft'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {course.youtube_url && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Video className="w-3 h-3" /> Video
                          </span>
                        )}
                        {course.notes_url && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3" /> Notes
                          </span>
                        )}
                        <div className="ml-auto flex gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => togglePublish(course)}
                            className="h-7 text-xs border border-border text-foreground hover:bg-accent px-2">
                            {course.is_published ? <EyeOff className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                            {course.is_published ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(course)}
                            className="h-7 text-xs border border-border text-foreground hover:bg-accent px-2">
                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" disabled={deleting === course.id}
                            onClick={() => deleteCourse(course.id)}
                            className="h-7 w-7 border border-destructive/30 text-destructive hover:bg-destructive/10 p-0">
                            {deleting === course.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-balance">
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave}>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-4 bg-muted">
                <TabsTrigger value="info" className="text-xs"><BookOpen className="w-3 h-3 mr-1 hidden sm:inline" />Info</TabsTrigger>
                <TabsTrigger value="modules" className="text-xs"><Video className="w-3 h-3 mr-1 hidden sm:inline" />Modules</TabsTrigger>
                <TabsTrigger value="assignment" className="text-xs"><ClipboardList className="w-3 h-3 mr-1 hidden sm:inline" />Assignment</TabsTrigger>
                <TabsTrigger value="quiz" className="text-xs"><GraduationCap className="w-3 h-3 mr-1 hidden sm:inline" />Quiz</TabsTrigger>
              </TabsList>

              {/* ── Tab: Course Info ──────────────────────────────────────── */}
              <TabsContent value="info" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="c-title" className="text-sm font-normal text-foreground">Course Title *</Label>
                  <Input id="c-title" placeholder="e.g., Python for Beginners" className="bg-input border-border text-foreground"
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-foreground">Description</Label>
                  <Textarea placeholder="What students will learn..." className="bg-input border-border text-foreground resize-none" rows={3}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-foreground">Difficulty Level</Label>
                  <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v as DifficultyLevel }))}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-yt" className="text-sm font-normal text-foreground">YouTube Video URL (intro / main)</Label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="c-yt" placeholder="https://www.youtube.com/watch?v=..." className="pl-10 bg-input border-border text-foreground"
                      value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} />
                  </div>
                  {form.youtube_url && youtubeEmbedUrl(form.youtube_url) && (
                    <div className="aspect-video rounded-lg overflow-hidden border border-border mt-2">
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
                  <p className="text-sm text-muted-foreground">Add video modules / lessons to this course</p>
                  <Button type="button" size="sm" variant="ghost" onClick={addModule}
                    className="border border-border text-foreground hover:bg-accent h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Module
                  </Button>
                </div>
                {modules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    No modules yet — click <strong>Add Module</strong> above
                  </div>
                )}
                {modules.map((m, i) => (
                  <Card key={i} className="bg-muted/30 border-border">
                    <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm text-foreground">Module {i + 1}</CardTitle>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeModule(i)}
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">
                        <X className="w-3 h-3" />
                      </Button>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-normal text-foreground">Module Title *</Label>
                        <Input placeholder="e.g., Intro to Variables" className="bg-input border-border text-foreground h-8 text-sm"
                          value={m.title} onChange={e => updateModule(i, 'title', e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-normal text-foreground">YouTube / Content URL</Label>
                        <Input placeholder="https://youtube.com/watch?v=..." className="bg-input border-border text-foreground h-8 text-sm"
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
                <p className="text-sm text-muted-foreground">Attach one assignment to this course</p>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-foreground">Assignment Title</Label>
                  <Input placeholder="e.g., Build a Calculator App" className="bg-input border-border text-foreground"
                    value={assignment.title} onChange={e => setAssignment(a => ({ ...a, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-foreground">Instructions</Label>
                  <Textarea placeholder="Describe what students need to submit..." className="bg-input border-border text-foreground resize-none" rows={5}
                    value={assignment.instructions} onChange={e => setAssignment(a => ({ ...a, instructions: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-foreground">Due Days (from enrollment)</Label>
                  <Input type="number" min={1} max={365} className="bg-input border-border text-foreground w-32"
                    value={assignment.due_days} onChange={e => setAssignment(a => ({ ...a, due_days: Number(e.target.value) }))} />
                </div>
              </TabsContent>

              {/* ── Tab: Quiz ─────────────────────────────────────────────── */}
              <TabsContent value="quiz" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-foreground">Quiz Title</Label>
                  <Input placeholder="e.g., Python Basics Quiz" className="bg-input border-border text-foreground"
                    value={quiz.title} onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={addQuestion}
                    className="border border-border text-foreground hover:bg-accent h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Question
                  </Button>
                </div>
                {questions.map((q, qi) => (
                  <Card key={qi} className="bg-muted/30 border-border">
                    <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm text-foreground">Q{qi + 1}</CardTitle>
                      {questions.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeQuestion(qi)}
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-normal text-foreground">Question *</Label>
                        <Textarea placeholder="Type the question..." className="bg-input border-border text-foreground resize-none text-sm" rows={2}
                          value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-foreground">Answer Options (select correct one)</Label>
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name={`q${qi}-answer`} checked={q.answer_index === oi}
                              onChange={() => updateQuestion(qi, 'answer_index', oi)}
                              className="shrink-0 accent-primary" />
                            <Input placeholder={`Option ${oi + 1}`} className="bg-input border-border text-foreground h-7 text-xs flex-1"
                              value={opt} onChange={e => {
                                const opts = [...q.options]; opts[oi] = e.target.value;
                                updateQuestion(qi, 'options', opts);
                              }} />
                          </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground">Select the radio button next to the correct answer</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            {/* Footer buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}
                className="flex-1 border border-border text-foreground hover:bg-accent">
                Cancel
              </Button>
              <Button type="submit" disabled={saving}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
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
