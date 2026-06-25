import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
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
    if (status === 'submitted') return 'bg-primary/10 text-primary border-primary/30';
    if (status === 'graded') return 'bg-tertiary/10 text-tertiary border-tertiary/30';
    return 'bg-surface-container text-text-secondary border-border-base';
  };

  const statusIcon = (status?: string) => {
    if (status === 'graded') return 'check_circle';
    if (status === 'submitted') return 'schedule';
    return 'error';
  };

  const statusLabel = (a: Assignment) => a.submission?.status ?? 'pending';

  return (
    <AppLayout title="Assignments">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg h-full flex flex-col relative z-10">
        {!selected ? (
          <div className="space-y-stack-xl h-full pb-stack-lg">
            <div>
              <h1 className="font-display-lg-mobile md:font-display-lg text-text-primary mb-2">Assignments</h1>
              <p className="font-body-lg text-text-secondary max-w-2xl">Manage and track your course assignments efficiently.</p>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full bg-surface-container rounded-xl" />)}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border-base rounded-2xl text-text-secondary glass-panel card-lift">
                <span className="material-symbols-outlined text-[48px] mx-auto mb-4 opacity-40 text-primary">description</span>
                <p className="font-headline-md text-[20px] text-text-primary font-bold mb-1">No assignments yet</p>
                <p className="font-body-md text-[16px]">Enroll in a course to see its assignments here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setSelected(a); setNote(''); setFile(null); }}
                    className="text-left p-6 rounded-xl border border-border-base hover:border-primary/50 transition-all duration-300 group flex flex-col h-full glass-panel card-lift ring-0 hover:ring-1 hover:ring-primary/30"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center border border-border-base shrink-0 group-hover:bg-primary group-hover:border-primary transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-text-secondary group-hover:text-white transition-colors">terminal</span>
                      </div>
                      <div className={`px-2 py-1 rounded text-[11px] font-label-sm uppercase tracking-widest border flex items-center gap-1 font-bold ${statusColor(statusLabel(a))}`}>
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{statusIcon(statusLabel(a))}</span>
                        {statusLabel(a)}
                      </div>
                    </div>
                    <h3 className="font-headline-md text-[18px] text-text-primary mb-2 font-bold group-hover:text-primary transition-colors">{a.title}</h3>
                    <p className="font-body-sm text-[14px] text-text-secondary flex-grow line-clamp-2 mb-4 leading-relaxed">{a.instructions ?? 'No instructions provided.'}</p>
                    <div className="font-label-sm text-[12px] text-text-secondary flex items-center mt-auto pt-4 border-t border-border-base">
                      <span className="material-symbols-outlined text-[14px] mr-1 text-primary">school</span>
                      {a.courses?.title ?? '—'}
                      <span className="ml-auto text-[11px] uppercase tracking-wider font-bold text-error bg-error/10 px-2 py-0.5 rounded border border-error/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span> {a.due_days}d
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 h-full lg:h-[calc(100vh-10rem)]">
            <div className="lg:hidden mb-2">
              <Button 
                onClick={() => setSelected(null)}
                variant="outline"
                className="flex items-center gap-2 text-text-secondary hover:text-primary transition-all font-label-md rounded-xl border border-border-base bg-surface shadow-sm min-h-[44px] h-11"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Assignments
              </Button>
            </div>

            {/* Left Column: Assignment Brief */}
            <section className="lg:w-[60%] flex flex-col h-full lg:overflow-y-auto glass-panel rounded-2xl border border-border-base shadow-sm">
              {/* Header Section */}
              <div className="p-6 md:p-8 border-b border-border-base bg-surface-bright/50 sticky top-0 backdrop-blur-md z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <button 
                        onClick={() => setSelected(null)}
                        className="hidden lg:flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-container transition-all w-8 h-8 rounded-full border border-border-base bg-surface shadow-sm"
                        title="Back to Assignments"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      </button>
                      <span className="font-label-sm text-[11px] font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20 uppercase tracking-widest">{selected.courses?.title}</span>
                      <span className="font-label-sm text-[12px] font-bold text-error flex items-center"><span className="material-symbols-outlined text-[16px] mr-1">schedule</span>Due in {selected.due_days}d</span>
                    </div>
                    <h1 className="font-headline-lg text-[28px] md:text-[32px] font-bold text-text-primary text-balance">{selected.title}</h1>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 md:p-8 font-body-md text-[15px] leading-relaxed flex-1 text-text-secondary whitespace-pre-wrap custom-scrollbar">
                {selected.instructions ?? 'No instructions provided.'}
              </div>
            </section>

            {/* Right Column: Submission Portal */}
            <section className="lg:w-[40%] flex flex-col gap-6 h-full lg:overflow-y-auto custom-scrollbar lg:pr-2">
              
              {!selected.submission ? (
                <>
                  {/* Action / Sync Card (GitHub style placeholder) */}
                  <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden border border-border-base shadow-sm ai-gradient-border card-lift">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                      <span className="material-symbols-outlined text-primary text-[24px]">terminal</span>
                      <h3 className="font-headline-md text-[20px] font-bold text-text-primary ai-gradient-text">Submit via GitHub</h3>
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary-fixed-dim font-label-sm text-[10px] border border-secondary-container/30">Coming Soon</span>
                    </div>
                    <p className="font-body-sm text-[14px] text-text-secondary mb-6 relative z-10">Link your repository to automatically run the CI/CD grading pipeline.</p>
                    <div className="space-y-4 relative z-10 opacity-50 pointer-events-none">
                      <div>
                        <label className="block font-label-md text-[13px] font-medium text-text-secondary mb-1.5">Repository URL</label>
                        <div className="flex relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary text-[18px]">link</span>
                          <input className="w-full bg-surface border border-border-base text-text-primary font-label-md text-[14px] rounded-lg py-2.5 pl-10 pr-4" placeholder="https://github.com/username/repo" type="text" disabled/>
                        </div>
                      </div>
                      <button className="w-full bg-surface-container text-text-secondary font-label-md text-[14px] font-bold py-3 rounded-lg flex justify-center items-center gap-2 mt-2" disabled>
                        <span className="material-symbols-outlined text-[20px]">sync</span> Run Autograder
                      </button>
                    </div>
                  </div>

                  {/* Manual Upload Card */}
                  <div className="glass-panel rounded-2xl p-6 md:p-8 flex-1 flex flex-col border border-border-base shadow-sm relative card-lift">
                    <h3 className="font-headline-md text-[20px] font-bold text-text-primary mb-1 flex items-center">
                      <span className="material-symbols-outlined mr-2 text-primary">upload_file</span>
                      Manual Upload
                    </h3>
                    <p className="font-body-sm text-[14px] text-text-secondary mb-6">Upload a file or provide a link/notes.</p>
                    
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5">
                      <div 
                        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 group ${file ? 'border-primary bg-primary/5 shadow-inner' : 'border-border-base hover:border-primary/50 hover:bg-surface/50 cursor-pointer'}`}
                        onClick={() => document.getElementById('file-input')?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
                      >
                        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform border border-border-base shadow-sm">
                          <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-[32px] transition-colors">cloud_upload</span>
                        </div>
                        {file ? (
                          <>
                            <span className="font-headline-md text-[16px] font-bold text-primary mb-1 truncate max-w-full px-4">{file.name}</span>
                            <span className="font-body-sm text-[13px] text-text-secondary mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                             <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-error font-label-sm text-[12px] font-bold bg-error/10 px-4 py-2 rounded-full border border-error/20 transition-all hover:bg-error hover:text-white min-h-[44px] flex items-center justify-center">Remove</button>
                          </>
                        ) : (
                          <>
                            <span className="font-headline-md text-[16px] font-bold text-text-primary mb-1">Drag and drop your files here</span>
                            <span className="font-body-sm text-[14px] text-text-secondary mb-4">or click to browse</span>
                            <span className="font-label-sm text-[11px] font-bold text-text-secondary border border-border-base rounded px-2 py-1 bg-surface uppercase tracking-wider">Max size: 50MB</span>
                          </>
                        )}
                        <input id="file-input" type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                      </div>
                      
                      <div>
                        <label className="block font-label-md text-[13px] font-medium text-text-secondary mb-1.5">Notes / Repository Link</label>
                        <textarea 
                          value={note} 
                          onChange={e => setNote(e.target.value)}
                          placeholder="Paste a link to your repository or write notes here..."
                          className="w-full bg-surface border border-border-base text-text-primary font-body-sm text-[14px] rounded-lg py-3 px-4 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors resize-none h-28 shadow-sm"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={submitting || (!file && !note.trim())} 
                        className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-xl hover:bg-primary-container transition-all shadow-md disabled:opacity-50 mt-auto flex justify-center items-center gap-2 min-h-[44px] h-12"
                      >
                        {submitting ? (
                          <><span className="material-symbols-outlined text-[20px] animate-spin">autorenew</span> Submitting...</>
                        ) : (
                          <><span className="material-symbols-outlined text-[20px]">send</span> Submit Assignment</>
                        )}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                /* Submission History / Status */
                <div className="glass-panel rounded-2xl p-6 md:p-8 border border-border-base shadow-sm card-lift">
                  <h3 className="font-headline-md text-[20px] font-bold text-text-primary mb-5">Submission Status</h3>
                  <div className="space-y-4">
                    <div className={`flex items-start gap-4 p-5 rounded-xl border shadow-sm ${selected.submission.status === 'graded' ? 'border-tertiary/30 bg-tertiary/5' : 'border-primary/30 bg-primary/5'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selected.submission.status === 'graded' ? 'bg-tertiary text-white' : 'bg-primary text-white'}`}>
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {statusIcon(selected.submission.status)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-headline-md text-[16px] font-bold text-text-primary capitalize">{selected.submission.status}</span>
                          <span className="font-label-sm text-[12px] text-text-secondary">
                            {new Date(selected.submission.submitted_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {selected.submission.status === 'graded' ? (
                          <>
                            <p className="font-body-sm text-[14px] text-text-secondary mb-3 bg-surface p-3 rounded border border-border-base">
                              {selected.submission.feedback ?? 'No feedback provided.'}
                            </p>
                            <div className="font-label-md text-[14px] font-bold text-tertiary inline-flex items-center gap-1 bg-tertiary/10 px-3 py-1 rounded-lg border border-tertiary/20">
                              <span className="material-symbols-outlined text-[16px]">military_tech</span> Score: {selected.submission.score}/100
                            </div>
                          </>
                        ) : (
                          <p className="font-body-sm text-[14px] text-text-secondary">Your submission is pending review by the instructor.</p>
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
