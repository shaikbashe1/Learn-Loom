import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { db, storage } from '@/db/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UploadCloud, 
  GraduationCap, 
  ChevronLeft, 
  Link2, 
  Check, 
  Loader2 
} from 'lucide-react';

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
      try {
        const enrollmentsRef = collection(db, 'user_course_enrollments');
        const enrollmentsQuery = query(enrollmentsRef, where('user_id', '==', user.id));
        const enrollmentsSnap = await getDocs(enrollmentsQuery);
        const courseIds = enrollmentsSnap.docs.map(d => d.data().course_id);

        if (courseIds.length === 0) { setLoading(false); return; }

        const assignmentsList: any[] = [];
        for (let i = 0; i < courseIds.length; i += 10) {
          const chunk = courseIds.slice(i, i + 10);
          const q = query(collection(db, 'assignments'), where('course_id', 'in', chunk));
          const snap = await getDocs(q);
          assignmentsList.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        assignmentsList.sort((a, b) => {
          const tA = new Date(a.created_at || 0).getTime();
          const tB = new Date(b.created_at || 0).getTime();
          return tB - tA;
        });

        const courseTitleMap: Record<string, string> = {};
        await Promise.all(courseIds.map(async cid => {
          try {
            const dSnap = await getDoc(doc(db, 'courses', cid));
            if (dSnap.exists() && dSnap.data().title) {
              courseTitleMap[cid] = dSnap.data().title;
            } else {
              const cSnap = await getDocs(query(collection(db, 'courses'), where('id', '==', cid)));
              if (!cSnap.empty) courseTitleMap[cid] = cSnap.docs[0].data().title;
            }
          } catch(e){}
        }));

        const asgIds = assignmentsList.map(a => a.id);
        const subMap: Record<string, Assignment['submission']> = {};
        if (asgIds.length > 0) {
          for (let i = 0; i < asgIds.length; i += 10) {
            const chunk = asgIds.slice(i, i + 10);
            const q = query(
              collection(db, 'assignment_submissions'), 
              where('user_id', '==', user.id), 
              where('assignment_id', 'in', chunk)
            );
            const snap = await getDocs(q);
            snap.forEach(docSnap => {
              const s = docSnap.data();
              subMap[s.assignment_id] = {
                status: s.status,
                score: s.score,
                feedback: s.feedback,
                submitted_at: s.submitted_at || new Date().toISOString()
              };
            });
          }
        }

        const merged = assignmentsList.map(a => ({
          ...a,
          courses: { title: courseTitleMap[a.course_id] || 'Unknown Course' },
          submission: subMap[a.id]
        })) as Assignment[];

        setAssignments(merged);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selected) return;
    if (!note.trim() && !file) { toast.error('Please add notes or upload a file'); return; }
    setSubmitting(true);

    let answerText = note.trim();

    try {
      if (file) {
        const filePath = `submissions/${user.id}/${selected.id}/${file.name}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        answerText += (answerText ? '\n\n' : '') + `File: ${url}`;
      }

      const subId = `${user.id}_${selected.id}`;
      const subRef = doc(db, 'assignment_submissions', subId);
      await setDoc(subRef, {
        user_id: user.id,
        assignment_id: selected.id,
        answer_text: answerText,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { merge: true });

      toast.success('Assignment submitted!', { description: `${selected.title} has been submitted for review.` });
      
      try {
        await addDoc(collection(db, 'activity_logs'), {
          user_id: user.id,
          action_type: 'assignment',
          value: 1,
          created_at: new Date().toISOString()
        });
      } catch (logErr) {
        // Optional log tracking error
      }

      const updated = { status: 'submitted' as const, score: null, feedback: null, submitted_at: new Date().toISOString() };
      setAssignments(prev => prev.map(a => a.id === selected.id ? { ...a, submission: updated } : a));
      setSelected(prev => prev ? { ...prev, submission: updated } : prev);
      setNote(''); setFile(null);
    } catch (error: any) {
      toast.error('Submission failed', { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status?: string) => {
    if (status === 'submitted') return 'bg-primary/10 text-primary border-primary/20';
    if (status === 'graded') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  const statusLabel = (a: Assignment) => a.submission?.status ?? 'pending';

  return (
    <AppLayout title="Assignments">
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 h-full flex flex-col relative z-10 select-none">
        {!selected ? (
          <div className="space-y-6 h-full pb-8">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Assignments</h1>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                Manage and track your course assignments efficiently.
              </p>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full bg-muted rounded-3xl" />)}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-3xl text-muted-foreground bg-card shadow-sm">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground mb-1">No assignments yet</p>
                <p className="text-xs text-muted-foreground font-semibold">Enroll in a course to see its assignments here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setSelected(a); setNote(''); setFile(null); }}
                    className="text-left p-6 rounded-3xl border border-border hover:border-border/80 transition-all duration-300 group flex flex-col h-full bg-card shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 group-hover:bg-primary group-hover:border-primary transition-colors shadow-sm text-primary group-hover:text-primary-foreground">
                        <Terminal className="w-5 h-5" />
                      </div>
                      
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border flex items-center gap-1 ${statusColor(statusLabel(a))}`}>
                        {statusLabel(a) === 'graded' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : statusLabel(a) === 'submitted' ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        <span>{statusLabel(a)}</span>
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      {a.title}
                    </h3>
                    <p className="text-xs text-muted-foreground flex-grow line-clamp-2 mb-4 leading-relaxed font-semibold">
                      {a.instructions ?? 'No instructions provided.'}
                    </p>
                    
                    <div className="text-[11px] text-muted-foreground flex items-center mt-auto pt-4 border-t border-border w-full font-semibold">
                      <GraduationCap className="w-3.5 h-3.5 mr-1 text-primary" />
                      <span className="truncate max-w-[120px]">{a.courses?.title ?? '—'}</span>
                      
                      <span className="ml-auto text-[9px] uppercase tracking-wider font-extrabold text-destructive bg-destructive/10 px-2 py-0.5 rounded-lg border border-destructive/20 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" /> {a.due_days}d
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 h-full lg:h-[calc(100vh-10rem)]">
            <div className="lg:hidden mb-2">
              <Button 
                onClick={() => setSelected(null)}
                variant="outline"
                className="flex items-center gap-1.5 text-foreground hover:bg-muted/50 transition-all text-xs font-bold rounded-xl border border-border bg-card shadow-sm h-10 px-4"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Assignments
              </Button>
            </div>

            {/* Left Column: Assignment Brief */}
            <section className="lg:w-[60%] flex flex-col h-full lg:overflow-y-auto bg-card rounded-3xl border border-border shadow-sm">
              <div className="p-6 md:p-8 border-b border-border bg-muted/15 sticky top-0 backdrop-blur-md z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <button 
                        onClick={() => setSelected(null)}
                        className="hidden lg:flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all w-8 h-8 rounded-xl border border-border bg-background shadow-sm"
                        title="Back to Assignments"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20 uppercase tracking-wider">
                        {selected.courses?.title}
                      </span>
                      
                      <span className="text-[10px] font-extrabold text-destructive flex items-center gap-1 bg-destructive/10 px-2.5 py-0.5 rounded-lg border border-destructive/20 uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> Due in {selected.due_days}d
                      </span>
                    </div>
                    
                    <h1 className="text-lg md:text-xl font-bold text-foreground text-balance">
                      {selected.title}
                    </h1>
                  </div>
                </div>
              </div>
              
              <div className="p-6 md:p-8 text-xs font-semibold leading-relaxed flex-1 text-muted-foreground whitespace-pre-wrap">
                {selected.instructions ?? 'No instructions provided.'}
              </div>
            </section>

            {/* Right Column: Submission Portal */}
            <section className="lg:w-[40%] flex flex-col gap-6 h-full lg:overflow-y-auto lg:pr-2">
              
              {!selected.submission ? (
                <>
                  {/* Action / Sync Card */}
                  <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm relative overflow-hidden group">
                    <div className="absolute top-[-10%] right-[-10%] w-36 h-36 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                      <Terminal className="text-primary h-5 w-5" />
                      <h3 className="text-xs font-bold text-foreground">Submit via GitHub</h3>
                      <span className="ml-auto px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border text-[9px] font-extrabold uppercase">
                        Coming Soon
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-6 relative z-10 font-semibold leading-normal">
                      Link your repository to automatically run the CI/CD grading pipeline.
                    </p>
                    
                    <div className="space-y-4 relative z-10 opacity-50 pointer-events-none">
                      <div>
                        <label className="block text-[11px] font-bold text-foreground mb-1.5">Repository URL</label>
                        <input 
                          className="w-full bg-background border border-border text-xs rounded-xl py-2.5 px-4 focus:outline-none" 
                          placeholder="https://github.com/username/repo" 
                          type="text" 
                          disabled
                        />
                      </div>
                      
                      <Button className="w-full bg-muted text-muted-foreground text-xs font-bold py-3 rounded-xl flex justify-center items-center gap-2 mt-2" disabled>
                        Run Autograder
                      </Button>
                    </div>
                  </div>

                  {/* Manual Upload Card */}
                  <div className="bg-card rounded-3xl p-6 md:p-8 flex-1 flex flex-col border border-border shadow-sm relative">
                    <h3 className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                      <UploadCloud className="text-primary w-4.5 h-4.5" />
                      Manual Upload
                    </h3>
                    
                    <p className="text-[11px] text-muted-foreground mb-6 font-semibold">
                      Upload a file or provide a link/notes.
                    </p>
                    
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5">
                      <div 
                        className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 group ${
                          file ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                        }`}
                        onClick={() => document.getElementById('file-input')?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                          e.preventDefault();
                          const f = e.dataTransfer.files?.[0];
                          if (f) setFile(f);
                        }}
                      >
                        <input 
                          id="file-input" 
                          type="file" 
                          className="hidden" 
                          onChange={e => setFile(e.target.files?.[0] || null)} 
                        />
                        
                        <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center mb-3 text-muted-foreground/60 group-hover:text-primary transition-colors">
                          {file ? <Check className="w-5 h-5 text-primary" /> : <UploadCloud className="w-5 h-5" />}
                        </div>
                        
                        {file ? (
                          <div>
                            <p className="text-xs font-bold text-foreground truncate max-w-[220px]">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-foreground">Click to upload or drag & drop</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Any zip, pdf, or code file (Max 10MB)</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-foreground">Submission Notes / Link</label>
                        <textarea 
                          className="w-full bg-background border border-border text-xs rounded-2xl p-4 min-h-[100px] resize-none focus:ring-primary/20 focus:border-primary shadow-inner font-semibold leading-relaxed" 
                          placeholder="Provide git repository links, hosted preview URLs, or any notes for the instructor..."
                          value={note}
                          onChange={e => setNote(e.target.value)}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={submitting} 
                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.99] transition-all text-xs flex items-center justify-center gap-2 min-h-[44px]"
                      >
                        {submitting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span>Submitting...</span></>
                        ) : (
                          'Submit Assignment'
                        )}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                /* Submission Status View */
                <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-2.5 border-b border-border pb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">Submission Received</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                        Submitted {new Date(selected.submission.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/25 rounded-2xl border border-border">
                      <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-2">
                        Grading Status
                      </span>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${
                          selected.submission.status === 'graded' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {selected.submission.status}
                        </span>
                        
                        {selected.submission.score !== null && (
                          <div className="text-sm font-extrabold text-foreground">
                            Score: <span className="text-primary">{selected.submission.score}</span>/100
                          </div>
                        )}
                      </div>
                    </div>

                    {selected.submission.feedback && (
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/15">
                        <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider block mb-2">
                          Instructor Feedback
                        </span>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                          {selected.submission.feedback}
                        </p>
                      </div>
                    )}
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
export { AssignmentPage };
