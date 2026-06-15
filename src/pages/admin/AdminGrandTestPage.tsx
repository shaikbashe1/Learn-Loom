import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Plus, Trash2, Edit2, Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Grand Test Moderation</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Manage the global pool of atomic questions used for the platform-wide Grand Test assessments.</p>
          </div>
          <div className="flex gap-md items-center">
            <Button onClick={openCreate} className="px-lg py-md rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_0_8px_rgba(192,193,255,0.3)]">
              <Plus className="w-5 h-5" /> Add Question
            </Button>
          </div>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="p-lg border-b border-outline-variant/60 flex items-center justify-between">
            <h2 className="font-headline-md text-on-surface flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Global Question Pool
            </h2>
            <span className="px-2 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">{questions.length} Total</span>
          </div>
          
          <div className="divide-y divide-outline-variant/30">
            {loading ? (
              <div className="p-lg space-y-4">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : questions.length === 0 ? (
              <div className="p-16 text-center text-on-surface-variant">No questions in the pool.</div>
            ) : (
              questions.map((q, i) => {
                let opts: string[] = [];
                try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch {}
                
                return (
                  <div key={q.id} className="p-lg hover:bg-surface-variant/10 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 shrink-0 rounded bg-surface-container-highest flex items-center justify-center text-label-sm font-bold text-on-surface-variant mt-0.5">
                            {q.sort_order || i + 1}
                          </span>
                          <p className="font-body-md font-medium text-on-surface">{q.question}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                          {opts.map((opt, oi) => (
                            <div key={oi} className={`px-3 py-2 rounded-md border text-sm flex items-center gap-2 ${oi === q.correct_idx ? 'bg-success/10 border-success/30 text-success font-medium' : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface-variant'}`}>
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${oi === q.correct_idx ? 'border-success' : 'border-outline-variant'}`}>
                                {oi === q.correct_idx && <span className="w-2 h-2 rounded-full bg-success" />}
                              </span>
                              {opt}
                            </div>
                          ))}
                        </div>
                        
                        {q.explanation && (
                          <div className="pl-9 mt-2">
                            <p className="text-sm text-on-surface-variant bg-surface-container-high/50 p-3 rounded-lg border border-outline-variant/30">
                              <span className="font-medium">Explanation:</span> {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(q)} className="p-2 h-auto text-on-surface-variant hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)} className="p-2 h-auto text-on-surface-variant hover:text-error">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-on-surface font-display text-headline-md">
              {editingId ? 'Edit Question' : 'Add Question'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-on-surface">Question Text</Label>
              <Textarea 
                placeholder="What is the time complexity of..." 
                className="bg-surface-container-lowest border-outline-variant text-on-surface resize-none" 
                rows={3}
                value={form.question} 
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))} 
                required 
              />
            </div>

            <div className="space-y-3">
              <Label className="text-on-surface">Options (Select the correct one)</Label>
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="correct_idx" 
                    checked={form.correct_idx === idx}
                    onChange={() => setForm(f => ({ ...f, correct_idx: idx }))}
                    className="w-4 h-4 accent-primary shrink-0 cursor-pointer"
                  />
                  <Input 
                    placeholder={`Option ${idx + 1}`} 
                    className="bg-surface-container-lowest border-outline-variant text-on-surface flex-1"
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

            <div className="space-y-2">
              <Label className="text-on-surface">Explanation (Optional)</Label>
              <Textarea 
                placeholder="Explain why the selected option is correct..." 
                className="bg-surface-container-lowest border-outline-variant text-on-surface resize-none" 
                rows={2}
                value={form.explanation} 
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-on-surface">Sort Order</Label>
                <Input 
                  type="number" 
                  className="bg-surface-container-lowest border-outline-variant text-on-surface"
                  value={form.sort_order} 
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-outline-variant/30">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 border border-outline-variant text-on-surface hover:bg-surface-variant">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-primary text-on-primary font-bold hover:opacity-90">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Question'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
