import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
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
    if (status === 'submitted') return 'bg-primary/20 text-primary border-primary/30';
    if (status === 'graded') return 'bg-tertiary/20 text-tertiary border-tertiary/30';
    return 'bg-outline-variant text-on-surface border-outline-variant';
  };

  const statusIcon = (status?: string) => {
    if (status === 'graded') return 'check_circle';
    if (status === 'submitted') return 'schedule';
    return 'error';
  };

  const statusLabel = (a: Assignment) => a.submission?.status ?? 'pending';

  return (
    <AppLayout title="Assignments">
      <div className="max-w-[1440px] mx-auto h-full flex flex-col">
        {!selected ? (
          <div className="space-y-xl h-full pb-xl">
            <h1 className="font-display text-display text-on-surface mb-xs">Assignments</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">View and submit your technical assignments.</p>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full bg-surface-container rounded-xl" />)}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-outline-variant/60 rounded-xl text-on-surface-variant glass-card">
                <span className="material-symbols-outlined text-[48px] mx-auto mb-3 opacity-30">description</span>
                <p className="font-headline-md text-headline-md text-on-surface">No assignments yet</p>
                <p className="font-body-md text-body-md">Enroll in a course to see its assignments here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {assignments.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setSelected(a); setNote(''); setFile(null); }}
                    className="text-left p-xl rounded-xl border border-outline-variant/60 bg-surface-container-low hover:border-primary hover:shadow-[0_0_15px_rgba(192,193,255,0.15)] transition-all group flex flex-col h-full glass-card"
                  >
                    <div className="flex items-start justify-between gap-md mb-md">
                      <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant shrink-0 group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                        <span className="material-symbols-outlined text-on-surface group-hover:text-primary">terminal</span>
                      </div>
                      <div className={`px-2 py-1 rounded text-[11px] font-label-sm uppercase tracking-wider border flex items-center gap-1 ${statusColor(statusLabel(a))}`}>
                        <span className="material-symbols-outlined text-[14px]">{statusIcon(statusLabel(a))}</span>
                        {statusLabel(a)}
                      </div>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">{a.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex-grow line-clamp-2 mb-4">{a.instructions ?? 'No instructions provided.'}</p>
                    <div className="font-label-sm text-label-sm text-on-surface-variant flex items-center mt-auto pt-4 border-t border-outline-variant/40">
                      <span className="material-symbols-outlined text-[14px] mr-1">book</span>
                      {a.courses?.title ?? '—'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-xl h-full lg:h-[calc(100vh-8rem)]">
            <div className="lg:hidden mb-4">
              <button 
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Assignments
              </button>
            </div>

            {/* Left Column: Assignment Brief */}
            <section className="lg:w-[60%] flex flex-col h-full lg:overflow-y-auto glass-card rounded-xl border border-outline-variant/60">
              {/* Header Section */}
              <div className="p-md md:p-xl border-b border-outline-variant/60 bg-surface-container-lowest/50 sticky top-0 backdrop-blur-md z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <button 
                        onClick={() => setSelected(null)}
                        className="hidden lg:flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md mr-2 bg-surface-container px-2 py-1 rounded border border-outline-variant/40"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back
                      </button>
                      <span className="font-label-sm text-label-sm text-secondary bg-secondary/10 px-2 py-1 rounded border border-secondary/20 uppercase tracking-widest">{selected.courses?.title}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center"><span className="material-symbols-outlined text-[14px] mr-1">schedule</span>Due in {selected.due_days}d</span>
                    </div>
                    <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">{selected.title}</h1>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-md md:p-xl font-body-md text-body-md flex-1 text-on-surface-variant whitespace-pre-wrap">
                {selected.instructions ?? 'No instructions provided.'}
              </div>
            </section>

            {/* Right Column: Submission Portal */}
            <section className="lg:w-[40%] flex flex-col gap-lg h-full lg:overflow-y-auto">
              
              {!selected.submission ? (
                <>
                  {/* Action / Sync Card (GitHub style placeholder) */}
                  <div className="glass-card rounded-xl p-md md:p-lg shadow-[0_0_15px_rgba(192,193,255,0.05)] relative overflow-hidden border border-outline-variant/60">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
                    <h3 className="font-headline-md text-[18px] text-on-surface mb-1 flex items-center">
                      <span className="material-symbols-outlined mr-2 text-primary">terminal</span>
                      Submit via GitHub (Coming Soon)
                    </h3>
                    <p className="font-body-md text-[14px] text-on-surface-variant mb-6">Link your repository to automatically run the CI/CD grading pipeline.</p>
                    <div className="space-y-4 relative z-10 opacity-50 pointer-events-none">
                      <div>
                        <label className="block font-label-md text-label-sm text-outline mb-1">Repository URL</label>
                        <div className="flex relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">link</span>
                          <input className="w-full bg-surface-container-highest border border-outline-variant/60 text-on-surface font-label-md text-label-md rounded-lg py-2 pl-10 pr-4" placeholder="https://github.com/username/repo" type="text" disabled/>
                        </div>
                      </div>
                      <button className="w-full bg-surface-variant text-on-surface-variant font-label-md text-[14px] py-3 rounded-lg flex justify-center items-center gap-2 mt-2" disabled>
                        <span className="material-symbols-outlined text-[20px]">sync</span> Run Autograder
                      </button>
                    </div>
                  </div>

                  {/* Manual Upload Card */}
                  <div className="glass-card rounded-xl p-md md:p-lg flex-1 flex flex-col border border-outline-variant/60 shadow-[0_0_15px_rgba(192,193,255,0.15)] relative">
                    <h3 className="font-headline-md text-[18px] text-on-surface mb-1 flex items-center">
                      <span className="material-symbols-outlined mr-2 text-primary">upload_file</span>
                      Manual Upload
                    </h3>
                    <p className="font-body-md text-[14px] text-on-surface-variant mb-4">Upload a file or provide a link/notes.</p>
                    
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4">
                      <div 
                        className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center transition-all group ${file ? 'border-primary bg-primary/5' : 'border-outline-variant/60 hover:border-primary/50 hover:bg-surface-container-high/30 cursor-pointer'}`}
                        onClick={() => document.getElementById('file-input')?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
                      >
                        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-outline group-hover:text-primary text-[32px] transition-colors">cloud_upload</span>
                        </div>
                        {file ? (
                          <>
                            <span className="font-headline-md text-[16px] text-primary mb-1">Selected: {file.name}</span>
                            <span className="font-body-md text-[14px] text-on-surface-variant mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-error font-label-md text-label-md hover:underline">Remove</button>
                          </>
                        ) : (
                          <>
                            <span className="font-headline-md text-[16px] text-on-surface mb-1">Drag and drop your files here</span>
                            <span className="font-body-md text-[14px] text-on-surface-variant mb-4">or click to browse</span>
                            <span className="font-label-sm text-label-sm text-outline border border-outline-variant rounded px-2 py-1 bg-surface">Max size: 50MB</span>
                          </>
                        )}
                        <input id="file-input" type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                      </div>
                      
                      <div>
                        <label className="block font-label-md text-label-sm text-outline mb-1">Notes / Repository Link</label>
                        <textarea 
                          value={note} 
                          onChange={e => setNote(e.target.value)}
                          placeholder="Paste a link to your repository or write notes here..."
                          className="w-full bg-surface-container-highest border border-outline-variant/60 text-on-surface font-body-md text-[14px] rounded-lg py-3 px-4 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors resize-none h-24"
                        />
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={submitting || (!file && !note.trim())} 
                        className="w-full bg-primary text-on-primary-container font-headline-md text-[16px] py-3 rounded-lg hover:brightness-110 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 mt-auto"
                      >
                        {submitting ? (
                          <><span className="material-symbols-outlined text-[20px] animate-spin">autorenew</span> Submitting...</>
                        ) : (
                          <><span className="material-symbols-outlined text-[20px]">send</span> Submit Assignment</>
                        )}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                /* Submission History / Status */
                <div className="glass-card rounded-xl p-md md:p-lg border border-outline-variant/60">
                  <h3 className="font-headline-md text-[18px] text-on-surface mb-4">Submission Status</h3>
                  <div className="space-y-4">
                    <div className={`flex items-start gap-3 p-4 rounded-lg border ${selected.submission.status === 'graded' ? 'border-tertiary/20 bg-tertiary/5' : 'border-primary/20 bg-primary/5'}`}>
                      <span className={`material-symbols-outlined mt-0.5 ${selected.submission.status === 'graded' ? 'text-tertiary' : 'text-primary'}`}>
                        {statusIcon(selected.submission.status)}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-headline-sm text-[16px] text-on-surface capitalize">{selected.submission.status}</span>
                          <span className="font-label-sm text-label-sm text-outline">
                            {new Date(selected.submission.submitted_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {selected.submission.status === 'graded' ? (
                          <>
                            <p className="font-body-md text-[14px] text-on-surface-variant mb-2">
                              {selected.submission.feedback ?? 'No feedback provided.'}
                            </p>
                            <div className="font-label-md text-[14px] text-tertiary">
                              Score: {selected.submission.score}/100
                            </div>
                          </>
                        ) : (
                          <p className="font-body-md text-[14px] text-on-surface-variant">Your submission is pending review by the instructor.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
