import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import type { RoadmapDomain } from '@/types/types';

interface PhaseResource {
  title: string;
  type: 'video' | 'article' | 'book' | 'project';
  url?: string;
}

interface Phase {
  phase: number;
  title: string;
  duration_weeks: number;
  topics: string[];
  resources: PhaseResource[];
  milestone: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface StaticRoadmap {
  id: string;
  domain: string;
  title: string;
  description: string;
  estimated_weeks: number;
  phases: Phase[];
  quiz_questions: QuizQuestion[];
}

const domainOptions = [
  { id: 'data-science' as RoadmapDomain, label: 'Data Science', icon: 'bar_chart', color: 'from-primary/20 to-primary/5', border: 'border-primary/40', iconColor: 'text-primary', weeks: 12 },
  { id: 'web-development' as RoadmapDomain, label: 'Web Development', icon: 'globe', color: 'from-secondary/20 to-secondary/5', border: 'border-secondary/40', iconColor: 'text-secondary', weeks: 16 },
  { id: 'ai-ml' as RoadmapDomain, label: 'AI / ML', icon: 'memory', color: 'from-tertiary/20 to-tertiary/5', border: 'border-tertiary/40', iconColor: 'text-tertiary', weeks: 20 },
  { id: 'cybersecurity' as RoadmapDomain, label: 'Cybersecurity', icon: 'shield', color: 'from-error/20 to-error/5', border: 'border-error/40', iconColor: 'text-error', weeks: 14 },
  { id: 'dsa' as RoadmapDomain, label: 'DSA', icon: 'code', color: 'from-primary-container/20 to-primary-container/5', border: 'border-primary-container/40', iconColor: 'text-primary-container', weeks: 18 },
];

export default function AIRoadmapPage() {
  const [selectedDomain, setSelectedDomain] = useState<RoadmapDomain | null>(null);
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<StaticRoadmap | null>(null);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!selectedDomain) return;
    setLoading(true);
    setRoadmap(null);

    try {
      const { data, error } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('domain', selectedDomain)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Roadmap not found in database. Ensure migrations are applied.');

      setRoadmap(data as StaticRoadmap);
    } catch (err: unknown) {
      console.error('Roadmap loading error:', err);
      toast.error('Failed to load roadmap', {
        description: err instanceof Error ? err.message : 'Please try again in a few moments.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = (phase: Phase) => {
    const prompt = `I am currently studying Phase ${phase.phase}: ${phase.title} in the ${roadmap?.title} roadmap. The topics include: ${phase.topics.join(', ')}. Can you help me understand this better?`;
    // Pass the initial prompt via localStorage or state
    localStorage.setItem('initial_ai_prompt', prompt);
    navigate('/ai-mentor');
  };

  return (
    <AppLayout title="Learning Roadmap">
      <div className="max-w-[1440px] mx-auto space-y-2xl">
        
        {!roadmap ? (
          <div className="space-y-xl">
            <div>
              <h1 className="font-display text-display text-on-surface mb-xs">Learning Roadmap Library</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Select a domain to instantly load your curated, structured learning path.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md md:gap-lg">
              {domainOptions.map(domain => (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`text-left p-xl rounded-xl border-2 transition-all bg-gradient-to-br ${domain.color} ${selectedDomain === domain.id ? domain.border + ' scale-[1.02] shadow-[0_0_15px_rgba(192,193,255,0.15)]' : 'border-outline-variant/40 bg-surface-container-low hover:border-primary/30'}`}
                >
                  <div className="flex items-center gap-md mb-md">
                    <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center border border-outline-variant/30 shadow-sm">
                      <span className={`material-symbols-outlined text-[24px] ${domain.iconColor}`}>{domain.icon}</span>
                    </div>
                    {selectedDomain === domain.id && <span className="material-symbols-outlined text-[24px] text-primary ml-auto">check_circle</span>}
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{domain.label}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{domain.weeks}-week curriculum plan</p>
                </button>
              ))}
            </div>

            <div className="bg-surface-container p-xl rounded-xl border border-outline-variant/60">
              <div className="flex flex-col md:flex-row items-center gap-lg">
                <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="material-symbols-outlined text-[40px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                </div>
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <h3 className="font-headline-md text-headline-md text-on-surface text-balance mb-2">
                    {selectedDomain ? `Load ${domainOptions.find(d => d.id === selectedDomain)?.label} Roadmap` : 'Select a Domain to Begin'}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant text-pretty">
                    Instantly load curated modules, study resources, and milestones carefully prepared by our experts.
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!selectedDomain || loading}
                  className="bg-primary text-on-primary-container px-xl py-sm rounded-lg font-label-md text-label-md hover:brightness-110 transition-all shrink-0 shadow-[0_0_15px_rgba(192,193,255,0.2)] disabled:opacity-50 flex items-center gap-2 h-12"
                >
                  {loading ? (
                    <><span className="material-symbols-outlined text-[20px] animate-spin">sync</span> Loading...</>
                  ) : (
                    <>Load Roadmap <span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
              <div>
                <h1 className="font-display text-display text-on-surface mb-xs leading-tight">{roadmap.title}</h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">{roadmap.description}</p>
                <div className="mt-2 text-sm text-primary font-bold">{roadmap.estimated_weeks} Weeks Estimated</div>
              </div>
              <button
                onClick={() => { setRoadmap(null); setSelectedDomain(null); }}
                className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors border border-outline-variant/60"
                title="Change Domain"
              >
                <span className="material-symbols-outlined text-[20px]">refresh</span>
              </button>
            </div>

            <div className="space-y-lg mt-8">
              {roadmap.phases.map((phase) => (
                <div key={phase.phase} className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-lg md:p-xl transition-all hover:border-primary/40">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary text-on-primary px-3 py-1 rounded-md font-bold text-sm">
                      Week {phase.phase}
                    </div>
                    <h2 className="text-xl font-bold text-on-surface">{phase.title}</h2>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-on-surface-variant mb-2"><strong>Topics:</strong> {phase.topics.join(', ')}</p>
                    <p className="text-on-surface-variant italic text-sm">Milestone: {phase.milestone}</p>
                  </div>

                  {/* Resource Actions */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    {phase.resources?.filter(r => r.type === 'article').map((res, i) => (
                      <a key={`art-${i}`} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-lg hover:border-primary transition-colors text-sm text-on-surface">
                        <span className="material-symbols-outlined text-[18px]">article</span> Notes
                      </a>
                    ))}
                    
                    {phase.resources?.filter(r => r.type === 'video').map((res, i) => (
                      <a key={`vid-${i}`} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-lg hover:border-primary transition-colors text-sm text-on-surface">
                        <span className="material-symbols-outlined text-[18px] text-error">play_circle</span> Videos
                      </a>
                    ))}

                    <Link to={`/quiz/${roadmap.domain}-w${phase.phase}`} className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-lg hover:border-primary transition-colors text-sm text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-primary">quiz</span> Quiz
                    </Link>

                    <button 
                      onClick={() => handleAskAI(phase)}
                      className="flex items-center gap-2 px-4 py-2 bg-tertiary/10 border border-tertiary/30 rounded-lg hover:bg-tertiary/20 transition-colors text-sm text-tertiary font-medium ml-auto"
                    >
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Ask AI Mentor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
