import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Save, Loader2, Bot, SlidersHorizontal, Cpu, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
    const { data, error } = await supabase.from('ai_mentor_settings').select('*').limit(1).single();
    if (error) {
      if (error.code !== 'PGRST116') { // not found is okay, we will insert if needed, but DB init has it
        toast.error('Failed to load AI settings');
      }
    } else {
      setSettings(data as AISettings);
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
    const { error } = await supabase.from('ai_mentor_settings').update({
      system_prompt: settings.system_prompt,
      max_tokens: settings.max_tokens,
      model_name: settings.model_name,
      temperature: settings.temperature,
      updated_at: new Date().toISOString()
    }).eq('id', settings.id);

    if (error) toast.error('Failed to update AI settings');
    else toast.success('AI settings updated successfully');
    setSaving(false);
  };

  return (
    <AppLayout title="AI Mentor Settings" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full max-w-4xl">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">AI Mentor Configuration</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Configure the behavior, limitations, and underlying models for the LearnLoom AI Mentor across the entire platform.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="glass-panel p-6 md:p-8 rounded-2xl border border-border-base shadow-sm space-y-6 mt-4">
            <Skeleton className="h-10 w-1/3 rounded-xl bg-surface-container" />
            <Skeleton className="h-64 w-full rounded-xl bg-surface-container" />
            <Skeleton className="h-32 w-full rounded-xl bg-surface-container" />
          </div>
        ) : settings ? (
          <form onSubmit={handleSave} className="glass-panel p-6 md:p-8 rounded-2xl border border-border-base shadow-sm flex flex-col gap-8 mt-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full -mr-32 -mt-32 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 border-b border-border-base pb-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                  <Bot className="w-5 h-5" />
                </div>
                <h2 className="font-headline-md text-[20px] font-bold text-text-primary">Core AI Behavior</h2>
              </div>
              
              <div className="space-y-3">
                <Label className="text-[14px] font-bold text-text-primary flex items-center gap-2">
                  System Prompt <span className="text-error">*</span>
                </Label>
                <p className="text-[12px] font-medium text-text-secondary mb-2">The root instructions given to the AI Mentor. This defines its persona and boundaries.</p>
                <Textarea 
                  className="bg-surface-container border-border-base text-text-primary min-h-[240px] font-mono text-[13px] leading-relaxed p-4 rounded-xl shadow-inner focus:ring-2 focus:ring-primary resize-y" 
                  value={settings.system_prompt}
                  onChange={e => setSettings({ ...settings, system_prompt: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 border-b border-border-base pb-4 mb-6 pt-2">
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shadow-inner border border-tertiary/20">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h2 className="font-headline-md text-[20px] font-bold text-text-primary">Model Parameters</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-3">
                  <Label className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                     <Cpu className="w-4 h-4 text-text-secondary" /> Model Provider/Name
                  </Label>
                  <p className="text-[12px] font-medium text-text-secondary h-8">Which LLM to route requests to (e.g. gpt-4, claude-3).</p>
                  <Input 
                    className="bg-surface-container border-border-base text-text-primary h-12 text-[14px] font-bold focus:ring-2 focus:ring-tertiary shadow-inner" 
                    value={settings.model_name}
                    onChange={e => setSettings({ ...settings, model_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                    Max Tokens
                  </Label>
                  <p className="text-[12px] font-medium text-text-secondary h-8">Maximum tokens generated per response. Used for cost control.</p>
                  <Input 
                    type="number"
                    min={100}
                    max={8000}
                    className="bg-surface-container border-border-base text-text-primary h-12 text-[14px] font-bold focus:ring-2 focus:ring-tertiary shadow-inner" 
                    value={settings.max_tokens}
                    onChange={e => setSettings({ ...settings, max_tokens: parseInt(e.target.value) || 1000 })}
                    required
                  />
                </div>

                <div className="space-y-3 md:col-span-2 mt-2 p-5 bg-surface-container border border-border-base rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-warning" /> Temperature
                    </Label>
                    <span className="font-mono text-[14px] font-bold text-tertiary bg-tertiary/10 px-2 py-1 rounded border border-tertiary/20">{settings.temperature.toFixed(1)}</span>
                  </div>
                  <p className="text-[12px] font-medium text-text-secondary mb-4">Controls randomness. 0 is deterministic and focused, 1 is highly creative.</p>
                  <div className="px-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1"
                      className="w-full accent-tertiary h-2 bg-surface rounded-lg appearance-none cursor-pointer border border-border-base" 
                      value={settings.temperature}
                      onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    />
                    <div className="flex justify-between text-[11px] font-bold text-text-secondary mt-2 px-1 uppercase tracking-wider">
                       <span>Precise (0.0)</span>
                       <span>Creative (1.0)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border-base flex justify-end mt-4 relative z-10">
              <button type="submit" disabled={saving} className="bg-primary text-white font-bold py-3.5 px-8 rounded-xl shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-all text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed card-lift w-full md:w-auto">
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-16 text-center glass-panel rounded-2xl border border-border-base shadow-sm mt-4">
             <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
               <Bot className="w-6 h-6 text-text-secondary" />
             </div>
             <p className="font-headline-md text-[18px] font-bold text-text-primary">No AI configuration found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
