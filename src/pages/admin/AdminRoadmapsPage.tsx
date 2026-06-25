import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Map, Plus, Trash2, Edit2, Loader2, Save, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  resources: { title: string; url: string; type: string }[];
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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Roadmaps Management</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Design and manage AI-generated standard learning roadmaps for students.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={() => { setEditingId(null); setForm({ title: '', domain: '', description: '', total_weeks: 4 }); setDialogOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-label-md text-[14px] font-bold shadow-sm transition-all card-lift">
                <Plus className="w-5 h-5" /> Create Roadmap
             </button>
          </div>
        </section>

        {/* Roadmaps List Container */}
        <section className="glass-panel border border-border-base rounded-2xl shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="p-6 md:px-8 py-5 border-b border-border-base flex justify-between items-center bg-surface/50">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
               <Map className="w-5 h-5 text-primary" />
               Standard Roadmaps
            </h3>
          </div>

          <div className="divide-y divide-border-base">
            {loading ? (
              <div className="p-6 md:p-8 space-y-4">
                <Skeleton className="h-20 w-full rounded-xl bg-surface-container" />
                <Skeleton className="h-20 w-full rounded-xl bg-surface-container" />
                <Skeleton className="h-20 w-full rounded-xl bg-surface-container" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-16 text-center">
                 <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                   <Map className="w-6 h-6 text-text-secondary" />
                 </div>
                 <p className="font-headline-md text-[18px] font-bold text-text-primary">No templates defined</p>
                 <p className="text-[14px] text-text-secondary mt-1">Click "Create Roadmap" to build your first template.</p>
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex flex-col group transition-colors">
                  <div className="p-6 md:px-8 hover:bg-surface-container/30 transition-colors flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(t.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface border border-border-base shadow-sm shrink-0">
                         {expanded === t.id ? <ChevronDown className="w-4 h-4 text-text-primary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                      </div>
                      <div>
                        <p className="font-body-lg text-[16px] font-bold text-text-primary group-hover:text-primary transition-colors">{t.title}</p>
                        <p className="text-[13px] font-medium text-text-secondary mt-0.5 flex items-center gap-2">
                           <span className="px-2 py-0.5 bg-surface border border-border-base rounded shadow-sm text-[11px] font-bold uppercase tracking-wider">{t.domain}</span>
                           <span>•</span>
                           <span>{t.total_weeks} Weeks</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingId(t.id); setForm({ title: t.title, domain: t.domain, description: t.description || '', total_weeks: t.total_weeks }); setDialogOpen(true); }} className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-primary hover:bg-surface shadow-sm border border-transparent hover:border-border-base transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-error hover:bg-surface shadow-sm border border-transparent hover:border-border-base transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {expanded === t.id && (
                    <div className="bg-surface-container/20 border-t border-border-base p-6 md:px-8 md:pl-20">
                      <p className="text-[14px] font-medium text-text-primary mb-6 bg-surface p-4 rounded-xl border border-border-base shadow-sm">{t.description}</p>
                      
                      <div className="space-y-4">
                        {nodes[t.id] ? (
                          nodes[t.id].length === 0 ? (
                            <div className="p-8 border-2 border-dashed border-border-base rounded-xl text-center bg-surface/50">
                               <p className="text-[14px] text-text-secondary italic">No curriculum nodes defined for this roadmap yet.</p>
                            </div>
                          ) : (
                            <div className="relative border-l-2 border-border-base ml-5 space-y-6 pb-4">
                              {nodes[t.id].map(n => (
                                <div key={n.id} className="relative pl-8">
                                  <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-bold shadow-md border-2 border-surface">
                                    W{n.week}
                                  </div>
                                  <div className="bg-surface border border-border-base rounded-xl p-5 shadow-sm hover:border-primary/30 transition-colors">
                                    <h4 className="font-bold text-[16px] text-text-primary mb-1">{n.title}</h4>
                                    <p className="text-[14px] text-text-secondary mb-4 italic">Goal: {n.goal}</p>
                                    
                                    {n.tasks && n.tasks.length > 0 && (
                                      <div className="bg-surface-container/30 rounded-lg p-4 border border-border-base">
                                        <h5 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-1"><GraduationCap className="w-4 h-4" /> Weekly Tasks</h5>
                                        <ul className="space-y-2">
                                          {n.tasks.map((task, idx) => (
                                            <li key={idx} className="text-[13px] text-text-primary flex items-start gap-2">
                                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0 mt-1.5"></span>
                                              <span>{task}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        )}
                        <button className="flex items-center gap-2 mt-4 ml-5 px-4 py-2 text-[13px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors">
                           <Plus className="w-4 h-4" /> Add Week Module
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border-base text-text-primary rounded-2xl shadow-2xl overflow-hidden p-0 max-w-lg">
          <DialogHeader className="p-6 md:p-8 border-b border-border-base bg-surface-container/30">
            <DialogTitle className="font-headline-md text-[24px] font-bold text-text-primary">{editingId ? 'Edit Roadmap Template' : 'Create Roadmap Template'}</DialogTitle>
            <DialogDescription className="text-text-secondary text-[14px] mt-1">
               Define the high-level metadata for this learning path.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-5">
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-text-primary">Roadmap Title *</Label>
              <Input className="bg-surface border-border-base text-text-primary h-11" placeholder="e.g. Full Stack Web Development" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-text-primary">Domain/Category *</Label>
              <Input className="bg-surface border-border-base text-text-primary h-11" placeholder="e.g. Software Engineering" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-text-primary">Description</Label>
              <Textarea className="bg-surface border-border-base text-text-primary resize-none min-h-[100px]" placeholder="Brief overview of what students will achieve..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-text-primary">Total Duration (Weeks) *</Label>
              <Input type="number" min={1} max={52} className="bg-surface border-border-base text-text-primary h-11 w-full max-w-[200px]" value={form.total_weeks} onChange={e => setForm(f => ({ ...f, total_weeks: parseInt(e.target.value) || 1 }))} required />
            </div>
            <div className="flex gap-3 pt-6 border-t border-border-base mt-8 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto h-11 px-6 border-border-base text-text-primary hover:bg-surface-container font-bold rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto h-11 px-8 bg-primary text-white font-bold rounded-xl shadow-sm hover:opacity-90">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
