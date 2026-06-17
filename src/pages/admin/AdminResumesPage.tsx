import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Loader2, Sparkles, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Resume Management</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Monitor uploaded resumes, track AI analysis status, and review automated feedback.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={fetchResumes} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-success"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Analyzed</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{resumes.filter(r => r.status === 'completed').length}</span>
               </div>
             </div>
             <div className="flex flex-col justify-center px-5 py-2 bg-surface border border-border-base rounded-xl shadow-sm h-11">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                 <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Pending</span>
                 <span className="text-[14px] font-bold text-text-primary ml-1">{resumes.filter(r => r.status === 'pending').length}</span>
               </div>
             </div>
          </div>
        </section>

        {/* Resumes Table Area */}
        <section className="glass-panel border border-border-base rounded-2xl shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="p-6 md:px-8 py-5 border-b border-border-base flex justify-between items-center bg-surface/50">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
               <FileText className="w-5 h-5 text-primary" />
               Student Resumes
            </h3>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-container/50 border-b border-border-base">
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider w-[25%]">Candidate</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider w-[30%]">Resume File</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Uploaded</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-label-sm text-[12px] text-text-secondary font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4"><Skeleton className="h-12 w-full bg-surface-container rounded-lg" /></td>
                    </tr>
                  ))
                ) : resumes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                       <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                         <FileText className="w-6 h-6 text-text-secondary" />
                       </div>
                       <p className="font-headline-md text-[18px] font-bold text-text-primary">No resumes uploaded yet</p>
                    </td>
                  </tr>
                ) : (
                  resumes.map((resume) => (
                    <tr key={resume.id} className="hover:bg-surface-container/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-body-md text-[15px] font-bold text-text-primary group-hover:text-primary transition-colors">{resume.user?.full_name || 'Unknown User'}</p>
                        <p className="text-[12px] text-text-secondary font-medium">{resume.user?.email || 'No email'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-primary hover:text-primary-container transition-colors cursor-pointer w-fit p-2 -ml-2 rounded-lg hover:bg-primary/5" onClick={() => window.open(resume.file_url, '_blank')}>
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                             <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-[14px] font-bold truncate max-w-[200px]">{resume.file_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-text-secondary">
                        {new Date(resume.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {resume.status === 'completed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-success/10 border border-success/20 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Analyzed ({resume.analysis?.score}/100)</span>}
                        {resume.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-warning/10 border border-warning/20 text-warning"><AlertCircle className="w-3.5 h-3.5" /> Pending AI</span>}
                        {resume.status === 'analyzing' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {resume.status === 'pending' && (
                            <button onClick={() => triggerAnalysis(resume.id)} disabled={analyzingId === resume.id} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/30 font-bold text-[13px] rounded-xl transition-all shadow-sm disabled:opacity-50">
                              {analyzingId === resume.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Analyze
                            </button>
                          )}
                          {resume.status === 'completed' && (
                            <button onClick={() => openDetails(resume)} className="px-4 py-2 bg-surface text-text-primary border border-border-base hover:bg-surface-container font-bold text-[13px] rounded-xl transition-all shadow-sm">
                               View Report
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border-base text-text-primary rounded-2xl shadow-2xl overflow-hidden p-0 max-w-2xl">
          <DialogHeader className="p-6 md:p-8 border-b border-border-base bg-surface-container/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                 <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-headline-md text-[20px] font-bold text-text-primary">AI Resume Analysis</DialogTitle>
                <DialogDescription className="text-text-secondary text-[13px] mt-1">Detailed breakdown of the candidate's ATS performance</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedResume?.analysis && (
            <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between p-5 bg-surface-container rounded-xl border border-border-base shadow-sm">
                <div>
                  <p className="text-[12px] font-bold text-text-secondary uppercase tracking-widest mb-1">Candidate</p>
                  <p className="font-bold text-[16px] text-text-primary">{selectedResume.user?.full_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-bold text-text-secondary uppercase tracking-widest mb-1">ATS Score</p>
                  <p className={`font-bold text-[28px] leading-none ${selectedResume.analysis.score >= 80 ? 'text-success' : selectedResume.analysis.score >= 60 ? 'text-warning' : 'text-error'}`}>
                    {selectedResume.analysis.score}<span className="text-[16px] text-text-secondary">/100</span>
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-success/5 border border-success/20 rounded-xl p-5 shadow-sm">
                  <h4 className="font-bold text-[14px] text-success mb-3 flex items-center gap-2 uppercase tracking-wider"><CheckCircle2 className="w-4 h-4" /> Strengths</h4>
                  <ul className="space-y-2">
                    {selectedResume.analysis.strengths.map((s, i) => (
                       <li key={i} className="text-[13px] text-text-primary flex items-start gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 mt-1.5"></span>
                         <span>{s}</span>
                       </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-error/5 border border-error/20 rounded-xl p-5 shadow-sm">
                  <h4 className="font-bold text-[14px] text-error mb-3 flex items-center gap-2 uppercase tracking-wider"><AlertCircle className="w-4 h-4" /> Weaknesses</h4>
                  <ul className="space-y-2">
                    {selectedResume.analysis.weaknesses.map((w, i) => (
                       <li key={i} className="text-[13px] text-text-primary flex items-start gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0 mt-1.5"></span>
                         <span>{w}</span>
                       </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-[14px] text-primary mb-3 flex items-center gap-2 uppercase tracking-wider"><Sparkles className="w-4 h-4" /> Suggestions for Improvement</h4>
                <ul className="space-y-2">
                  {selectedResume.analysis.suggestions.map((s, i) => (
                     <li key={i} className="text-[13px] text-text-primary flex items-start gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5"></span>
                       <span>{s}</span>
                     </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 border-t border-border-base flex justify-end">
                <button className="flex items-center justify-center gap-2 px-6 h-11 bg-surface border border-border-base hover:bg-surface-container font-bold text-[14px] text-text-primary rounded-xl transition-all shadow-sm w-full md:w-auto" onClick={() => window.open(selectedResume.file_url, '_blank')}>
                  <Download className="w-4 h-4" /> Download Original Resume
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
