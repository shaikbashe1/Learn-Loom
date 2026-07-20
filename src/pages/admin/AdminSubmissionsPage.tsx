import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db } from '@/db/firebase';
import { collection, doc, getDocs, getDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  Code, 
  File, 
  ExternalLink,
  Edit,
  ClipboardCheck,
  X
} from 'lucide-react';

interface Submission {
  id: string;
  answer_text: string;
  file_url: string | null;
  status: 'submitted' | 'graded';
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
  assignments: { title: string; max_score: number | null } | null;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Grading Modal State
  const [gradingOpen, setGradingOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'assignment_submissions'), orderBy('submitted_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const subs = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let profiles = null;
        if (data.user_id) {
          const profileDoc = await getDoc(doc(db, 'profiles', data.user_id));
          if (profileDoc.exists()) {
            profiles = profileDoc.data();
          }
        }
        
        let assignments = null;
        if (data.assignment_id) {
          const assignmentDoc = await getDoc(doc(db, 'assignments', data.assignment_id));
          if (assignmentDoc.exists()) {
            assignments = assignmentDoc.data();
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          profiles,
          assignments
        };
      }));
      
      setSubmissions(subs as unknown as Submission[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load submissions');
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const openGradeModal = (sub: Submission) => {
    setSelectedSub(sub);
    setScoreInput(sub.score?.toString() ?? '');
    setFeedbackInput(sub.feedback ?? '');
    setGradingOpen(true);
  };

  const submitGrade = async () => {
    if (!selectedSub) return;
    const numScore = parseInt(scoreInput);
    if (isNaN(numScore)) { toast.error('Invalid score'); return; }

    try {
      await updateDoc(doc(db, 'assignment_submissions', selectedSub.id), {
        status: 'graded',
        score: numScore,
        feedback: feedbackInput,
        graded_at: new Date().toISOString()
      });
      
      toast.success('Grade saved successfully');
      setGradingOpen(false);
      setSubmissions(submissions.map(s => 
        s.id === selectedSub.id 
          ? { ...s, status: 'graded', score: numScore, feedback: feedbackInput } 
          : s
      ));
    } catch (error) {
      console.error(error);
      toast.error('Failed to save grade');
    }
  };

  return (
    <AppLayout title="Assignment Submissions" isAdmin>
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Submissions Queue</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Manage and grade high-performance student contributions across all courses.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={fetchSubmissions} 
               className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all shadow-sm"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             
             <div className="flex items-center justify-center px-4 py-2 bg-card border border-border rounded-xl shadow-sm h-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending</span>
                  <span className="text-xs font-bold text-foreground ml-1">
                    {submissions.filter(s => s.status === 'submitted').length}
                  </span>
                </div>
             </div>
             
             <div className="flex items-center justify-center px-4 py-2 bg-card border border-border rounded-xl shadow-sm h-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Graded</span>
                  <span className="text-xs font-bold text-foreground ml-1">
                    {submissions.filter(s => s.status === 'graded').length}
                  </span>
                </div>
             </div>
          </div>
        </header>

        {/* Quick Stats Bento */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stat 1 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Total Submissions</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Skeleton className="h-9 w-20 bg-muted" /> : submissions.length}
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Graded Today</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? (
                  <Skeleton className="h-9 w-16 bg-muted" />
                ) : (
                  submissions.filter(s => s.status === 'graded' && new Date(s.submitted_at) > new Date(Date.now() - 86400000)).length
                )}
              </div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Throughput</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-primary">+12.5%</div>
            </div>
          </div>
        </section>

        {/* Submissions Table */}
        <section className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
               <FileText className="w-4.5 h-4.5 text-primary" />
               Recent Submissions
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Assignment</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-center">Score</th>
                  <th className="px-6 py-4 text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-12 w-full bg-muted rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                       <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                         <FileText className="w-5 h-5 text-muted-foreground/40" />
                       </div>
                       <p className="text-sm font-bold text-foreground">No submissions found</p>
                    </td>
                  </tr>
                ) : (
                  submissions.map(s => {
                    const studentName = Array.isArray(s.profiles) ? s.profiles[0]?.full_name : s.profiles?.full_name;
                    const assignmentTitle = Array.isArray(s.assignments) ? s.assignments[0]?.title : s.assignments?.title;
                    const maxScore = Array.isArray(s.assignments) ? s.assignments[0]?.max_score : s.assignments?.max_score;

                    return (
                      <tr key={s.id} className={`transition-colors ${s.status === 'submitted' ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-muted/10'}`}>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-foreground block">{studentName ?? 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-muted-foreground">{assignmentTitle ?? 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {s.status === 'graded' ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] border border-emerald-500/20 font-extrabold uppercase tracking-wider inline-block">
                              GRADED
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 text-[9px] border border-amber-500/20 font-extrabold uppercase tracking-wider inline-block">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-bold text-foreground">
                          {s.score !== null ? `${s.score} / ${maxScore ?? 100}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            onClick={() => openGradeModal(s)}
                            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto
                              ${
                                s.status === 'graded' 
                                  ? 'bg-background border border-border text-foreground hover:bg-muted/50' 
                                  : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]'
                              }`}
                          >
                            {s.status === 'graded' ? (
                              <>
                                <Edit className="h-3.5 w-3.5" />
                                <span>Update Grade</span>
                              </>
                            ) : (
                              <>
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                <span>Review & Grade</span>
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Grading Dialog */}
        <Dialog open={gradingOpen} onOpenChange={setGradingOpen}>
          <DialogContent className="bg-card border-border text-foreground rounded-3xl shadow-2xl overflow-hidden p-0 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="bg-card/80 backdrop-blur-md p-6 border-b border-border flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
                  <Code className="text-primary w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-sm">Review Submission</h2>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Submission ID: <span className="font-mono text-foreground">{selectedSub?.id.split('-')[0]}</span></p>
                </div>
              </div>
            </div>

            {selectedSub && (
              <div className="flex flex-col md:flex-row flex-grow min-h-0 overflow-hidden">
                {/* Answer / File Area */}
                <div className="md:w-[60%] bg-muted/20 p-6 md:p-8 overflow-y-auto border-r border-border">
                  <p className="text-primary mb-4 font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Student Answer
                  </p>
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-inner">
                    <pre className="text-foreground whitespace-pre-wrap text-xs leading-relaxed font-mono">{selectedSub.answer_text}</pre>
                  </div>
                  
                  {selectedSub.file_url && (
                    <a 
                      href={selectedSub.file_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="mt-6 flex items-center justify-between p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <File className="w-4.5 h-4.5" />
                         </div>
                         <div>
                            <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors block">View Attached File</span>
                            <span className="text-[10px] text-muted-foreground font-semibold">Click to open in new tab</span>
                         </div>
                      </div>
                      <ExternalLink className="w-4.5 h-4.5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                </div>

                {/* Grading Sidebar */}
                <div className="md:w-[40%] bg-card p-6 md:p-8 flex flex-col overflow-y-auto">
                  <section className="mb-6">
                    <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase mb-4 tracking-wider flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Grading Input
                    </h3>
                    <div>
                      <Label htmlFor="score" className="text-xs font-bold text-foreground block mb-2">Score (0 - {(Array.isArray(selectedSub.assignments) ? selectedSub.assignments[0]?.max_score : selectedSub.assignments?.max_score) ?? 100})</Label>
                      <Input
                        id="score"
                        type="number"
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        className="bg-background border-border text-xs h-11 rounded-xl font-bold focus:ring-primary/20 focus:border-primary shadow-inner"
                        placeholder="Enter score..."
                      />
                    </div>
                  </section>

                  <section className="flex-grow flex flex-col mb-6">
                    <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase mb-4 tracking-wider flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Private Feedback
                    </h3>
                    <Textarea
                      id="feedback"
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="flex-grow min-h-[150px] bg-background border-border rounded-xl p-4 text-xs text-foreground focus:ring-primary/20 outline-none resize-none shadow-inner font-semibold leading-relaxed"
                      placeholder="Add private feedback to student..."
                    />
                  </section>

                  <div className="flex flex-col gap-3 mt-auto shrink-0">
                    <Button 
                      onClick={submitGrade} 
                      className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-primary/10"
                    >
                      {selectedSub.status === 'graded' ? 'Update Grade' : 'Submit Grade'}
                    </Button>
                    <Button 
                      onClick={() => setGradingOpen(false)} 
                      variant="outline"
                      className="w-full h-11 border-border text-foreground hover:bg-muted/50 rounded-xl font-bold text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
