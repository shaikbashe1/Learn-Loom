import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Link } from 'react-router-dom';
import type { RoadmapDomain } from '@/types/types';
import { staticRoadmaps, StaticRoadmap, Phase } from '@/data/roadmaps';
import { AIMentorChat } from '@/components/chat/AIMentorChat';

const domainOptions = [
  { id: 'data-science' as RoadmapDomain, label: 'Data Science', icon: 'bar_chart', color: 'from-primary/20 to-primary/5', border: 'border-primary/40', iconColor: 'text-primary', weeks: 12 },
  { id: 'web-development' as RoadmapDomain, label: 'Web Development', icon: 'globe', color: 'from-secondary/20 to-secondary/5', border: 'border-secondary/40', iconColor: 'text-secondary', weeks: 16 },
  { id: 'ai-ml' as RoadmapDomain, label: 'AI / ML', icon: 'memory', color: 'from-tertiary/20 to-tertiary/5', border: 'border-tertiary/40', iconColor: 'text-tertiary', weeks: 20 },
  { id: 'cybersecurity' as RoadmapDomain, label: 'Cybersecurity', icon: 'shield', color: 'from-error/20 to-error/5', border: 'border-error/40', iconColor: 'text-error', weeks: 14 },
  { id: 'dsa' as RoadmapDomain, label: 'DSA', icon: 'code', color: 'from-primary-container/20 to-primary-container/5', border: 'border-primary-container/40', iconColor: 'text-primary-container', weeks: 18 },
];

export default function AIRoadmapPage() {
  const [selectedDomain, setSelectedDomain] = useState<RoadmapDomain | null>(null);
  const [roadmap, setRoadmap] = useState<StaticRoadmap | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>(undefined);

  const handleGenerate = () => {
    if (!selectedDomain) return;
    const data = staticRoadmaps[selectedDomain];
    if (data) setRoadmap(data);
  };

  const handleAskAI = (phase: Phase) => {
    const prompt = `I am currently studying Phase ${phase.phase}: ${phase.title} in the ${roadmap?.title} roadmap. The topics include: ${phase.topics.join(', ')}. Can you help me understand this better?`;
    setChatPrompt(prompt);
    setChatOpen(true);
  };

  const handleFloatingAIClick = () => {
    if (!chatOpen) {
      if (roadmap) {
        setChatPrompt(`I am studying the ${roadmap.title} roadmap. I have a general question.`);
      } else {
        setChatPrompt(undefined);
      }
    }
    setChatOpen(!chatOpen);
  };

  return (
    <AppLayout title="Learning Roadmap">
      <div className="max-w-[1440px] mx-auto space-y-2xl pb-32">
        
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
                  disabled={!selectedDomain}
                  className="bg-primary text-on-primary-container px-xl py-sm rounded-lg font-label-md text-label-md hover:brightness-110 transition-all shrink-0 shadow-[0_0_15px_rgba(192,193,255,0.2)] disabled:opacity-50 flex items-center gap-2 h-12"
                >
                  Load Roadmap <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
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
                <div className="mt-2 text-sm text-primary font-bold">{roadmap.estimated_weeks} Weeks Estimated Curriculum</div>
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
                <div key={phase.phase} className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-lg md:p-xl transition-all hover:border-primary/40 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-primary text-on-primary px-3 py-1 rounded-md font-bold text-sm">
                        Week {phase.phase}
                      </div>
                      <h2 className="text-xl font-bold text-on-surface">{phase.title}</h2>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-on-surface-variant"><strong>Topics:</strong> {phase.topics.join(', ')}</p>
                      
                      <div>
                        <p className="text-on-surface-variant font-bold text-sm mb-1">Learning Objectives:</p>
                        <ul className="list-disc list-inside text-sm text-on-surface-variant/90 space-y-1">
                          {phase.learning_objectives.map((obj, i) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>

                      {phase.assignments && phase.assignments.length > 0 && (
                        <div className="mt-4 p-3 bg-secondary/10 border border-secondary/20 rounded-lg">
                          <p className="text-secondary font-bold text-sm mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">assignment</span> Assignments:
                          </p>
                          <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1">
                            {phase.assignments.map((ass, i) => (
                              <li key={i}>{ass}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {phase.practice_questions && phase.practice_questions.length > 0 && (
                        <div className="mt-2 p-3 bg-tertiary/10 border border-tertiary/20 rounded-lg">
                          <p className="text-tertiary font-bold text-sm mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">psychology</span> Practice Questions:
                          </p>
                          <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1">
                            {phase.practice_questions.map((pq, i) => (
                              <li key={i}>{pq}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 border-t border-outline-variant/30 pt-3">
                        <p className="text-primary italic text-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">flag</span> Milestone: {phase.milestone}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:w-48 shrink-0">
                    {phase.resources?.filter(r => r.type === 'article').map((res, i) => (
                      <a key={`art-${i}`} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 bg-surface border border-outline-variant rounded-lg hover:border-primary transition-colors text-sm text-on-surface w-full">
                        <span className="material-symbols-outlined text-[20px] text-primary">article</span> Notes
                      </a>
                    ))}
                    
                    {phase.resources?.filter(r => r.type === 'video').map((res, i) => (
                      <a key={`vid-${i}`} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 bg-surface border border-outline-variant rounded-lg hover:border-error transition-colors text-sm text-on-surface w-full">
                        <span className="material-symbols-outlined text-[20px] text-error">play_circle</span> Videos
                      </a>
                    ))}

                    <Link to={`/quiz/${roadmap.domain}-w${phase.phase}`} className="flex items-center gap-2 px-4 py-3 bg-surface border border-outline-variant rounded-lg hover:border-secondary transition-colors text-sm text-on-surface w-full">
                      <span className="material-symbols-outlined text-[20px] text-secondary">quiz</span> Quiz
                    </Link>

                    <button 
                      onClick={() => handleAskAI(phase)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-tertiary text-on-tertiary rounded-lg hover:brightness-110 transition-all font-bold mt-auto w-full"
                    >
                      <span className="material-symbols-outlined text-[20px]">auto_awesome</span> Ask AI Mentor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating AI Mentor Widget */}
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none ${chatOpen ? 'h-[600px] max-h-[80vh] w-[400px] max-w-[calc(100vw-48px)]' : 'w-auto h-auto'}`}>
        {/* Chat Panel */}
        <div className={`w-full h-full bg-surface-container-low border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 pointer-events-auto flex flex-col ${chatOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8 absolute bottom-20'}`}>
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">smart_toy</span>
              <span className="font-bold text-on-surface">Loomie Mentor</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-full hover:bg-surface-variant">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative bg-surface">
            <AIMentorChat externalPrompt={chatPrompt} onExternalPromptHandled={() => setChatPrompt(undefined)} isWidget={true} />
          </div>
        </div>

        {/* Floating Action Button */}
        <button 
          onClick={handleFloatingAIClick}
          className="w-14 h-14 rounded-full bg-tertiary text-on-tertiary shadow-[0_8px_30px_rgba(255,180,168,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto shrink-0 relative z-50"
        >
          <span className="material-symbols-outlined text-[28px]">{chatOpen ? 'keyboard_arrow_down' : 'auto_awesome'}</span>
        </button>
      </div>
    </AppLayout>
  );
}
