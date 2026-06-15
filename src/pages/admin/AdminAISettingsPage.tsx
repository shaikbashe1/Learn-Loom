import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Save, Loader2, Bot, SlidersHorizontal } from 'lucide-react';
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
      <div className="max-w-[1000px] mx-auto w-full space-y-xl pb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">AI Mentor Configuration</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Configure the behavior, limitations, and underlying models for the LearnLoom AI Mentor across the entire platform.</p>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel p-xl rounded-2xl space-y-6">
            <Skeleton className="h-10 w-1/3 rounded" />
            <Skeleton className="h-32 w-full rounded" />
            <Skeleton className="h-10 w-1/4 rounded" />
          </div>
        ) : settings ? (
          <form onSubmit={handleSave} className="glass-panel p-xl rounded-2xl flex flex-col gap-xl">
            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
              <Bot className="w-6 h-6 text-primary" />
              <h2 className="font-headline-md text-on-surface">Core AI Behavior</h2>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium text-on-surface flex items-center gap-2">System Prompt <span className="text-error">*</span></Label>
              <p className="text-xs text-on-surface-variant">The root instructions given to the AI Mentor. This defines its persona and boundaries.</p>
              <Textarea 
                className="bg-surface-container-lowest border-outline-variant text-on-surface min-h-[200px] font-mono text-sm leading-relaxed" 
                value={settings.system_prompt}
                onChange={e => setSettings({ ...settings, system_prompt: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4 pt-6">
              <SlidersHorizontal className="w-6 h-6 text-primary" />
              <h2 className="font-headline-md text-on-surface">Model Parameters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-on-surface">Model Provider/Name</Label>
                <p className="text-xs text-on-surface-variant">Which LLM to route requests to (e.g. gpt-4, gpt-3.5-turbo, claude-3).</p>
                <Input 
                  className="bg-surface-container-lowest border-outline-variant text-on-surface" 
                  value={settings.model_name}
                  onChange={e => setSettings({ ...settings, model_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-on-surface">Max Tokens</Label>
                <p className="text-xs text-on-surface-variant">Maximum tokens generated per response. Used for cost control.</p>
                <Input 
                  type="number"
                  min={100}
                  max={8000}
                  className="bg-surface-container-lowest border-outline-variant text-on-surface" 
                  value={settings.max_tokens}
                  onChange={e => setSettings({ ...settings, max_tokens: parseInt(e.target.value) || 1000 })}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-on-surface">Temperature: {settings.temperature}</Label>
                <p className="text-xs text-on-surface-variant">Controls randomness. 0 is deterministic, 1 is highly creative.</p>
                <div className="pt-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    className="w-full accent-primary" 
                    value={settings.temperature}
                    onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-outline-variant/30 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-primary text-on-primary font-bold px-8 flex items-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Configuration
              </Button>
            </div>
          </form>
        ) : (
          <div className="glass-panel p-xl rounded-2xl text-center text-on-surface-variant">
            No settings configuration found in the database.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
