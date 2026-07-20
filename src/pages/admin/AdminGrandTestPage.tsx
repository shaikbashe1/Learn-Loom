import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { db } from '@/db/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
    try {
      const q = query(
        collection(db, 'grand_test_questions'),
        where('course_id', '==', null),
        orderBy('sort_order', 'asc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DBGrandTestQuestion[];
      setQuestions(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load grand test questions');
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

    try {
      if (editingId) {
        await updateDoc(doc(db, 'grand_test_questions', editingId), payload);
        toast.success('Question updated');
        setDialogOpen(false);
        fetchQuestions();
      } else {
        await addDoc(collection(db, 'grand_test_questions'), payload);
        toast.success('Question added');
        setDialogOpen(false);
        fetchQuestions();
      }
    } catch (error) {
      console.error(error);
      toast.error(editingId ? 'Update failed' : 'Creation failed');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteDoc(doc(db, 'grand_test_questions', id));
      toast.success('Question deleted');
      fetchQuestions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete question');
    }
  };

  return (
    <AppLayout title="Grand Test Moderation" isAdmin>
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full max-w-5xl select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Grand Test Moderation</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Manage the global pool of atomic questions used for the platform-wide Grand Test assessments.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={fetchQuestions} 
               className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all shadow-sm"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             
             <Button 
               onClick={openCreate} 
               className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99] text-xs font-bold shadow-md shadow-primary/10 transition-all min-h-[40px]"
             >
              <Plus className="h-4 w-4" /> Add Question
             </Button>
          </div>
        </section>

        {/* Questions Pool */}
        <section className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-primary" /> Global Question Pool
            </h2>
            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shadow-sm">
              {questions.length} Questions
            </span>
          </div>
          
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-6 md:p-8 space-y-4">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ) : questions.length === 0 ? (
              <div className="p-16 text-center">
                 <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                   <ShieldCheck className="w-6 h-6 text-muted-foreground/40" />
                 </div>
                 <p className="text-sm font-bold text-foreground">No questions in the pool</p>
                 <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs mx-auto">
                   Click the button above to add your first assessment question.
                 </p>
              </div>
            ) : (
              questions.map((q, i) => {
                let opts: string[] = [];
                try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch {}
                
                return (
                  <div key={q.id} className="p-6 md:p-8 hover:bg-muted/5 transition-colors group">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                      <div className="space-y-4 flex-grow w-full">
                        <div className="flex items-start gap-4">
                          <span className="w-8 h-8 shrink-0 rounded-xl bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shadow-sm">
                            {q.sort_order || i + 1}
                          </span>
                          <p className="text-xs font-bold text-foreground leading-relaxed pt-1">{q.question}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                          {opts.map((opt, oi) => (
                            <div 
                              key={oi} 
                              className={`px-4 py-3 rounded-xl border text-xs flex items-start gap-2.5 shadow-sm 
                                ${
                                  oi === q.correct_idx 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold' 
                                    : 'bg-muted/30 border-border text-muted-foreground font-semibold'
                                }`}
                            >
                              <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                oi === q.correct_idx ? 'border-emerald-500' : 'border-muted-foreground/30'
                              }`}>
                                {oi === q.correct_idx && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                              </div>
                              <span className="leading-relaxed">{opt}</span>
                            </div>
                          ))}
                        </div>
                        
                        {q.explanation && (
                          <div className="pl-12 mt-4">
                            <div className="p-4 rounded-xl border border-border bg-muted/20 shadow-inner">
                              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                                <span className="font-extrabold text-foreground uppercase tracking-wider text-[9px] block mb-1">
                                  Explanation
                                </span>
                                {q.explanation}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex md:flex-col items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 pl-12 md:pl-0">
                        <button 
                          onClick={() => openEdit(q)} 
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-background border border-border text-muted-foreground hover:text-primary hover:bg-muted transition-all shadow-sm" 
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(q.id)} 
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-background border border-border text-muted-foreground hover:text-destructive hover:bg-muted transition-all shadow-sm" 
                          title="Delete"
                        >
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
        <DialogContent className="bg-card border-border text-foreground rounded-3xl shadow-2xl max-w-3xl overflow-hidden p-0">
          <DialogHeader className="p-6 md:p-8 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0">
                 <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingId ? 'Edit Question' : 'Add Question'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-semibold mt-1">
                  Configure the question text, options, and explanation.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">Question Text <span className="text-destructive">*</span></Label>
              <Textarea 
                placeholder="What is the time complexity of..." 
                className="bg-background border-border text-xs resize-none min-h-[100px] p-4 rounded-xl focus:ring-primary/20 shadow-inner font-semibold leading-relaxed" 
                rows={3}
                value={form.question} 
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))} 
                required 
              />
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-bold text-foreground">Options (Select the correct one) <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.options.map((opt, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all 
                      ${
                        form.correct_idx === idx 
                          ? 'bg-emerald-500/5 border-emerald-500/30' 
                          : 'bg-background border-border'
                      }`}
                  >
                    <label className="relative flex items-center justify-center cursor-pointer p-1 shrink-0">
                      <input 
                        type="radio" 
                        name="correct_idx" 
                        checked={form.correct_idx === idx}
                        onChange={() => setForm(f => ({ ...f, correct_idx: idx }))}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </label>
                    <Input 
                      className="bg-background border-border text-xs h-10 rounded-xl focus:ring-primary/20 shadow-inner font-semibold" 
                      placeholder={`Option ${idx + 1}`} 
                      value={opt} 
                      onChange={e => {
                        const next = [...form.options];
                        next[idx] = e.target.value;
                        setForm(f => ({ ...f, options: next }));
                      }}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Explanation</Label>
              <Textarea 
                placeholder="Explain why this option is correct..." 
                className="bg-background border-border text-xs resize-none min-h-[80px] p-4 rounded-xl focus:ring-primary/20 shadow-inner font-semibold leading-relaxed" 
                value={form.explanation} 
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Sort Order</Label>
              <Input 
                type="number" 
                className="bg-background border-border text-xs h-10 rounded-xl focus:ring-primary/20 shadow-inner w-full max-w-[150px] font-bold" 
                value={form.sort_order} 
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} 
              />
            </div>

            <div className="flex gap-3 pt-6 border-t border-border mt-8 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)} 
                className="w-full sm:w-auto h-11 px-6 border-border text-foreground hover:bg-muted/50 font-bold rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving} 
                className="w-full sm:w-auto h-11 px-8 bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.98] transition-all text-xs"
              >
                {saving ? (
                  <><Loader2 className="w-4.5 h-4.5 animate-spin mr-1.5" />Saving...</>
                ) : (
                  'Save Question'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
export { AdminGrandTestPage };
