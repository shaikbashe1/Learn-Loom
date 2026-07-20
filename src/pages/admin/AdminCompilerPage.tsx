import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { db } from '@/db/firebase';
import { collection, doc, getDocs, updateDoc, query, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Terminal, 
  Save, 
  CheckCircle2, 
  ShieldAlert, 
  Code2, 
  Server,
  Loader2
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
    try {
      const q = query(collection(db, 'piston_config'), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        setConfig({ id: docSnap.id, ...docSnap.data() } as PistonConfig);
      }
    } catch (error) {
      toast.error('Failed to load compiler configuration');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'piston_config', config.id), {
        proxy_url: config.proxy_url,
        max_execution_time_ms: config.max_execution_time_ms,
        allowed_runtimes: config.allowed_runtimes,
        is_active: config.is_active,
      });
      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
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
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full max-w-4xl select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Compiler Settings</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Configure the Piston remote code execution sandbox and allowed runtimes.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="space-y-6 mt-4">
            <Skeleton className="h-[450px] w-full bg-muted rounded-3xl" />
          </div>
        ) : config ? (
          <div className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm space-y-8 mt-4 relative overflow-hidden group">
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-border pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Piston Integration</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Self-hosted remote execution API</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status:</span>
                  <button 
                    onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${
                      config.is_active ? 'bg-primary' : 'bg-muted border border-border'
                    }`}
                  >
                    <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-all ${
                      config.is_active ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${
                  config.is_active 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {config.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                    <Server className="w-4 h-4 text-muted-foreground/80" /> 
                    <span>Proxy URL</span>
                  </Label>
                  <input 
                    type="text" 
                    value={config.proxy_url}
                    onChange={e => setConfig({ ...config, proxy_url: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                    placeholder="https://emkc.org/api/v2/piston"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" /> 
                    <span>Max Execution Time (ms)</span>
                  </Label>
                  <input 
                    type="number" 
                    value={config.max_execution_time_ms}
                    onChange={e => setConfig({ ...config, max_execution_time_ms: parseInt(e.target.value) || 5000 })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                    min={100}
                    max={30000}
                  />
                  <p className="text-[10px] font-semibold text-muted-foreground mt-2 flex items-center gap-1">
                    High execution times may cause performance issues.
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-4">
                  <Code2 className="w-4 h-4 text-muted-foreground/80" /> 
                  <span>Allowed Runtimes</span>
                </Label>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ALL_RUNTIMES.map(rt => {
                    const isActive = config.allowed_runtimes.includes(rt);
                    return (
                      <button
                        key={rt}
                        onClick={() => handleRuntimeToggle(rt)}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all shadow-sm 
                          ${
                            isActive 
                              ? 'bg-primary/5 border-primary/50 text-primary' 
                              : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/30'
                          }`}
                      >
                        <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? 'bg-primary border-primary' : 'border-border bg-background'
                        }`}>
                          {isActive && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className={`text-xs capitalize ${isActive ? 'font-bold' : 'font-semibold'}`}>{rt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end relative z-10">
              <Button 
                onClick={handleSave} 
                disabled={saving} 
                className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.99] transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto min-h-[44px]"
              >
                {saving ? (
                  <><Loader2 className="w-4.5 h-4.5 animate-spin" /><span>Saving Changes...</span></>
                ) : (
                  <>
                    <Save className="w-4.5 h-4.5" />
                    <span>Save Settings</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-16 text-center bg-card rounded-3xl border border-border shadow-sm mt-4">
             <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
               <Terminal className="w-6 h-6 text-muted-foreground/40" />
             </div>
             <p className="text-sm font-bold text-foreground">No configuration found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
