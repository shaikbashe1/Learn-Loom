import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Terminal, Save, CheckCircle2, ShieldAlert, Code2, Server } from 'lucide-react';
import { Label } from '@/components/ui/label';

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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full max-w-4xl">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Compiler Settings</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Configure the Piston remote code execution sandbox and allowed runtimes.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="space-y-6 mt-4">
            <Skeleton className="h-[500px] w-full bg-surface-container border border-border-base rounded-2xl" />
          </div>
        ) : config ? (
          <div className="glass-panel p-6 md:p-8 rounded-2xl border border-border-base shadow-sm space-y-8 mt-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>
            
            <div className="flex items-center justify-between border-b border-border-base pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                  <Terminal className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-headline-md text-[20px] font-bold text-text-primary">Piston Integration</h3>
                  <p className="text-[13px] font-medium text-text-secondary mt-1">Self-hosted remote execution API</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold uppercase tracking-wider text-text-secondary">Status:</span>
                  <button 
                    onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${config.is_active ? 'bg-primary' : 'bg-surface-container'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${config.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${config.is_active ? 'bg-success/10 text-success' : 'bg-surface-container text-text-secondary'}`}>
                  {config.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-[13px] font-bold text-text-primary flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-text-secondary" /> Proxy URL
                  </Label>
                  <input 
                    type="text" 
                    value={config.proxy_url}
                    onChange={e => setConfig({ ...config, proxy_url: e.target.value })}
                    className="w-full bg-surface-container border border-border-base rounded-xl px-4 py-3 text-[14px] font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                    placeholder="https://emkc.org/api/v2/piston"
                  />
                </div>

                <div>
                  <Label className="text-[13px] font-bold text-text-primary flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-warning" /> Max Execution Time (ms)
                  </Label>
                  <input 
                    type="number" 
                    value={config.max_execution_time_ms}
                    onChange={e => setConfig({ ...config, max_execution_time_ms: parseInt(e.target.value) || 5000 })}
                    className="w-full bg-surface-container border border-border-base rounded-xl px-4 py-3 text-[14px] font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-warning transition-all shadow-inner"
                    min={100}
                    max={30000}
                  />
                  <p className="text-[11px] font-medium text-text-secondary mt-2 flex items-center gap-1">
                    High execution times may cause denial of service.
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-[13px] font-bold text-text-primary flex items-center gap-2 mb-4">
                  <Code2 className="w-4 h-4 text-text-secondary" /> Allowed Runtimes
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ALL_RUNTIMES.map(rt => {
                    const isActive = config.allowed_runtimes.includes(rt);
                    return (
                      <button
                        key={rt}
                        onClick={() => handleRuntimeToggle(rt)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all shadow-sm ${isActive ? 'bg-primary/5 border-primary shadow-[0_0_10px_rgba(192,193,255,0.2)] text-primary' : 'bg-surface border-border-base text-text-secondary hover:border-text-secondary/30'}`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-primary border-primary' : 'border-border-base'}`}>
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`font-label-md capitalize text-[14px] ${isActive ? 'font-bold' : 'font-medium'}`}>{rt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border-base flex justify-end relative z-10">
              <button onClick={handleSave} disabled={saving} className="bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-all text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed card-lift w-full md:w-auto">
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
                {saving ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-16 text-center glass-panel rounded-2xl border border-border-base shadow-sm mt-4">
             <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
               <Terminal className="w-6 h-6 text-text-secondary" />
             </div>
             <p className="font-headline-md text-[18px] font-bold text-text-primary">No configuration found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
