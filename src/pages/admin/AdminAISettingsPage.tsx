import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { db } from '@/db/firebase';
import { collection, doc, getDocs, updateDoc, limit, query } from 'firebase/firestore';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bot, 
  SlidersHorizontal, 
  Cpu, 
  Sparkles,
  Save,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface AISettings {
  id: string;
  system_prompt: string;
  max_tokens: number;
  model_name: string;
  temperature: number;
}

export default function AdminAISettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'ai_mentor_settings'), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setSettings({ id: docSnap.id, ...docSnap.data() } as AISettings);
      } else {
        setSettings(null);
      }
    } catch (error) {
      toast.error('Failed to load AI settings');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'ai_mentor_settings', settings.id);
      await updateDoc(docRef, {
        system_prompt: settings.system_prompt,
        max_tokens: settings.max_tokens,
        model_name: settings.model_name,
        temperature: settings.temperature,
        updated_at: new Date().toISOString()
      });
      toast.success('AI settings updated successfully');
    } catch (error) {
      toast.error('Failed to update AI settings');
    }
    setSaving(false);
  };

  return (
    <AppLayout title="AI Mentor Settings" isAdmin>
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full max-w-4xl select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">AI Mentor Configuration</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Configure the behavior, limitations, and underlying models for the Quovexi AI Mentor across the entire platform.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm space-y-6 mt-4">
            <Skeleton className="h-10 w-1/3 rounded-xl bg-muted" />
            <Skeleton className="h-64 w-full rounded-xl bg-muted" />
            <Skeleton className="h-32 w-full rounded-xl bg-muted" />
          </div>
        ) : settings ? (
          <form onSubmit={handleSave} className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm flex flex-col gap-8 mt-4 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 border-b border-border pb-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-foreground">Core AI Behavior</h2>
              </div>
              
              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  System Prompt <span className="text-destructive">*</span>
                </Label>
                <p className="text-[11px] text-muted-foreground font-semibold">
                  The root instructions given to the AI Mentor. This defines its persona and boundaries.
                </p>
                <Textarea 
                  className="bg-background border-border text-xs min-h-[240px] font-mono leading-relaxed p-4 rounded-xl shadow-inner focus:ring-primary/20 resize-y font-medium" 
                  value={settings.system_prompt}
                  onChange={e => setSettings({ ...settings, system_prompt: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2.5 border-b border-border pb-4 mb-6 pt-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-foreground">Model Parameters</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                     <Cpu className="w-4 h-4 text-muted-foreground/80" /> 
                     <span>Model Provider/Name</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground font-semibold h-8 leading-normal">
                    Which LLM to route requests to (e.g. gpt-4, claude-3).
                  </p>
                  <Input 
                    className="bg-background border-border text-xs h-11 rounded-xl font-bold focus:ring-primary/20 shadow-inner" 
                    value={settings.model_name}
                    onChange={e => setSettings({ ...settings, model_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                    Max Tokens
                  </Label>
                  <p className="text-[11px] text-muted-foreground font-semibold h-8 leading-normal">
                    Maximum tokens generated per response. Used for cost control.
                  </p>
                  <Input 
                    type="number"
                    min={100}
                    max={8000}
                    className="bg-background border-border text-xs h-11 rounded-xl font-bold focus:ring-primary/20 shadow-inner" 
                    value={settings.max_tokens}
                    onChange={e => setSettings({ ...settings, max_tokens: parseInt(e.target.value) || 1000 })}
                    required
                  />
                </div>

                <div className="space-y-3 md:col-span-2 mt-2 p-5 bg-muted/25 border border-border rounded-2xl shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                       <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> 
                       <span>Temperature</span>
                    </Label>
                    <span className="font-mono text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                      {settings.temperature.toFixed(1)}
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-muted-foreground font-semibold mb-4">
                    Controls randomness. 0 is deterministic and focused, 1 is highly creative.
                  </p>
                  
                  <div className="px-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1"
                      className="w-full accent-primary h-1.5 bg-background border border-border rounded-lg appearance-none cursor-pointer" 
                      value={settings.temperature}
                      onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    />
                    <div className="flex justify-between text-[9px] font-extrabold text-muted-foreground mt-2 px-1 uppercase tracking-wider">
                       <span>Precise (0.0)</span>
                       <span>Creative (1.0)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end mt-4 relative z-10">
              <Button 
                type="submit" 
                disabled={saving} 
                className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.99] transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto min-h-[44px]"
              >
                {saving ? (
                  <><Loader2 className="w-4.5 h-4.5 animate-spin" /><span>Saving...</span></>
                ) : (
                  <>
                    <Save className="w-4.5 h-4.5" />
                    <span>Save Configuration</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-16 text-center bg-card rounded-3xl border border-border shadow-sm mt-4">
             <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
               <Bot className="w-6 h-6 text-muted-foreground/40" />
             </div>
             <p className="text-sm font-bold text-foreground">No AI configuration found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
