import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { generateAndSaveRoadmap } from '@/lib/roadmapGenerator';
import { toast } from 'sonner';
import { CheckCircle2, Lock, PlayCircle, Loader2, Trophy, Clock, Target, Trash2, MessageSquare, Bot, X } from 'lucide-react';
import { AIMentorChat } from '@/components/chat/AIMentorChat';
import type { DBUserRoadmap, DBRoadmapStage, DBRoadmapItem } from '@/types/types';

const DOMAINS = [
  { id: 'web-development', label: 'Full Stack Web Development', icon: 'globe' },
  { id: 'data-science', label: 'Data Science & Analytics', icon: 'bar_chart' },
  { id: 'ai-ml', label: 'Artificial Intelligence & ML', icon: 'memory' },
  { id: 'cybersecurity', label: 'Cybersecurity', icon: 'shield' },
  { id: 'dsa', label: 'Data Structures & Algorithms', icon: 'code' },
];

export default function AIRoadmapPage() {
  const { user } = useAuth();
  const [activeRoadmap, setActiveRoadmap] = useState<DBUserRoadmap | null>(null);
  const [stages, setStages] = useState<(DBRoadmapStage & { items: DBRoadmapItem[] })[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard State
  const [domain, setDomain] = useState('');
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [generating, setGenerating] = useState(false);

  // Mentor State
  const [showMentor, setShowMentor] = useState(false);
  const [mentorPrompt, setMentorPrompt] = useState('');

  const fetchRoadmap = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: roadmaps } = await supabase
        .from('user_roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (roadmaps && roadmaps.length > 0) {
        const rm = roadmaps[0];
        setActiveRoadmap(rm);
        
        const { data: stgData } = await supabase
          .from('roadmap_stages')
          .select('*, roadmap_items(*)')
          .eq('roadmap_id', rm.id)
          .order('order_index', { ascending: true });

        if (stgData) {
          setStages(stgData.map(s => ({ ...s, items: s.roadmap_items || [] })));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load roadmap.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, [user]);

  const handleGenerate = async () => {
    if (!user || !domain || !role) {
      toast.error('Please complete all fields.');
      return;
    }
    setGenerating(true);
    try {
      await generateAndSaveRoadmap(user.id, domain, role, difficulty);
      toast.success('Your personalized roadmap is ready!');
      await fetchRoadmap();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate roadmap.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteRoadmap = async () => {
    if (!activeRoadmap || !user) return;
    if (!window.confirm('Are you sure? This will permanently delete your current roadmap and progress.')) return;
    
    try {
      await supabase.from('user_roadmaps').delete().eq('id', activeRoadmap.id);
      setActiveRoadmap(null);
      setStages([]);
      toast.success('Roadmap deleted. You can generate a new one.');
    } catch (err) {
      toast.error('Failed to delete roadmap.');
    }
  };

  const markItemComplete = async (itemId: string, stageId: string) => {
    if (!user) return;
    try {
      await supabase.from('roadmap_items').update({ status: 'completed' }).eq('id', itemId);
      
      let allItemsInStageComplete = true;
      const newStages = stages.map(s => {
        if (s.id === stageId) {
          const newItems = s.items.map(i => {
            if (i.id === itemId) return { ...i, status: 'completed' as const };
            if (i.status !== 'completed') allItemsInStageComplete = false;
            return i;
          });
          return { ...s, items: newItems };
        }
        return s;
      });

      if (allItemsInStageComplete) {
        await supabase.from('roadmap_stages').update({ status: 'completed' }).eq('id', stageId);
        toast.success(`Stage Completed! Earned XP!`);
        
        const currentStageIdx = newStages.findIndex(s => s.id === stageId);
        if (currentStageIdx < newStages.length - 1) {
          const nextStageId = newStages[currentStageIdx + 1].id;
          await supabase.from('roadmap_stages').update({ status: 'in_progress' }).eq('id', nextStageId);
          newStages[currentStageIdx].status = 'completed';
          newStages[currentStageIdx + 1].status = 'in_progress';
          toast.success(`Next stage unlocked!`);
        }
      }

      setStages(newStages);
    } catch (err) {
      toast.error('Failed to update progress.');
    }
  };

  if (loading) {
    return (
      <AppLayout title="AI Roadmap">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-on-surface-variant">Loading your personalized journey...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="AI Roadmap">
      <div className="flex h-[calc(100vh-80px)] overflow-hidden w-full relative bg-background">
        
        {/* Main Content Area */}
        <div className={`flex-1 overflow-y-auto w-full transition-all duration-300`}>
          <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-20">
            
            {!activeRoadmap ? (
              <div className="max-w-2xl mx-auto space-y-8 animate-fade-in mt-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-primary/20">
                    <Target className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-4xl font-heading font-bold text-on-surface">Design Your Future</h1>
                  <p className="text-on-surface-variant font-body-lg">Our AI will generate a step-by-step learning roadmap tailored to your specific career goals and current skill level.</p>
                </div>

                <div className="bg-surface border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
                  
                  <div className="space-y-4">
                    <label className="font-label-md font-bold text-on-surface block">1. What is your primary learning domain?</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {DOMAINS.map(d => (
                        <button
                          key={d.id}
                          onClick={() => setDomain(d.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${domain === d.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline-variant/60 hover:bg-surface-variant/50'}`}
                        >
                          <span className="material-symbols-outlined text-primary">{d.icon}</span>
                          <span className="font-label-md text-on-surface">{d.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="font-label-md font-bold text-on-surface block">2. What is your target role or goal?</label>
                    <input 
                      type="text" 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Frontend Developer, Machine Learning Engineer"
                      className="w-full bg-background border border-outline-variant/60 rounded-xl px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="font-label-md font-bold text-on-surface block">3. What is your current skill level?</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`p-3 rounded-xl border capitalize font-label-md transition-all ${difficulty === level ? 'border-primary bg-primary text-on-primary shadow-sm' : 'border-outline-variant/60 text-on-surface-variant hover:bg-surface-variant/50'}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={generating || !domain || !role}
                    className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold font-label-lg shadow-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating AI Roadmap...</> : 'Generate My Roadmap'}
                  </button>

                </div>
              </div>
            ) : (
              <div className="space-y-12 animate-fade-in">
                {/* Roadmap Header */}
                <div className="bg-surface border border-outline-variant rounded-3xl p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm uppercase tracking-wider text-xs font-bold border border-primary/20">
                          {activeRoadmap.difficulty}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary font-label-sm uppercase tracking-wider text-xs font-bold border border-secondary/20">
                          {activeRoadmap.target_role}
                        </span>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-heading font-bold text-on-surface mb-2">{activeRoadmap.title}</h1>
                      <p className="text-on-surface-variant font-body-lg max-w-2xl">{activeRoadmap.description}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="text-center p-4 rounded-2xl bg-background border border-outline-variant/60 min-w-[120px]">
                        <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="font-bold text-xl text-on-surface">{activeRoadmap.estimated_weeks} Wks</p>
                        <p className="text-xs text-on-surface-variant uppercase tracking-wider">Est. Time</p>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-background border border-outline-variant/60 min-w-[120px]">
                        <Trophy className="w-6 h-6 text-secondary mx-auto mb-2" />
                        <p className="font-bold text-xl text-on-surface">{stages.filter(s => s.status === 'completed').length} / {stages.length}</p>
                        <p className="text-xs text-on-surface-variant uppercase tracking-wider">Stages</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions Area */}
                  <div className="relative z-10 flex flex-wrap gap-3 mt-6 pt-6 border-t border-outline-variant/40">
                    <Button 
                      onClick={() => setShowMentor(true)} 
                      className="flex items-center gap-2 px-4 py-2 h-11 bg-primary text-on-primary font-label-md font-bold hover:brightness-110 transition-colors shadow-sm rounded-xl min-h-[44px]"
                    >
                      <Bot className="w-4 h-4" /> Ask AI Mentor
                    </Button>
                    <Button 
                      onClick={handleDeleteRoadmap} 
                      variant="outline"
                      className="flex items-center gap-2 px-4 py-2 h-11 border border-error/40 text-error font-label-md hover:bg-error/10 hover:text-error transition-colors rounded-xl min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4" /> Generate New
                    </Button>
                  </div>
                </div>

                {/* Stages Timeline */}
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant/40 before:to-transparent">
                  {stages.map((stage, idx) => {
                    const isLocked = stage.status === 'locked';
                    const isCompleted = stage.status === 'completed';
                    const isActive = stage.status === 'in_progress';

                    return (
                      <div key={stage.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active ${isLocked ? 'opacity-60' : ''}`}>
                        {/* Icon */}
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10 
                          ${isCompleted ? 'bg-primary text-on-primary' : isActive ? 'bg-secondary text-on-primary animate-pulse' : 'bg-surface-variant text-on-surface-variant'}`}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isLocked ? <Lock className="w-4 h-4" /> : <PlayCircle className="w-5 h-5" />}
                        </div>

                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isCompleted ? 'text-primary' : isActive ? 'text-secondary' : 'text-on-surface-variant'}`}>
                                Stage {stage.phase_number}
                              </p>
                              <h3 className="text-xl font-heading font-bold text-on-surface">{stage.title}</h3>
                            </div>
                            <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold border border-primary/20">
                              <Trophy className="w-3 h-3" /> {stage.xp_reward} XP
                            </div>
                          </div>
                          <p className="text-on-surface-variant font-body-sm mb-6">{stage.description}</p>

                          <div className="space-y-3">
                            {stage.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-background border border-outline-variant/60 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                  <span className={`material-symbols-outlined text-lg ${item.item_type === 'project' ? 'text-secondary' : 'text-primary'}`}>
                                    {item.item_type === 'course' ? 'play_lesson' : item.item_type === 'project' ? 'code_blocks' : 'article'}
                                  </span>
                                  <span className={`font-label-md ${item.status === 'completed' ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                                    {item.title}
                                  </span>
                                </div>
                                {item.status === 'completed' ? (
                                  <CheckCircle2 className="w-5 h-5 text-primary" />
                                ) : (
                                  <button 
                                    onClick={() => markItemComplete(item.id, stage.id)}
                                    disabled={isLocked}
                                    className="w-6 h-6 rounded-full border-2 border-outline-variant hover:border-primary flex items-center justify-center transition-colors disabled:opacity-50"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-outline-variant/20 flex justify-end">
                            <button 
                              onClick={() => {
                                setMentorPrompt(`Can you suggest additional resources or explain the concepts in Stage ${stage.phase_number}: ${stage.title}?`);
                                setShowMentor(true);
                              }}
                              className="flex items-center gap-2 text-sm font-label-md text-primary hover:text-primary/80 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" /> Ask Mentor about this stage
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* AI Mentor Slide-over Panel */}
        {showMentor && (
          <div className="w-full md:w-[400px] shrink-0 border-l border-outline-variant/40 bg-surface shadow-xl z-30 flex flex-col animate-fade-in absolute right-0 top-0 bottom-0 md:relative">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant/40 bg-surface-container">
               <h2 className="font-heading font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Roadmap Mentor</h2>
               <button 
                 onClick={() => setShowMentor(false)} 
                 className="text-on-surface-variant hover:text-on-surface w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
                 title="Close Panel"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
            <div className="flex-1 overflow-hidden relative bg-background">
              <AIMentorChat isWidget externalPrompt={mentorPrompt} onExternalPromptHandled={() => setMentorPrompt('')} />
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
