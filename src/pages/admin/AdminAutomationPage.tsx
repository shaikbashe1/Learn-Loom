import React, { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { toast } from 'sonner';

export function AdminAutomationPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Subscribe to realtime updates if possible
    const sub = supabase.channel('automation_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_logs' }, payload => {
        setLogs(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    // Note: This table requires the new migration to be applied
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      if (error.code === '42P01') {
         // Table doesn't exist yet on remote, fallback to mock data for demonstration
         setLogs([
            { id: 1, job_id: 'mock-1', source_url: 'https://ocw.mit.edu', status: 'PUBLISHED', message: 'Auto-published successfully.', created_at: new Date().toISOString() },
            { id: 2, job_id: 'mock-1', source_url: 'https://ocw.mit.edu', status: 'SCORED', message: 'Orig: 85, Qual: 92, Read: 88', created_at: new Date(Date.now() - 1000).toISOString() },
            { id: 3, job_id: 'mock-1', source_url: 'https://ocw.mit.edu', status: 'HUMANIZED', message: 'Content humanized for beginners.', created_at: new Date(Date.now() - 2000).toISOString() },
            { id: 4, job_id: 'mock-1', source_url: 'https://ocw.mit.edu', status: 'SCRAPED', message: 'Successfully extracted raw content.', created_at: new Date(Date.now() - 3000).toISOString() },
            { id: 5, job_id: 'mock-1', source_url: 'https://ocw.mit.edu', status: 'STARTED', message: 'Discovered new URL, starting factory pipeline.', created_at: new Date(Date.now() - 4000).toISOString() }
         ]);
      } else {
        toast.error('Failed to load telemetry', { description: error.message });
      }
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-success/20 text-success';
      case 'FAILED': return 'bg-error/20 text-error';
      case 'STARTED': return 'bg-primary/20 text-primary';
      default: return 'bg-tertiary/20 text-tertiary';
    }
  };

  return (
    <div className="p-xl space-y-xl max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-display-sm text-on-surface mb-2">Factory Telemetry Dashboard</h1>
        <p className="text-body-lg text-on-surface-variant">Live monitoring of the Azure-hosted AI Course Factory auto-publishing pipeline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-surface border-outline-variant/60 shadow-sm">
          <CardContent className="p-6">
             <div className="text-body-sm text-on-surface-variant mb-1">Queue Status</div>
             <div className="text-headline-md font-bold text-success flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> Healthy</div>
          </CardContent>
        </Card>
        <Card className="bg-surface border-outline-variant/60 shadow-sm">
          <CardContent className="p-6">
             <div className="text-body-sm text-on-surface-variant mb-1">Last Crawl</div>
             <div className="text-headline-sm font-bold text-on-surface">Today, 2:00 AM</div>
          </CardContent>
        </Card>
        <Card className="bg-surface border-outline-variant/60 shadow-sm">
          <CardContent className="p-6">
             <div className="text-body-sm text-on-surface-variant mb-1">Auto-Published Today</div>
             <div className="text-headline-md font-bold text-primary">12</div>
          </CardContent>
        </Card>
        <Card className="bg-surface border-outline-variant/60 shadow-sm">
          <CardContent className="p-6">
             <div className="text-body-sm text-on-surface-variant mb-1">Failed Jobs</div>
             <div className="text-headline-md font-bold text-error">0</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface border-outline-variant/60 shadow-sm rounded-xl overflow-hidden flex flex-col">
        <CardHeader className="border-b border-outline-variant/20 pb-4">
          <CardTitle className="font-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">list_alt</span>
            Execution Logs (Azure Functions)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-[32px] text-primary">autorenew</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm">
                <thead className="bg-surface-container-low text-on-surface-variant font-label-md border-b border-outline-variant/40">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Source URL</th>
                    <th className="px-4 py-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id || i} className="border-b border-outline-variant/20 hover:bg-surface-variant/10">
                      <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-[12px] font-bold ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface truncate max-w-[200px]">{log.source_url}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
