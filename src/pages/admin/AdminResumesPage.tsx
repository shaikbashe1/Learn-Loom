import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Resume {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
  user?: { full_name: string; email: string };
  analysis?: ResumeAnalysis;
}

interface ResumeAnalysis {
  id: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  created_at: string;
}

export default function AdminResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Dialog State
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchResumes = async () => {
    setLoading(true);
    const { data: resData, error: resError } = await supabase
      .from('resumes')
      .select('*, resume_analysis(*)')
      .order('created_at', { ascending: false });

    if (resError) {
      toast.error('Failed to load resumes');
    } else {
      // Fetch user data
      const userIds = Array.from(new Set(resData.map(r => r.user_id)));
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
        const usersMap = new Map((usersData || []).map(u => [u.id, u]));
        const formatted = resData.map(r => ({
          ...r,
          user: usersMap.get(r.user_id),
          analysis: r.resume_analysis?.[0]
        }));
        setResumes(formatted as Resume[]);
      } else {
        setResumes(resData as Resume[]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const triggerAnalysis = async (id: string) => {
    setAnalyzingId(id);
    
    // Set status to analyzing
    await supabase.from('resumes').update({ status: 'analyzing' }).eq('id', id);
    setResumes(prev => prev.map(r => r.id === id ? { ...r, status: 'analyzing' } : r));

    // Simulate AI Analysis process (would normally call an Edge Function)
    setTimeout(async () => {
      const mockAnalysis = {
        resume_id: id,
        score: Math.floor(Math.random() * 30) + 60, // 60-90 score
        strengths: ['Clear formatting', 'Good use of action verbs'],
        weaknesses: ['Lacks quantifiable achievements', 'Missing GitHub link'],
        suggestions: ['Add metrics to experience section', 'Include personal projects']
      };

      const { data: analysisData } = await supabase.from('resume_analysis').insert(mockAnalysis).select().single();
      await supabase.from('resumes').update({ status: 'completed' }).eq('id', id);
      
      toast.success('Analysis complete');
      setResumes(prev => prev.map(r => r.id === id ? { ...r, status: 'completed', analysis: analysisData as ResumeAnalysis } : r));
      setAnalyzingId(null);
    }, 3000);
  };

  const openDetails = (resume: Resume) => {
    setSelectedResume(resume);
    setDialogOpen(true);
  };

  return (
    <AppLayout title="Resume Management" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Resume Management</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Monitor uploaded resumes, track AI analysis status, and review automated feedback provided to users.</p>
          </div>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="p-lg border-b border-outline-variant/60 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-headline-md text-on-surface">Student Resumes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-highest/50">
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60">Candidate</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60">Resume File</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60">Uploaded</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60">Status</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-lg py-md"><Skeleton className="h-16 w-full rounded-lg" /></td>
                    </tr>
                  ))
                ) : resumes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-lg py-16 text-center text-on-surface-variant">No resumes uploaded yet.</td>
                  </tr>
                ) : (
                  resumes.map((resume) => (
                    <tr key={resume.id} className="hover:bg-surface-variant/20 transition-colors">
                      <td className="px-lg py-lg">
                        <p className="font-medium text-on-surface">{resume.user?.full_name || 'Unknown User'}</p>
                        <p className="text-sm text-on-surface-variant">{resume.user?.email || 'No email'}</p>
                      </td>
                      <td className="px-lg py-lg">
                        <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer" onClick={() => window.open(resume.file_url, '_blank')}>
                          <FileText className="w-4 h-4" />
                          <span className="text-sm font-medium">{resume.file_name}</span>
                        </div>
                      </td>
                      <td className="px-lg py-lg text-sm text-on-surface-variant">
                        {new Date(resume.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-lg py-lg">
                        {resume.status === 'completed' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-success/10 text-success"><CheckCircle2 className="w-3 h-3 mr-1" /> Analyzed ({resume.analysis?.score}/100)</span>}
                        {resume.status === 'pending' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-warning/10 text-warning"><AlertCircle className="w-3 h-3 mr-1" /> Pending AI</span>}
                        {resume.status === 'analyzing' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</span>}
                      </td>
                      <td className="px-lg py-lg text-right">
                        <div className="flex items-center justify-end gap-2">
                          {resume.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => triggerAnalysis(resume.id)} disabled={analyzingId === resume.id} className="text-primary border-primary/30 hover:bg-primary/10">
                              {analyzingId === resume.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Analyze
                            </Button>
                          )}
                          {resume.status === 'completed' && (
                            <Button size="sm" variant="ghost" onClick={() => openDetails(resume)} className="text-on-surface-variant">View Report</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant max-w-2xl">
          <DialogHeader><DialogTitle className="text-on-surface font-display text-headline-sm">AI Resume Analysis</DialogTitle></DialogHeader>
          {selectedResume?.analysis && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/40">
                <div>
                  <p className="text-sm text-on-surface-variant">Candidate</p>
                  <p className="font-medium text-on-surface">{selectedResume.user?.full_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-on-surface-variant">ATS Score</p>
                  <p className={`font-bold text-xl ${selectedResume.analysis.score >= 80 ? 'text-success' : selectedResume.analysis.score >= 60 ? 'text-warning' : 'text-error'}`}>
                    {selectedResume.analysis.score}/100
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-on-surface mb-2 text-success flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Strengths</h4>
                <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1 pl-2">
                  {selectedResume.analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-on-surface mb-2 text-error flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Weaknesses</h4>
                <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1 pl-2">
                  {selectedResume.analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-on-surface mb-2 text-primary flex items-center gap-2"><Sparkles className="w-4 h-4" /> Suggestions for Improvement</h4>
                <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1 pl-2">
                  {selectedResume.analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div className="pt-4 border-t border-outline-variant/40">
                <Button className="w-full" variant="outline" onClick={() => window.open(selectedResume.file_url, '_blank')}>
                  <Download className="w-4 h-4 mr-2" /> Download Original Resume
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
