import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RefreshCw, Terminal, Activity, Server, AlertCircle } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  difficulty: string;
  topic: string;
}

export default function AdminCodingProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Scraper Daemon State
  const [scraperStatus, setScraperStatus] = useState<'running' | 'stopped'>('stopped');
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperLogs, setScraperLogs] = useState<string[]>([
    "System initialized.",
    "Waiting for scraper daemon commands..."
  ]);

  useEffect(() => {
    fetchProblems();
    checkScraperStatus();
  }, []);

  const fetchProblems = async () => {
    const { data } = await supabase
      .from('coding_problems')
      .select('id, title, difficulty, topic')
      .order('created_at', { ascending: false });
    if (data) setProblems(data as Problem[]);
    setLoading(false);
  };

  const checkScraperStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/problem-scrape/status');
      if (res.ok) {
        const data = await res.json();
        setScraperStatus(data.status);
      }
    } catch (e) {
      // Backend not running locally
    }
  };

  const handleStartScraper = async () => {
    setScraperLoading(true);
    addLog("Sending START command to Python Daemon...");
    try {
      const res = await fetch('http://localhost:8000/api/v1/problem-scrape/start', { method: 'POST' });
      if (res.ok) {
        setScraperStatus('running');
        toast.success("Problem Scraper Daemon Started");
        addLog("✅ Scraper daemon running in background. Ingesting problems to Supabase...");
      } else {
        throw new Error("API Error");
      }
    } catch (e) {
      toast.error("Failed to start scraper. Is the Python backend running?");
      addLog("❌ Error: Could not connect to Python FastAPI on port 8000.");
    } finally {
      setScraperLoading(false);
    }
  };

  const handleStopScraper = async () => {
    setScraperLoading(true);
    addLog("Sending STOP command to Python Daemon...");
    try {
      const res = await fetch('http://localhost:8000/api/v1/problem-scrape/stop', { method: 'POST' });
      if (res.ok) {
        setScraperStatus('stopped');
        toast.success("Problem Scraper Daemon Stopped");
        addLog("🛑 Scraper daemon terminated safely.");
      } else {
        throw new Error("API Error");
      }
    } catch (e) {
      toast.error("Failed to stop scraper.");
    } finally {
      setScraperLoading(false);
    }
  };

  const addLog = (msg: string) => {
    setScraperLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  return (
    <AppLayout title="Coding Problems & Automation">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Scraper Control Panel */}
        <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <div>
              <h2 className="text-xl font-heading font-bold text-on-surface flex items-center gap-2">
                <Server className="w-5 h-5 text-tertiary" />
                Problem Scraping Engine
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Control the Python-based autonomous scraper daemon to ingest problems into the database.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className={`px-3 py-1 flex items-center gap-2 ${scraperStatus === 'running' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-surface-container'}`}>
                {scraperStatus === 'running' ? (
                  <><Activity className="w-3 h-3 animate-pulse" /> Running</>
                ) : (
                  <><Square className="w-3 h-3" /> Stopped</>
                )}
              </Badge>
            </div>
          </div>
          
          <div className="p-6 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 space-y-4">
              <div className="bg-surface-container rounded-xl p-5 border border-outline-variant space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-on-surface-variant">Daemon Controls</h3>
                {scraperStatus === 'stopped' ? (
                  <Button 
                    className="w-full bg-tertiary hover:bg-tertiary/90 text-white" 
                    onClick={handleStartScraper}
                    disabled={scraperLoading}
                  >
                    {scraperLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Start Scraping Engine
                  </Button>
                ) : (
                  <Button 
                    variant="destructive"
                    className="w-full" 
                    onClick={handleStopScraper}
                    disabled={scraperLoading}
                  >
                    {scraperLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Square className="w-4 h-4 mr-2" />}
                    Stop Engine
                  </Button>
                )}
                <div className="text-xs text-on-surface-variant flex items-start gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Ensure the LearnLoom Python API (`uvicorn app.main:app --port 8000`) is running.
                </div>
              </div>
            </div>
            
            <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-outline-variant overflow-hidden flex flex-col">
              <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Daemon Output Log</span>
              </div>
              <div className="p-4 font-mono text-xs text-green-400 h-48 overflow-y-auto space-y-1">
                {scraperLogs.map((log, i) => (
                  <div key={i} className={i === 0 ? "opacity-100" : "opacity-60"}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Existing Problems Table */}
        <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <div>
              <h2 className="text-xl font-heading font-bold text-on-surface">Imported Problems Database</h2>
              <p className="text-sm text-on-surface-variant mt-1">View and manage problems synced by the scraper.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchProblems}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Difficulty</th>
                <th className="px-6 py-4 font-semibold">Topic</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-on-surface-variant">Loading...</td></tr>
              ) : problems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">
                    No problems imported yet. Start the scraper engine to populate.
                  </td>
                </tr>
              ) : (
                problems.map(problem => (
                  <tr key={problem.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 font-medium">{problem.title}</td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className={
                        problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                        problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-600' :
                        'bg-red-500/10 text-red-500'
                      }>{problem.difficulty}</Badge>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{problem.topic || 'Uncategorized'}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">Delete</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </AppLayout>
  );
}
