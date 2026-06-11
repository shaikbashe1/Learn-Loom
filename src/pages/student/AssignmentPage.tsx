import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  instructions: string | null;
  due_days: number;
  course_id: string;
  courses?: { title: string };
  submission?: { status: string; score: number | null; feedback: string | null; submitted_at: string };
}

export default function AssignmentPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // Fetch assignments for enrolled courses
      const { data: enrollments } = await supabase
        .from('user_course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);
      const courseIds = (enrollments ?? []).map(e => e.course_id);

      if (courseIds.length === 0) { setLoading(false); return; }

      const { data: asgns } = await supabase
        .from('assignments')
        .select('*, courses!assignments_course_id_fkey(title)')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      // Fetch user's submissions
      const asgIds = (asgns ?? []).map(a => a.id);
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, score, feedback, submitted_at')
        .eq('user_id', user.id)
        .in('assignment_id', asgIds);

      const subMap: Record<string, Assignment['submission']> = {};
      (subs ?? []).forEach(s => { subMap[s.assignment_id] = { status: s.status, score: s.score, feedback: s.feedback, submitted_at: s.submitted_at }; });

      const merged = (asgns ?? []).map(a => ({ ...a, submission: subMap[a.id] }));
      setAssignments(merged);
      if (merged.length > 0) setSelected(merged[0]);
      setLoading(false);
    })();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selected) return;
    if (!note.trim() && !file) { toast.error('Please add notes or upload a file'); return; }
    setSubmitting(true);

    let answerText = note.trim();

    // Upload file to Supabase Storage if provided
    if (file) {
      const filePath = `assignments/${user.id}/${selected.id}/${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('submissions').upload(filePath, file, { upsert: true });
      if (uploadErr) {
        toast.error('File upload failed', { description: uploadErr.message });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(filePath);
      answerText += (answerText ? '\n\n' : '') + `File: ${urlData.publicUrl}`;
    }

    const { error } = await supabase.from('assignment_submissions').upsert({
      user_id: user.id,
      assignment_id: selected.id,
      answer_text: answerText,
      status: 'submitted',
    }, { onConflict: 'user_id,assignment_id' });

    setSubmitting(false);
    if (error) { toast.error('Submission failed', { description: error.message }); return; }
    toast.success('Assignment submitted!', { description: `${selected.title} has been submitted for review.` });
    // Log activity for streak tracking (fire-and-forget)
    void supabase.rpc('log_activity', { p_user_id: user.id, p_type: 'assignment', p_value: 1 }).then(() => {});

    // Update local state
    const updated = { status: 'submitted' as const, score: null, feedback: null, submitted_at: new Date().toISOString() };
    setAssignments(prev => prev.map(a => a.id === selected.id ? { ...a, submission: updated } : a));
    setSelected(prev => prev ? { ...prev, submission: updated } : prev);
    setNote(''); setFile(null);
  };

  const statusColor = (status?: string) => {
    if (status === 'submitted') return 'bg-chart-2/15 text-chart-2 border-chart-2/30';
    if (status === 'graded') return 'bg-chart-3/15 text-chart-3 border-chart-3/30';
    return 'bg-chart-4/15 text-chart-4 border-chart-4/30';
  };

  const statusIcon = (status?: string) => {
    if (status === 'graded') return <CheckCircle className="w-3 h-3" />;
    if (status === 'submitted') return <Clock className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  const statusLabel = (a: Assignment) => a.submission?.status ?? 'pending';

  return (
    <AppLayout title="Assignments">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-balance">Assignments</h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-muted rounded-xl" />)}
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-foreground">No assignments yet</p>
            <p className="text-sm">Enroll in a course to see its assignments here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              {assignments.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setNote(''); setFile(null); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === a.id ? 'border-primary/40 bg-primary/10' : 'border-border bg-card hover:border-primary/20'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground flex-1 min-w-0 text-balance">{a.title}</p>
                    <Badge className={`text-[10px] shrink-0 flex items-center gap-1 ${statusColor(statusLabel(a))}`}>
                      {statusIcon(statusLabel(a))} {statusLabel(a)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.courses?.title ?? '—'}</p>
                </button>
              ))}
            </div>

            {selected && (
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg text-foreground text-balance">{selected.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{selected.courses?.title}</p>
                      </div>
                      <Badge className={`text-[10px] shrink-0 flex items-center gap-1 mt-1 ${statusColor(statusLabel(selected))}`}>
                        {statusIcon(statusLabel(selected))} {statusLabel(selected)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Instructions</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{selected.instructions ?? 'No instructions provided.'}</p>
                    </div>
                  </CardContent>
                </Card>

                {!selected.submission && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground">Submit Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-normal text-foreground">Upload File (optional)</Label>
                          <div
                            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
                            onClick={() => document.getElementById('file-input')?.click()}
                          >
                            <input id="file-input" type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                            {file ? (
                              <p className="text-sm font-medium text-primary">{file.name}</p>
                            ) : (
                              <>
                                <p className="text-sm text-foreground font-medium">Drop file here or click to browse</p>
                                <p className="text-xs text-muted-foreground mt-1">PDF, ZIP, IPYNB (max 50MB)</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-normal text-foreground">Notes / Answer</Label>
                          <Textarea placeholder="Write your answer or notes for the reviewer…" className="bg-input border-border text-foreground resize-none" rows={4} value={note} onChange={e => setNote(e.target.value)} />
                        </div>
                        <Button type="submit" disabled={submitting || (!file && !note.trim())} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : <><Upload className="w-4 h-4 mr-2" />Submit Assignment</>}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {selected.submission?.status === 'submitted' && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-5 flex items-start gap-4">
                      <Clock className="w-6 h-6 text-chart-2 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Submission Received</h4>
                        <p className="text-sm text-muted-foreground">Your assignment is pending review by the instructor.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {new Date(selected.submission.submitted_at).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selected.submission?.status === 'graded' && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <CheckCircle className="w-6 h-6 text-chart-3 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Assignment Graded</h4>
                          {selected.submission.feedback && (
                            <p className="text-sm text-muted-foreground mb-2">{selected.submission.feedback}</p>
                          )}
                          {selected.submission.score !== null && (
                            <p className="text-sm font-semibold text-primary">Score: {selected.submission.score}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
