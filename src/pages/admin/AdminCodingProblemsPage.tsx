import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Problem {
  id: string;
  title: string;
  difficulty: string;
  is_daily: boolean;
  credits: number;
}

export default function AdminCodingProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('coding_problems').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load problems');
    } else {
      setProblems(data as Problem[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    const { error } = await supabase.from('coding_problems').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete problem');
    } else {
      toast.success('Problem deleted');
      fetchProblems();
    }
  };

  return (
    <AppLayout title="Manage Coding Problems" isAdmin>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Coding Problems</h1>
            <p className="text-on-surface-variant font-label-md mt-1">Manage the coding problem library, daily challenges, and test cases.</p>
          </div>
          <Button className="bg-primary text-on-primary font-bold">
            <span className="material-symbols-outlined mr-2">add</span> Create Problem
          </Button>
        </div>

        <div className="bg-surface border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr_120px_100px_100px_120px] gap-4 p-4 border-b border-outline-variant/60 bg-surface-container-lowest font-bold text-xs text-on-surface-variant uppercase tracking-wider">
            <div>Problem Title</div>
            <div className="text-center">Difficulty</div>
            <div className="text-center">Credits</div>
            <div className="text-center">Daily?</div>
            <div className="text-right">Actions</div>
          </div>
          
          <div className="divide-y divide-outline-variant/30">
            {loading ? (
              <div className="p-12 text-center text-on-surface-variant">Loading problems...</div>
            ) : problems.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant">No problems found. Create one above.</div>
            ) : (
              problems.map(p => (
                <div key={p.id} className="grid grid-cols-[1fr_120px_100px_100px_120px] gap-4 p-4 items-center hover:bg-surface-variant/20 transition-colors">
                  <div className="font-medium text-on-surface">
                    {p.title}
                  </div>
                  <div className="text-center">
                    <Badge variant="outline">{p.difficulty}</Badge>
                  </div>
                  <div className="text-center text-sm font-medium text-[#facc15]">
                    {p.credits}
                  </div>
                  <div className="text-center">
                    {p.is_daily ? (
                      <span className="material-symbols-outlined text-tertiary">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant opacity-30">cancel</span>
                    )}
                  </div>
                  <div className="text-right flex items-center justify-end gap-2">
                    <button className="text-primary hover:text-primary-fixed-dim p-1 rounded-full hover:bg-primary/10 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-error hover:text-error-container p-1 rounded-full hover:bg-error/10 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
