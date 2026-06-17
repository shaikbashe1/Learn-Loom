import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { RefreshCw, FileText, CheckCircle, TrendingUp, Code, File, ExternalLink } from 'lucide-react';

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
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        id, answer_text, file_url, status, score, feedback, submitted_at,
        profiles!assignment_submissions_user_id_fkey(full_name, email),
        assignments!assignment_submissions_assignment_id_fkey(title, max_score)
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      toast.error('Failed to load submissions');
    } else {
      setSubmissions((data as any[]) ?? []);
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

    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        status: 'graded',
        score: numScore,
        feedback: feedbackInput,
        graded_at: new Date().toISOString()
      })
      .eq('id', selectedSub.id);

    if (error) {
      toast.error('Failed to save grade');
    } else {
      toast.success('Grade saved successfully');
      setGradingOpen(false);
      setSubmissions(submissions.map(s => 
        s.id === selectedSub.id 
          ? { ...s, status: 'graded', score: numScore, feedback: feedbackInput } 
          : s
      ));
    }
  };

  return (
    <AppLayout title="Assignment Submissions" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Submissions Queue</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Manage and grade high-performance student contributions across all courses.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={fetchSubmissions} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Pending</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{submissions.filter(s => s.status === 'submitted').length}</span>
               </div>
             </div>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Graded</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{submissions.filter(s => s.status === 'graded').length}</span>
               </div>
             </div>
          </div>
        </header>

        {/* Quick Stats Bento */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Total Submissions</span>
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-inner">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">{loading ? <Skeleton className="h-10 w-20 bg-surface-container" /> : submissions.length}</div>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Graded Today</span>
              <div className="p-2.5 bg-tertiary/10 rounded-xl text-tertiary border border-tertiary/20 shadow-inner">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-text-primary">
                {loading ? <Skeleton className="h-10 w-16 bg-surface-container" /> : submissions.filter(s => s.status === 'graded' && new Date(s.submitted_at) > new Date(Date.now() - 86400000)).length}
              </div>
            </div>
          </div>

          <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm card-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-widest">Throughput</span>
              <div className="p-2.5 bg-secondary/10 rounded-xl text-secondary border border-secondary/20 shadow-inner">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-headline-lg text-[36px] font-bold text-secondary">+12.5%</div>
            </div>
          </div>
        </section>

        {/* Submissions Table */}
        <section className="glass-panel border border-border-base rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 md:px-8 py-5 border-b border-border-base flex justify-between items-center bg-surface/50">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
               <FileText className="w-5 h-5 text-primary" />
               Recent Submissions
            </h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container/50 border-b border-border-base">
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Assignment</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-center">Score</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-12 w-full bg-surface-container rounded-lg" /></td></tr>
                  ))
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                       <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                         <FileText className="w-6 h-6 text-text-secondary" />
                       </div>
                       <p className="font-headline-md text-[18px] font-bold text-text-primary">No submissions found</p>
                    </td>
                  </tr>
                ) : (
                  submissions.map(s => {
                    const studentName = Array.isArray(s.profiles) ? s.profiles[0]?.full_name : s.profiles?.full_name;
                    const assignmentTitle = Array.isArray(s.assignments) ? s.assignments[0]?.title : s.assignments?.title;
                    const maxScore = Array.isArray(s.assignments) ? s.assignments[0]?.max_score : s.assignments?.max_score;

                    return (
                      <tr key={s.id} className={`transition-colors group ${s.status === 'submitted' ? 'bg-warning/5 hover:bg-warning/10' : 'hover:bg-surface-container/50'}`}>
                        <td className="px-6 py-4">
                          <span className="font-body-md text-[15px] font-bold text-text-primary block">{studentName ?? 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-medium text-text-secondary">{assignmentTitle ?? 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {s.status === 'graded' ? (
                            <span className="px-3 py-1 rounded-md bg-success/10 text-success text-[11px] border border-success/20 font-bold uppercase tracking-wider inline-block">GRADED</span>
                          ) : (
                            <span className="px-3 py-1 rounded-md bg-warning/10 text-warning text-[11px] border border-warning/20 font-bold uppercase tracking-wider inline-block">PENDING</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-label-md text-[15px] font-bold text-text-primary">
                          {s.score !== null ? `${s.score} / ${maxScore ?? 100}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => openGradeModal(s)}
                            className={`flex items-center gap-2 px-4 py-2 ml-auto rounded-xl text-[13px] font-bold transition-all shadow-sm ${
                              s.status === 'graded' 
                                ? 'bg-surface border border-border-base text-text-primary hover:bg-surface-container hover:text-primary' 
                                : 'bg-primary border border-primary text-white hover:bg-primary-container hover:text-on-primary-container'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {s.status === 'graded' ? 'edit' : 'grading'}
                            </span>
                            {s.status === 'graded' ? 'Update Grade' : 'Review & Grade'}
                          </button>
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
          <DialogContent className="bg-surface border-border-base text-text-primary rounded-2xl shadow-2xl overflow-hidden p-0 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="bg-surface/80 backdrop-blur-md p-6 border-b border-border-base flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                  <Code className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-text-primary font-headline-md text-[20px]">Review Submission</h2>
                  <p className="text-[13px] font-medium text-text-secondary mt-1">Submission ID: <span className="font-mono">{selectedSub?.id.split('-')[0]}</span></p>
                </div>
              </div>
            </div>

            {selectedSub && (
              <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                {/* Answer / File Area */}
                <div className="md:w-[60%] bg-surface-container/30 p-6 md:p-8 overflow-y-auto custom-scrollbar border-r border-border-base">
                  <p className="text-primary mb-4 font-bold uppercase tracking-widest text-[11px] flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Student Answer
                  </p>
                  <div className="bg-surface border border-border-base rounded-xl p-5 shadow-sm">
                    <pre className="text-text-primary whitespace-pre-wrap font-body-md text-[14px] leading-relaxed font-mono">{selectedSub.answer_text}</pre>
                  </div>
                  
                  {selectedSub.file_url && (
                    <a href={selectedSub.file_url} target="_blank" rel="noreferrer" className="mt-6 flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <File className="w-5 h-5" />
                         </div>
                         <div>
                            <span className="font-bold text-[14px] text-text-primary group-hover:text-primary transition-colors block">View Attached File</span>
                            <span className="text-[12px] text-text-secondary">Click to open in new tab</span>
                         </div>
                      </div>
                      <ExternalLink className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                </div>

                {/* Grading Sidebar */}
                <div className="md:w-[40%] bg-surface p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
                  <section className="mb-8">
                    <h3 className="text-[11px] font-bold text-text-secondary uppercase mb-4 tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Grading Input
                    </h3>
                    <div>
                      <Label htmlFor="score" className="text-[13px] font-bold text-text-primary block mb-2">Score (0 - {(Array.isArray(selectedSub.assignments) ? selectedSub.assignments[0]?.max_score : selectedSub.assignments?.max_score) ?? 100})</Label>
                      <Input
                        id="score"
                        type="number"
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        className="bg-surface-container border-border-base text-text-primary h-12 text-[16px] font-bold focus:ring-2 focus:ring-primary shadow-inner"
                        placeholder="Enter score..."
                      />
                    </div>
                  </section>

                  <section className="flex-1 flex flex-col mb-8">
                    <h3 className="text-[11px] font-bold text-text-secondary uppercase mb-4 tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Private Feedback
                    </h3>
                    <Textarea
                      id="feedback"
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="flex-1 min-h-[150px] bg-surface-container border-border-base rounded-xl p-4 text-[14px] text-text-primary focus:ring-2 focus:ring-primary outline-none resize-none shadow-inner"
                      placeholder="Add private feedback to student..."
                    />
                  </section>

                  <div className="flex flex-col gap-3 mt-auto shrink-0">
                    <button onClick={submitGrade} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[14px] hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm">
                      {selectedSub.status === 'graded' ? 'Update Grade' : 'Submit Grade'}
                    </button>
                    <button onClick={() => setGradingOpen(false)} className="w-full h-12 bg-surface text-text-primary border border-border-base rounded-xl font-bold text-[14px] hover:bg-surface-container transition-all shadow-sm">
                      Cancel
                    </button>
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
