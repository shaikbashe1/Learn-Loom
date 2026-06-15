import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { FileText, CheckCircle, RefreshCw } from 'lucide-react';

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
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-2xl">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Submissions Queue</h1>
            <p className="text-on-surface-variant font-body-md mt-2 max-w-2xl">Manage and grade high-performance student contributions across all courses.</p>
          </div>
          <div className="flex gap-sm">
            <Button variant="ghost" size="sm" onClick={fetchSubmissions} className="border border-outline-variant text-on-surface hover:bg-surface-variant h-11 w-11 rounded-xl">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="bg-surface-container-high px-4 py-2 rounded-xl border border-outline-variant flex items-center gap-2 h-11">
              <span className="text-primary font-bold">{submissions.filter(s => s.status === 'submitted').length}</span>
              <span className="text-label-sm text-outline">Pending</span>
            </div>
            <div className="bg-surface-container-high px-4 py-2 rounded-xl border border-outline-variant flex items-center gap-2 h-11">
              <span className="text-tertiary font-bold">{submissions.filter(s => s.status === 'graded').length}</span>
              <span className="text-label-sm text-outline">Graded</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-2xl">
          <div className="glass-panel p-lg rounded-2xl flex items-center gap-md h-32 hover:border-primary transition-all group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[32px]">assignment</span>
            </div>
            <div>
              <p className="text-label-sm text-outline">Total Submissions</p>
              <p className="text-headline-md font-bold text-on-surface">{loading ? '—' : submissions.length}</p>
            </div>
          </div>
          <div className="glass-panel p-lg rounded-2xl flex items-center gap-md h-32 hover:border-tertiary transition-all group">
            <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <div>
              <p className="text-label-sm text-outline">Graded Today</p>
              <p className="text-headline-md font-bold text-on-surface">
                {loading ? '—' : submissions.filter(s => s.status === 'graded' && new Date(s.submitted_at) > new Date(Date.now() - 86400000)).length}
              </p>
            </div>
          </div>
          <div className="glass-panel p-lg rounded-2xl flex items-center gap-md h-32 hover:border-secondary transition-all overflow-hidden relative group">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary relative z-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[32px]">trending_up</span>
            </div>
            <div className="relative z-10">
              <p className="text-label-sm text-outline">Throughput</p>
              <p className="text-headline-md font-bold text-secondary">+12.5%</p>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="p-lg border-b border-outline-variant/60 flex items-center bg-surface-container-low/40">
            <h3 className="font-headline-md text-on-surface">Recent Submissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container-high/30">
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Student</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Assignment</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-center">Status</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-center">Score</th>
                  <th className="px-lg py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-lg py-4"><Skeleton className="h-10 w-full bg-surface-container" /></td></tr>
                  ))
                ) : submissions.length === 0 ? (
                  <tr><td colSpan={5} className="px-lg py-16 text-center text-sm text-on-surface-variant">No submissions found</td></tr>
                ) : (
                  submissions.map(s => {
                    const studentName = Array.isArray(s.profiles) ? s.profiles[0]?.full_name : s.profiles?.full_name;
                    const assignmentTitle = Array.isArray(s.assignments) ? s.assignments[0]?.title : s.assignments?.title;
                    const maxScore = Array.isArray(s.assignments) ? s.assignments[0]?.max_score : s.assignments?.max_score;

                    return (
                      <tr key={s.id} className="hover:bg-surface-variant/20 transition-colors group">
                        <td className="px-lg py-4 font-body-md font-semibold text-on-surface">{studentName ?? 'Unknown'}</td>
                        <td className="px-lg py-4 text-on-surface-variant">{assignmentTitle ?? 'Unknown'}</td>
                        <td className="px-lg py-4 text-center">
                          {s.status === 'graded' ? (
                            <span className="px-3 py-1 rounded-full bg-success/10 text-success text-label-sm border border-success/30 font-bold">GRADED</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-label-sm border border-warning/30 font-bold">PENDING</span>
                          )}
                        </td>
                        <td className="px-lg py-4 text-center font-label-md text-on-surface">
                          {s.score !== null ? `${s.score} / ${maxScore ?? 100}` : '—'}
                        </td>
                        <td className="px-lg py-4 text-right">
                          <button 
                            onClick={() => openGradeModal(s)}
                            className={`flex items-center gap-2 px-4 py-2 ml-auto rounded-lg text-label-md transition-all ${
                              s.status === 'graded' 
                                ? 'bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-variant' 
                                : 'bg-primary text-on-primary font-bold hover:opacity-90 shadow-[0_0_8px_rgba(192,193,255,0.3)]'
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
        </div>

        {/* Grading Dialog (Restyled to match design system) */}
        <Dialog open={gradingOpen} onOpenChange={setGradingOpen}>
          <DialogContent className="bg-surface-container border-outline-variant text-on-surface sm:max-w-[800px] p-0 overflow-hidden">
            <div className="bg-surface-container-high p-4 flex items-center justify-between border-b border-outline-variant">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">code</span>
                </div>
                <div>
                  <h2 className="font-bold text-on-surface font-display text-headline-md">Review Submission</h2>
                  <p className="text-label-sm text-outline">Submission ID: {selectedSub?.id.split('-')[0]}</p>
                </div>
              </div>
            </div>

            {selectedSub && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-0 max-h-[70vh] overflow-hidden">
                {/* Answer / File Area */}
                <div className="md:col-span-3 bg-surface-container-lowest p-6 font-label-md text-label-md overflow-y-auto max-h-[70vh]">
                  <p className="text-primary mb-2 font-bold uppercase tracking-wider text-xs">Student Answer</p>
                  <pre className="text-on-surface-variant whitespace-pre-wrap font-body-md leading-relaxed">{selectedSub.answer_text}</pre>
                  
                  {selectedSub.file_url && (
                    <a href={selectedSub.file_url} target="_blank" rel="noreferrer" className="mt-8 flex items-center gap-2 p-4 rounded-xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors w-fit">
                      <span className="material-symbols-outlined">description</span>
                      <span className="font-bold">View Attached File</span>
                      <span className="material-symbols-outlined text-[16px] ml-2">open_in_new</span>
                    </a>
                  )}
                </div>

                {/* Grading Sidebar */}
                <div className="md:col-span-2 bg-surface-container border-l border-outline-variant p-6 flex flex-col gap-lg overflow-y-auto">
                  <section>
                    <h3 className="text-label-md font-bold text-outline uppercase mb-4 tracking-tighter">Grading</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="score" className="text-label-sm text-on-surface-variant block mb-2">Score (0 - {(Array.isArray(selectedSub.assignments) ? selectedSub.assignments[0]?.max_score : selectedSub.assignments?.max_score) ?? 100})</Label>
                        <Input
                          id="score"
                          type="number"
                          value={scoreInput}
                          onChange={(e) => setScoreInput(e.target.value)}
                          className="bg-surface-container-lowest border-outline-variant text-on-surface font-label-md focus:border-primary"
                          placeholder="Enter score..."
                        />
                      </div>
                    </div>
                  </section>

                  <section className="flex-1 flex flex-col">
                    <h3 className="text-label-md font-bold text-outline uppercase mb-4 tracking-tighter">Feedback</h3>
                    <Textarea
                      id="feedback"
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="flex-1 min-h-[150px] bg-surface-container-lowest border-outline-variant rounded-xl p-3 text-body-md text-on-surface focus:border-primary outline-none resize-none mb-3 transition-all"
                      placeholder="Add private feedback to student..."
                    />
                  </section>

                  <div className="space-y-3 mt-auto pt-4">
                    <button onClick={submitGrade} className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)]">
                      {selectedSub.status === 'graded' ? 'Update Grade' : 'Submit Grade'}
                    </button>
                    <button onClick={() => setGradingOpen(false)} className="w-full py-3 bg-surface-container-high text-on-surface border border-outline-variant rounded-xl font-bold hover:bg-surface-variant transition-all">
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
