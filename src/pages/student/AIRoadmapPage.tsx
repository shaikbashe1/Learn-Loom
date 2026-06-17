import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Link, useNavigate } from 'react-router-dom';
import type { RoadmapDomain } from '@/types/types';
import { staticRoadmaps, StaticRoadmap, Phase } from '@/data/roadmaps';

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
  const navigate = useNavigate();

  const handleGenerate = () => {
    if (!selectedDomain) return;
    const data = staticRoadmaps[selectedDomain];
    if (data) {
      setRoadmap(data);
    }
  };

  const handleAskAI = (phase: Phase) => {
    const prompt = `I am currently studying Phase ${phase.phase}: ${phase.title} in the ${roadmap?.title} roadmap. The topics include: ${phase.topics.join(', ')}. Can you help me understand this better?`;
    localStorage.setItem('initial_ai_prompt', prompt);
    navigate('/ai-mentor');
  };

  return (
    <AppLayout title="Learning Roadmap">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-stack-xl">
        
        {!roadmap ? (
          <>
            <section className="w-full max-w-[800px] mx-auto text-center flex flex-col items-center gap-stack-md pt-stack-md relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest border border-border-base text-tertiary font-label-sm text-label-sm mb-2 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                <span>AI Powered Journey</span>
              </div>
              <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-text-primary">What do you want to master?</h1>
              <p className="font-body-lg text-body-lg text-text-secondary max-w-2xl">
                Select a domain to instantly load your curated, structured learning path. Our experts have mapped out the optimal progression.
              </p>
            </section>
            
            <section className="w-full max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {domainOptions.map(domain => (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`text-left p-6 rounded-xl border-2 transition-all duration-200 glass-panel flex flex-col ${
                    selectedDomain === domain.id 
                      ? 'border-primary shadow-[0_0_15px_rgba(37,99,235,0.15)] ring-2 ring-primary/20 scale-[1.02]' 
                      : 'border-border-base hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4 w-full">
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-border-base shadow-sm">
                      <span className={`material-symbols-outlined text-[24px] ${domain.iconColor}`}>{domain.icon}</span>
                    </div>
                    {selectedDomain === domain.id && (
                      <span className="material-symbols-outlined text-[24px] text-primary ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                  </div>
                  <h3 className="font-headline-md text-headline-md text-text-primary mb-1">{domain.label}</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">{domain.weeks}-week curriculum plan</p>
                </button>
              ))}
            </section>

            <section className="w-full max-w-[1000px] mx-auto text-center mt-stack-md">
              <button
                onClick={handleGenerate}
                disabled={!selectedDomain}
                className="px-8 py-4 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-colors active:scale-95 duration-200 flex items-center justify-center gap-2 mx-auto shadow-md disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined">magic_button</span> Generate Path
              </button>
            </section>
          </>
        ) : (
          <>
            {/* Header info for loaded roadmap */}
            <section className="w-full max-w-[1000px] mx-auto glass-panel p-6 rounded-xl border border-border-base shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col justify-between relative overflow-hidden z-10 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary-container/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider mb-2">Selected Domain</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-transparent bg-clip-text bg-gradient-to-r from-primary via-tertiary to-secondary">{roadmap.title}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-text-secondary max-w-2xl">{roadmap.description}</p>
                </div>
                <button
                  onClick={() => { setRoadmap(null); setSelectedDomain(null); }}
                  className="p-2 rounded-full hover:bg-surface-container-high text-text-secondary transition-colors border border-border-base"
                  title="Change Domain"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-surface-bright border border-border-base rounded-full font-label-sm text-label-sm text-text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">schedule</span> {roadmap.estimated_weeks} Weeks Estimated
                </span>
              </div>
            </section>

            {/* Roadmap Timeline */}
            <section className="w-full max-w-[900px] mx-auto relative pt-8 pb-16 z-10">
              <h2 className="font-headline-lg text-headline-lg text-text-primary text-center mb-stack-lg">Your Learning Path</h2>
              
              <div className="relative py-8">
                {/* Center Line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-border-base -translate-x-1/2 z-0 hidden md:block"></div>
                <div className="absolute top-0 bottom-0 left-[24px] w-1 bg-border-base z-0 md:hidden"></div>

                {roadmap.phases.map((phase, index) => {
                  const isEven = index % 2 === 0;
                  // Alternate alignment for desktop
                  return (
                    <div key={phase.phase} className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-16 w-full group">
                      
                      {/* Desktop Left / Mobile Right */}
                      <div className={`w-full md:w-[45%] pl-16 md:pl-0 ${isEven ? 'md:text-right md:pr-8' : 'md:order-3 md:text-left md:pl-8'} relative`}>
                        <div className="relative bg-clip-padding border-2 border-transparent rounded-xl shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg"
                             style={{ background: 'linear-gradient(white, white) padding-box, linear-gradient(90deg, #2563eb, #7d4ce7, #4cd7f6) border-box' }}>
                          <div className="bg-surface rounded-lg p-5">
                            <div className={`flex items-start md:items-center justify-between mb-2 flex-col md:flex-row ${isEven ? 'md:flex-row-reverse' : ''} gap-2`}>
                              <h3 className="font-headline-md text-headline-md text-text-primary">{phase.title}</h3>
                              <span className="px-2 py-1 bg-surface-container-low text-primary font-label-sm text-label-sm rounded-full shrink-0">Week {phase.phase}</span>
                            </div>
                            <p className="font-body-sm text-body-sm text-text-secondary mb-4 text-left">
                              <strong>Topics:</strong> {phase.topics.join(', ')}
                            </p>
                            
                            <div className="space-y-3">
                               <div className="text-left">
                                  <p className="font-label-sm text-label-sm text-text-primary mb-1">Learning Objectives:</p>
                                  <ul className="list-disc list-inside text-body-sm text-text-secondary space-y-1">
                                    {phase.learning_objectives.map((obj, i) => (
                                      <li key={i}>{obj}</li>
                                    ))}
                                  </ul>
                               </div>

                               <div className="flex flex-col gap-2 pt-2 border-t border-border-base">
                                  <div className="flex flex-wrap gap-2">
                                     {phase.assignments && phase.assignments.length > 0 && (
                                       <span className="font-label-sm text-label-sm text-secondary bg-secondary/10 px-2 py-1 rounded flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[14px]">assignment</span> {phase.assignments.length} Assignments
                                       </span>
                                     )}
                                     {phase.practice_questions && phase.practice_questions.length > 0 && (
                                       <span className="font-label-sm text-label-sm text-tertiary bg-tertiary/10 px-2 py-1 rounded flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[14px]">psychology</span> {phase.practice_questions.length} Practice Qs
                                       </span>
                                     )}
                                  </div>
                               </div>
                            </div>
                            
                            <div className="mt-4 flex flex-col gap-2">
                              <button 
                                onClick={() => handleAskAI(phase)}
                                className="w-full py-2 bg-surface-container border border-border-base text-primary font-label-md text-label-md rounded hover:bg-surface-container-high hover:border-primary/30 transition-colors flex items-center justify-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Ask AI Mentor
                              </button>
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* Icon */}
                      <div className={`absolute left-[24px] md:left-1/2 -translate-x-1/2 md:translate-x-[-50%] w-12 h-12 bg-surface text-text-secondary rounded-full flex items-center justify-center z-10 border-4 border-background shadow-md group-hover:bg-primary-container group-hover:text-white transition-colors top-0 md:top-auto`}>
                        <span className="material-symbols-outlined">auto_stories</span>
                      </div>

                      {/* Desktop Spacer */}
                      <div className={`hidden md:block w-[45%] ${isEven ? 'order-3 pl-8' : 'order-1 pr-8'}`}>
                        {/* Empty spacer for zigzag layout */}
                      </div>
                      
                    </div>
                  );
                })}

              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
