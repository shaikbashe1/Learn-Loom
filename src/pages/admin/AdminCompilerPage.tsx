import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Terminal, Save, CheckCircle2, ShieldAlert } from 'lucide-react';

interface PistonConfig {
  id: string;
  proxy_url: string;
  max_execution_time_ms: number;
  allowed_runtimes: string[];
  is_active: boolean;
}

export default function AdminCompilerPage() {
  const [config, setConfig] = useState<PistonConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('piston_config').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') {
      toast.error('Failed to load compiler configuration');
    } else if (data) {
      setConfig(data as PistonConfig);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase.from('piston_config').update({
      proxy_url: config.proxy_url,
      max_execution_time_ms: config.max_execution_time_ms,
      allowed_runtimes: config.allowed_runtimes,
      is_active: config.is_active,
    }).eq('id', config.id);

    if (error) {
      toast.error('Failed to save configuration');
    } else {
      toast.success('Configuration saved successfully');
    }
    setSaving(false);
  };

  const handleRuntimeToggle = (runtime: string) => {
    if (!config) return;
    const newRuntimes = config.allowed_runtimes.includes(runtime)
      ? config.allowed_runtimes.filter(r => r !== runtime)
      : [...config.allowed_runtimes, runtime];
    setConfig({ ...config, allowed_runtimes: newRuntimes });
  };

  const ALL_RUNTIMES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'rust', 'go', 'ruby'];

  return (
    <AppLayout title="Compiler Settings" isAdmin>
      <div className="max-w-4xl mx-auto w-full space-y-xl pb-xl pt-10">
        <div className="space-y-2 mb-8">
          <h1 className="font-display text-display text-on-surface">Compiler Management</h1>
          <p className="text-on-surface-variant text-body-lg">Configure the Piston remote code execution sandbox and allowed runtimes.</p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full bg-surface border border-outline-variant/30 rounded-xl" />
          </div>
        ) : config ? (
          <div className="glass-panel p-lg rounded-xl space-y-8">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline-md text-on-surface">Piston Integration</h3>
                  <p className="text-body-sm text-on-surface-variant">Self-hosted remote execution API</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-label-md font-medium text-on-surface-variant">Status:</span>
                <button 
                  onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.is_active ? 'bg-primary' : 'bg-surface-variant'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-2">Proxy URL</label>
                <input 
                  type="text" 
                  value={config.proxy_url}
                  onChange={e => setConfig({ ...config, proxy_url: e.target.value })}
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-lg px-4 py-3 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                  placeholder="https://emkc.org/api/v2/piston"
                />
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-2">Max Execution Time (ms)</label>
                <input 
                  type="number" 
                  value={config.max_execution_time_ms}
                  onChange={e => setConfig({ ...config, max_execution_time_ms: parseInt(e.target.value) || 5000 })}
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-lg px-4 py-3 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                  min={100}
                  max={30000}
                />
                <p className="text-label-sm text-on-surface-variant mt-2 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-tertiary" /> High execution times may cause denial of service.
                </p>
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-4">Allowed Runtimes</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_RUNTIMES.map(rt => {
                    const isActive = config.allowed_runtimes.includes(rt);
                    return (
                      <button
                        key={rt}
                        onClick={() => handleRuntimeToggle(rt)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isActive ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'}`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isActive ? 'bg-primary border-primary' : 'border-outline-variant/60'}`}>
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-on-primary" />}
                        </div>
                        <span className={`font-label-md capitalize ${isActive ? 'font-bold' : ''}`}>{rt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-outline-variant/30 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-on-primary hover:brightness-110 flex items-center gap-2 px-6">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-on-surface-variant glass-panel rounded-xl">No configuration found.</div>
        )}
      </div>
    </AppLayout>
  );
}
