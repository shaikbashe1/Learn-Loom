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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Submissions Review</h2>
          <Button variant="ghost" size="sm" onClick={fetchSubmissions} className="border border-border">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Student</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Assignment</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Score</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-10 w-full bg-muted" /></td></tr>
                    ))
                  ) : submissions.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No submissions found</td></tr>
                  ) : (
                    submissions.map(s => {
                      const studentName = Array.isArray(s.profiles) ? s.profiles[0]?.full_name : s.profiles?.full_name;
                      const assignmentTitle = Array.isArray(s.assignments) ? s.assignments[0]?.title : s.assignments?.title;
                      const maxScore = Array.isArray(s.assignments) ? s.assignments[0]?.max_score : s.assignments?.max_score;

                      return (
                        <tr key={s.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{studentName ?? 'Unknown'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{assignmentTitle ?? 'Unknown'}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={s.status === 'graded' ? 'default' : 'outline'} className={s.status === 'graded' ? 'bg-green-500/10 text-green-600 border-0' : 'text-amber-500'}>
                              {s.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">
                            {s.score !== null ? `${s.score} / ${maxScore ?? 100}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant={s.status === 'graded' ? 'ghost' : 'default'} onClick={() => openGradeModal(s)}>
                              {s.status === 'graded' ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> : <FileText className="w-4 h-4 mr-2" />}
                              {s.status === 'graded' ? 'Update Grade' : 'Review & Grade'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={gradingOpen} onOpenChange={setGradingOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Review Submission</DialogTitle>
            </DialogHeader>
            {selectedSub && (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-md bg-muted/30 border border-border text-sm">
                  <p className="font-semibold mb-2 text-foreground">Student Answer:</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{selectedSub.answer_text}</p>
                  {selectedSub.file_url && (
                    <a href={selectedSub.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline block mt-4 font-medium">
                      View Attached File →
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="score" className="text-right">Score</Label>
                  <Input
                    id="score"
                    type="number"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter score (0-100)"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="feedback" className="text-right mt-2">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="col-span-3 min-h-[100px]"
                    placeholder="Provide constructive feedback to the student..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setGradingOpen(false)}>Cancel</Button>
              <Button onClick={submitGrade}>Save Grade</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
