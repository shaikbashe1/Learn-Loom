import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Map, Plus, Trash2, Edit2, Loader2, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RoadmapTemplate {
  id: string;
  title: string;
  domain: string;
  description: string;
  total_weeks: number;
}

interface RoadmapNode {
  id: string;
  template_id: string;
  week: number;
  title: string;
  goal: string;
  tasks: string[];
  resources: any[];
}

export default function AdminRoadmapsPage() {
  const [templates, setTemplates] = useState<RoadmapTemplate[]>([]);
  const [nodes, setNodes] = useState<Record<string, RoadmapNode[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', domain: '', description: '', total_weeks: 4 });

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('roadmap_templates').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load roadmaps');
    else setTemplates(data as RoadmapTemplate[]);
    setLoading(false);
  };

  const fetchNodes = async (templateId: string) => {
    const { data, error } = await supabase.from('roadmap_template_nodes').select('*').eq('template_id', templateId).order('week', { ascending: true });
    if (!error && data) {
      setNodes(prev => ({ ...prev, [templateId]: data as RoadmapNode[] }));
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!nodes[id]) fetchNodes(id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.domain) return;
    setSaving(true);
    
    if (editingId) {
      const { error } = await supabase.from('roadmap_templates').update(form).eq('id', editingId);
      if (error) toast.error('Failed to update roadmap');
      else { toast.success('Roadmap updated'); setDialogOpen(false); fetchTemplates(); }
    } else {
      const { error } = await supabase.from('roadmap_templates').insert(form);
      if (error) toast.error('Failed to create roadmap');
      else { toast.success('Roadmap created'); setDialogOpen(false); fetchTemplates(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this roadmap?')) return;
    const { error } = await supabase.from('roadmap_templates').delete().eq('id', id);
    if (error) toast.error('Failed to delete roadmap');
    else { toast.success('Roadmap deleted'); fetchTemplates(); }
  };

  return (
    <AppLayout title="Roadmaps Management" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Roadmaps Management</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Manage AI-generated standard roadmaps for students. Control the curriculum templates for various domains.</p>
          </div>
          <Button onClick={() => { setEditingId(null); setForm({ title: '', domain: '', description: '', total_weeks: 4 }); setDialogOpen(true); }} className="px-lg py-md rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Create Roadmap
          </Button>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="p-lg border-b border-outline-variant/60 flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            <h2 className="font-headline-md text-on-surface">Standard Roadmaps</h2>
          </div>

          <div className="divide-y divide-outline-variant/30">
            {loading ? (
              <div className="p-lg space-y-4">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-16 text-center text-on-surface-variant">No roadmap templates found.</div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex flex-col">
                  <div className="p-lg hover:bg-surface-variant/10 transition-colors flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(t.id)}>
                    <div className="flex items-center gap-4">
                      {expanded === t.id ? <ChevronDown className="w-5 h-5 text-on-surface-variant" /> : <ChevronRight className="w-5 h-5 text-on-surface-variant" />}
                      <div>
                        <p className="font-body-lg font-medium text-on-surface">{t.title}</p>
                        <p className="text-sm text-on-surface-variant">{t.domain} • {t.total_weeks} Weeks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(t.id); setForm({ title: t.title, domain: t.domain, description: t.description || '', total_weeks: t.total_weeks }); setDialogOpen(true); }} className="p-2 text-on-surface-variant hover:text-primary">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="p-2 text-on-surface-variant hover:text-error">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {expanded === t.id && (
                    <div className="bg-surface-container-lowest border-t border-outline-variant/30 p-lg pl-14">
                      <p className="text-sm text-on-surface-variant mb-4">{t.description}</p>
                      <div className="space-y-3">
                        {nodes[t.id] ? (
                          nodes[t.id].length === 0 ? (
                            <p className="text-sm text-on-surface-variant italic">No nodes defined for this roadmap yet.</p>
                          ) : (
                            nodes[t.id].map(n => (
                              <div key={n.id} className="flex items-start gap-4 p-4 border border-outline-variant/40 rounded-lg bg-surface">
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">W{n.week}</div>
                                <div>
                                  <p className="font-medium text-on-surface">{n.title}</p>
                                  <p className="text-sm text-on-surface-variant mb-2">{n.goal}</p>
                                  <ul className="list-disc list-inside text-xs text-on-surface-variant">
                                    {n.tasks.map((task, idx) => <li key={idx}>{task}</li>)}
                                  </ul>
                                </div>
                              </div>
                            ))
                          )
                        ) : (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        )}
                        <Button variant="outline" size="sm" className="mt-2 text-primary border-primary/30"><Plus className="w-4 h-4 mr-1" /> Add Week</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant">
          <DialogHeader><DialogTitle className="text-on-surface">{editingId ? 'Edit Roadmap' : 'Create Roadmap'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-on-surface">Title</Label>
              <Input className="bg-surface-container-lowest border-outline-variant text-on-surface" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-on-surface">Domain</Label>
              <Input className="bg-surface-container-lowest border-outline-variant text-on-surface" placeholder="e.g. Data Science, Web Dev" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-on-surface">Description</Label>
              <Textarea className="bg-surface-container-lowest border-outline-variant text-on-surface" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-on-surface">Total Weeks</Label>
              <Input type="number" min={1} className="bg-surface-container-lowest border-outline-variant text-on-surface" value={form.total_weeks} onChange={e => setForm(f => ({ ...f, total_weeks: parseInt(e.target.value) || 1 }))} required />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-primary text-on-primary">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
