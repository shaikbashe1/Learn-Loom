import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Map, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  GraduationCap 
} from 'lucide-react';
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
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Roadmaps Management</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Design and manage AI-generated standard learning roadmaps for students.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button 
               onClick={() => { setEditingId(null); setForm({ title: '', domain: '', description: '', total_weeks: 4 }); setDialogOpen(true); }} 
               className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99] text-xs font-bold shadow-md shadow-primary/10 transition-all min-h-[40px]"
             >
                <Plus className="h-4 w-4" /> Create Roadmap
             </Button>
          </div>
        </section>

        {/* Roadmaps List Container */}
        <section className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
               <Map className="w-4.5 h-4.5 text-primary" />
               Standard Roadmaps
            </h3>
          </div>

          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-6 md:p-8 space-y-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-16 text-center">
                 <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                   <Map className="w-6 h-6 text-muted-foreground/40" />
                 </div>
                 <p className="text-sm font-bold text-foreground">No templates defined</p>
                 <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs mx-auto">
                   Click "Create Roadmap" to build your first curriculum template.
                 </p>
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex flex-col group transition-colors">
                  <div 
                    className="p-6 hover:bg-muted/10 transition-colors flex items-center justify-between cursor-pointer" 
                    onClick={() => toggleExpand(t.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-card border border-border shadow-sm shrink-0">
                         {expanded === t.id ? (
                           <ChevronDown className="w-4 h-4 text-foreground" />
                         ) : (
                           <ChevronRight className="w-4 h-4 text-muted-foreground" />
                         )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {t.title}
                        </p>
                        <p className="text-[10px] font-semibold text-muted-foreground mt-1 flex items-center gap-2">
                           <span className="px-2 py-0.5 bg-card border border-border rounded-lg text-[9px] font-extrabold uppercase tracking-wider">
                             {t.domain}
                           </span>
                           <span>•</span>
                           <span>{t.total_weeks} Weeks</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => { setEditingId(t.id); setForm({ title: t.title, domain: t.domain, description: t.description || '', total_weeks: t.total_weeks }); setDialogOpen(true); }} 
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-muted border border-transparent hover:border-border transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)} 
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-muted border border-transparent hover:border-border transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {expanded === t.id && (
                    <div className="bg-muted/5 border-t border-border p-6 md:pl-20">
                      <p className="text-xs font-medium text-muted-foreground mb-6 bg-card p-4 rounded-2xl border border-border shadow-inner leading-relaxed">
                        {t.description}
                      </p>
                      
                      <div className="space-y-4">
                        {nodes[t.id] ? (
                          nodes[t.id].length === 0 ? (
                            <div className="p-8 border border-dashed border-border rounded-2xl text-center bg-card/50">
                               <p className="text-xs text-muted-foreground italic font-semibold">
                                 No curriculum nodes defined for this roadmap yet.
                               </p>
                            </div>
                          ) : (
                            <div className="relative border-l border-border ml-5 space-y-6 pb-4">
                              {nodes[t.id].map(n => (
                                <div key={n.id} className="relative pl-8">
                                  <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold shadow-md border-2 border-card">
                                    W{n.week}
                                  </div>
                                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-border/80 transition-colors">
                                    <h4 className="text-xs font-bold text-foreground mb-1">{n.title}</h4>
                                    <p className="text-[11px] text-muted-foreground mb-4 italic font-semibold">Goal: {n.goal}</p>
                                    
                                    {n.tasks && n.tasks.length > 0 && (
                                      <div className="bg-muted/30 rounded-xl p-4 border border-border">
                                        <h5 className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                                          <GraduationCap className="w-3.5 h-3.5" /> Weekly Tasks
                                        </h5>
                                        <ul className="space-y-2">
                                          {n.tasks.map((task, idx) => (
                                            <li key={idx} className="text-xs text-foreground flex items-start gap-2 font-medium">
                                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0 mt-1.5" />
                                              <span className="leading-relaxed">{task}</span>
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
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        )}
                        
                        <button className="flex items-center gap-1.5 mt-4 ml-5 px-4 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-all">
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
        <DialogContent className="bg-card border-border text-foreground rounded-3xl shadow-2xl overflow-hidden p-0 max-w-lg">
          <DialogHeader className="p-6 md:p-8 border-b border-border bg-muted/20">
            <DialogTitle className="text-base font-bold text-foreground">
              {editingId ? 'Edit Roadmap Template' : 'Create Roadmap Template'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-semibold mt-1">
               Define the high-level metadata for this learning path.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Roadmap Title *</Label>
              <Input 
                className="bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner" 
                placeholder="e.g. Full Stack Web Development" 
                value={form.title} 
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Domain/Category *</Label>
              <Input 
                className="bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner" 
                placeholder="e.g. Software Engineering" 
                value={form.domain} 
                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Description</Label>
              <Textarea 
                className="bg-background border-border text-xs resize-none min-h-[100px] rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner font-semibold leading-relaxed" 
                placeholder="Brief overview of what students will achieve..." 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Total Duration (Weeks) *</Label>
              <Input 
                type="number" 
                min={1} 
                max={52} 
                className="bg-background border-border text-xs h-11 w-full max-w-[200px] rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner font-bold" 
                value={form.total_weeks} 
                onChange={e => setForm(f => ({ ...f, total_weeks: parseInt(e.target.value) || 1 }))} 
                required 
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  'Save Template'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
