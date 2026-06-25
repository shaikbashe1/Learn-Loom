import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Plus, Trash2, Edit2, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DBGrandTestQuestion } from '@/types/types';

export default function AdminGrandTestPage() {
  const [questions, setQuestions] = useState<DBGrandTestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_idx: 0,
    explanation: '',
    sort_order: 0
  });

  const fetchQuestions = async () => {
    setLoading(true);
    // Fetch global grand test questions (course_id is null)
    const { data, error } = await supabase
      .from('grand_test_questions')
      .select('*')
      .is('course_id', null)
      .order('sort_order', { ascending: true });

    if (error) {
      toast.error('Failed to load grand test questions');
    } else {
      setQuestions(data as DBGrandTestQuestion[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ question: '', options: ['', '', '', ''], correct_idx: 0, explanation: '', sort_order: questions.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (q: DBGrandTestQuestion) => {
    setEditingId(q.id);
    let opts = ['', '', '', ''];
    if (Array.isArray(q.options)) {
      opts = [...q.options, '', '', '', ''].slice(0, 4) as string[];
    } else if (typeof q.options === 'string') {
      try { opts = [...JSON.parse(q.options), '', '', '', ''].slice(0, 4); } catch {}
    }
    setForm({
      question: q.question,
      options: opts,
      correct_idx: q.correct_idx,
      explanation: q.explanation || '',
      sort_order: q.sort_order
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim() || form.options.some(o => !o.trim())) {
      toast.error('Please fill in all question fields and options');
      return;
    }

    setSaving(true);
    const payload = {
      course_id: null,
      question: form.question,
      options: JSON.stringify(form.options),
      correct_idx: form.correct_idx,
      explanation: form.explanation || null,
      sort_order: form.sort_order
    };

    if (editingId) {
      const { error } = await supabase.from('grand_test_questions').update(payload).eq('id', editingId);
      if (error) toast.error('Update failed');
      else { toast.success('Question updated'); setDialogOpen(false); fetchQuestions(); }
    } else {
      const { error } = await supabase.from('grand_test_questions').insert(payload);
      if (error) toast.error('Creation failed');
      else { toast.success('Question added'); setDialogOpen(false); fetchQuestions(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    const { error } = await supabase.from('grand_test_questions').delete().eq('id', id);
    if (error) toast.error('Failed to delete question');
    else { toast.success('Question deleted'); fetchQuestions(); }
  };

  return (
    <AppLayout title="Grand Test Moderation" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full max-w-5xl">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Grand Test Moderation</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Manage the global pool of atomic questions used for the platform-wide Grand Test assessments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={fetchQuestions} className="flex items-center justify-center w-11 h-11 rounded-xl border border-border-base bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all card-lift shadow-sm">
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-label-md text-[14px] font-bold shadow-sm transition-all card-lift">
              <Plus className="w-5 h-5" /> Add Question
            </button>
          </div>
        </section>

        {/* Questions Pool */}
        <section className="glass-panel border border-border-base rounded-2xl shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="p-6 md:px-8 py-5 border-b border-border-base flex items-center justify-between bg-surface/50">
            <h2 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Global Question Pool
            </h2>
            <span className="px-3 py-1 rounded-md text-[12px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shadow-sm">{questions.length} Questions</span>
          </div>
          
          <div className="divide-y divide-border-base">
            {loading ? (
              <div className="p-6 md:p-8 space-y-4">
                <Skeleton className="h-24 w-full rounded-xl bg-surface-container" />
                <Skeleton className="h-24 w-full rounded-xl bg-surface-container" />
                <Skeleton className="h-24 w-full rounded-xl bg-surface-container" />
              </div>
            ) : questions.length === 0 ? (
              <div className="p-16 text-center glass-panel">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                  <ShieldCheck className="w-6 h-6 text-text-secondary" />
                </div>
                <p className="font-headline-md text-[18px] font-bold text-text-primary">No questions in the pool</p>
                <p className="text-[14px] text-text-secondary mt-1">Click the button above to add your first question.</p>
              </div>
            ) : (
              questions.map((q, i) => {
                let opts: string[] = [];
                try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch {}
                
                return (
                  <div key={q.id} className="p-6 md:p-8 hover:bg-surface-container/30 transition-colors group">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                      <div className="space-y-4 flex-1 w-full">
                        <div className="flex items-start gap-4">
                          <span className="w-8 h-8 shrink-0 rounded-lg bg-surface border border-border-base flex items-center justify-center text-[13px] font-bold text-text-secondary shadow-sm">
                            {q.sort_order || i + 1}
                          </span>
                          <p className="font-body-md text-[15px] font-bold text-text-primary leading-relaxed pt-1">{q.question}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                          {opts.map((opt, oi) => (
                            <div key={oi} className={`px-4 py-3 rounded-xl border text-[13px] flex items-start gap-3 shadow-sm ${oi === q.correct_idx ? 'bg-success/10 border-success/30 text-success font-bold' : 'bg-surface-container border-border-base text-text-secondary font-medium'}`}>
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${oi === q.correct_idx ? 'border-success' : 'border-text-secondary/30'}`}>
                                {oi === q.correct_idx && <span className="w-2 h-2 rounded-full bg-success" />}
                              </span>
                              <span className="leading-relaxed">{opt}</span>
                            </div>
                          ))}
                        </div>
                        
                        {q.explanation && (
                          <div className="pl-12 mt-4">
                            <div className="p-4 rounded-xl border border-border-base bg-surface shadow-inner">
                              <p className="text-[13px] text-text-secondary leading-relaxed">
                                <span className="font-bold text-text-primary uppercase tracking-widest text-[11px] block mb-1">Explanation</span>
                                {q.explanation}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex md:flex-col items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 pl-12 md:pl-0">
                        <button onClick={() => openEdit(q)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface border border-border-base text-text-secondary hover:text-primary hover:bg-surface-container hover:border-primary/30 transition-all shadow-sm" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(q.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface border border-border-base text-text-secondary hover:text-error hover:bg-error/10 hover:border-error/30 transition-all shadow-sm" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border-base text-text-primary rounded-2xl shadow-2xl max-w-3xl overflow-hidden p-0">
          <DialogHeader className="p-6 md:px-8 py-6 border-b border-border-base bg-surface-container/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                 <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-headline-md text-[20px] font-bold text-text-primary">
                  {editingId ? 'Edit Question' : 'Add Question'}
                </DialogTitle>
                <DialogDescription className="text-text-secondary text-[13px] mt-1">
                  Configure the question text, options, and explanation.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-text-primary flex items-center gap-1">Question Text <span className="text-error">*</span></Label>
              <Textarea 
                placeholder="What is the time complexity of..." 
                className="bg-surface-container border-border-base text-text-primary resize-y min-h-[100px] text-[14px] p-4 focus:ring-2 focus:ring-primary shadow-inner" 
                rows={3}
                value={form.question} 
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))} 
                required 
              />
            </div>

            <div className="space-y-4">
              <Label className="text-[13px] font-bold text-text-primary">Options (Select the correct one) <span className="text-error">*</span></Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.options.map((opt, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${form.correct_idx === idx ? 'bg-success/5 border-success/30 shadow-sm' : 'bg-surface-container border-border-base'}`}>
                    <label className="relative flex items-center justify-center cursor-pointer p-1">
                      <input 
                        type="radio" 
                        name="correct_idx" 
                        checked={form.correct_idx === idx}
                        onChange={() => setForm(f => ({ ...f, correct_idx: idx }))}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded-full border border-border-base peer-checked:border-success flex items-center justify-center transition-colors bg-surface">
                        <div className={`w-2.5 h-2.5 rounded-full bg-success scale-0 peer-checked:scale-100 transition-transform`} />
                      </div>
                    </label>
                    <Input 
                      placeholder={`Option ${idx + 1}`} 
                      className="bg-surface border-border-base text-text-primary flex-1 text-[14px] h-10 focus:ring-2 focus:ring-primary shadow-inner"
                      value={opt} 
                      onChange={e => {
                        const newOpts = [...form.options];
                        newOpts[idx] = e.target.value;
                        setForm(f => ({ ...f, options: newOpts }));
                      }} 
                      required 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-text-primary">Explanation (Optional)</Label>
              <Textarea 
                placeholder="Explain why the selected option is correct..." 
                className="bg-surface-container border-border-base text-text-primary resize-y min-h-[80px] text-[14px] p-4 focus:ring-2 focus:ring-primary shadow-inner" 
                rows={2}
                value={form.explanation} 
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-text-primary">Sort Order</Label>
                <Input 
                  type="number" 
                  className="bg-surface-container border-border-base text-text-primary h-12 text-[14px] focus:ring-2 focus:ring-primary shadow-inner max-w-[150px]"
                  value={form.sort_order} 
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} 
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border-base">
              <button type="button" onClick={() => setDialogOpen(false)} className="flex-1 h-12 bg-surface text-text-primary border border-border-base hover:bg-surface-container font-bold text-[14px] rounded-xl transition-all shadow-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 h-12 bg-primary text-white font-bold hover:bg-primary-container hover:text-on-primary-container text-[14px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 card-lift">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Question'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
