import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/db/firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { generateAndSaveRoadmap } from '@/lib/roadmapGenerator';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Lock, 
  PlayCircle, 
  Loader2, 
  Trophy, 
  Clock, 
  Target, 
  Trash2, 
  MessageSquare, 
  Bot, 
  X,
  Globe,
  BarChart,
  Cpu,
  Shield,
  Code,
  BookOpen,
  Terminal,
  FileText,
  Sparkles
} from 'lucide-react';
import { AIMentorChat } from '@/components/chat/AIMentorChat';
import type { DBUserRoadmap, DBRoadmapStage, DBRoadmapItem } from '@/types/types';
import { cn } from '@/lib/utils';

const DOMAINS = [
  { id: 'web-development', label: 'Full Stack Web Development', icon: Globe },
  { id: 'data-science', label: 'Data Science & Analytics', icon: BarChart },
  { id: 'ai-ml', label: 'Artificial Intelligence & ML', icon: Cpu },
  { id: 'cybersecurity', label: 'Cybersecurity', icon: Shield },
  { id: 'dsa', label: 'Data Structures & Algorithms', icon: Code },
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
      const q = query(
        collection(db, 'user_roadmaps'),
        where('user_id', '==', user.id),
        orderBy('created_at', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      const roadmaps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DBUserRoadmap[];

      if (roadmaps.length > 0) {
        const rm = roadmaps[0];
        setActiveRoadmap(rm);
        
        const stagesQ = query(
          collection(db, 'roadmap_stages'),
          where('roadmap_id', '==', rm.id),
          orderBy('order_index', 'asc')
        );
        const stagesSnap = await getDocs(stagesQ);
        const stgData = stagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DBRoadmapStage[];

        if (stgData.length > 0) {
          const finalStages = await Promise.all(
            stgData.map(async (s) => {
              const itemsQ = query(collection(db, 'roadmap_items'), where('stage_id', '==', s.id));
              const itemsSnap = await getDocs(itemsQ);
              const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DBRoadmapItem[];
              return { ...s, items };
            })
          );
          setStages(finalStages);
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
      await deleteDoc(doc(db, 'user_roadmaps', activeRoadmap.id));
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
      await updateDoc(doc(db, 'roadmap_items', itemId), { status: 'completed' });
      
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
        await updateDoc(doc(db, 'roadmap_stages', stageId), { status: 'completed' });
        toast.success(`Stage Completed! Earned XP!`);
        
        const currentStageIdx = newStages.findIndex(s => s.id === stageId);
        if (currentStageIdx < newStages.length - 1) {
          const nextStageId = newStages[currentStageIdx + 1].id;
          await updateDoc(doc(db, 'roadmap_stages', nextStageId), { status: 'in_progress' });
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
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] select-none">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-muted-foreground">Loading your personalized journey...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden w-full relative bg-background">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto w-full transition-all duration-300">
          <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-8 pb-20">
            
            {!activeRoadmap ? (
              <div className="max-w-xl mx-auto space-y-8 animate-fade-in mt-6">
                <div className="text-center space-y-3 select-none">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-primary/25">
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Design Your Future</h1>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Our AI will generate a step-by-step learning roadmap tailored to your specific career goals and current skill level.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  
                  <div className="space-y-3 select-none">
                    <label className="text-xs font-bold text-foreground block">1. What is your primary learning domain?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DOMAINS.map(d => {
                        const DomainIcon = d.icon;
                        const isSelected = domain === d.id;
                        return (
                          <button
                            key={d.id}
                            onClick={() => setDomain(d.id)}
                            className={cn(
                              "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all text-xs font-semibold",
                              isSelected 
                                ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm' 
                                : 'border-border text-muted-foreground hover:border-primary/20 hover:bg-muted/35 hover:text-foreground'
                            )}
                          >
                            <DomainIcon className={cn("w-4 h-4 shrink-0", isSelected ? 'text-primary' : 'text-muted-foreground')} />
                            <span>{d.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground block select-none">2. What is your target role or goal?</label>
                    <input 
                      type="text" 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Frontend Developer, Machine Learning Engineer"
                      className="w-full bg-muted/20 border border-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-3 select-none">
                    <label className="text-xs font-bold text-foreground block">3. What is your current skill level?</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['beginner', 'intermediate', 'advanced'] as const).map(level => {
                        const isSelected = difficulty === level;
                        return (
                          <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            className={cn(
                              "py-2.5 rounded-xl border capitalize text-xs font-bold transition-all",
                              isSelected 
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm' 
                                : 'border-border text-muted-foreground hover:border-primary/20 hover:bg-muted/35 hover:text-foreground'
                            )}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={generating || !domain || !role}
                    className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 select-none min-h-[44px]"
                  >
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating AI Roadmap...</> : 'Generate My Roadmap'}
                  </button>

                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in">
                {/* Roadmap Header */}
                <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden select-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold border border-primary/15 text-[9px] uppercase tracking-wider">
                          {activeRoadmap.difficulty}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-secondary/15 text-secondary font-bold border border-secondary/20 text-[9px] uppercase tracking-wider">
                          {activeRoadmap.target_role}
                        </span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">{activeRoadmap.title}</h1>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">{activeRoadmap.description}</p>
                    </div>
                    <div className="flex gap-3 items-center shrink-0">
                      <div className="text-center p-3 rounded-xl bg-muted/40 border border-border min-w-[100px] space-y-1">
                        <Clock className="w-4.5 h-4.5 text-primary/75 mx-auto" />
                        <p className="font-extrabold text-sm text-foreground leading-none">{activeRoadmap.estimated_weeks} Wks</p>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Est. Time</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-muted/40 border border-border min-w-[100px] space-y-1">
                        <Trophy className="w-4.5 h-4.5 text-chart-3 mx-auto" />
                        <p className="font-extrabold text-sm text-foreground leading-none">{stages.filter(s => s.status === 'completed').length} / {stages.length}</p>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Stages</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions Area */}
                  <div className="relative z-10 flex flex-wrap gap-3 mt-6 pt-6 border-t border-border/40">
                    <Button 
                      onClick={() => setShowMentor(true)} 
                      className="flex items-center gap-1.5 px-4 h-9 bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity shadow-sm rounded-xl text-xs"
                    >
                      <Bot className="w-4 h-4" /> Ask AI Mentor
                    </Button>
                    <Button 
                      onClick={handleDeleteRoadmap} 
                      variant="outline"
                      className="flex items-center gap-1.5 px-4 h-9 border border-destructive/30 text-destructive font-bold hover:bg-destructive/10 transition-colors rounded-xl text-xs bg-card"
                    >
                      <Trash2 className="w-4 h-4" /> Generate New
                    </Button>
                  </div>
                </div>

                {/* Stages Timeline */}
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
                  {stages.map((stage, idx) => {
                    const isLocked = stage.status === 'locked';
                    const isCompleted = stage.status === 'completed';
                    const isActive = stage.status === 'in_progress';

                    return (
                      <div key={stage.id} className={cn(
                        "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group",
                        isLocked ? 'opacity-60' : ''
                      )}>
                        {/* Icon */}
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10",
                          isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : isActive 
                              ? 'bg-secondary text-secondary-foreground animate-pulse' 
                              : 'bg-muted border-border text-muted-foreground'
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <PlayCircle className="w-4 h-4" />}
                        </div>

                        {/* Card */}
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3 select-none">
                            <div>
                              <p className={cn(
                                "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                                isCompleted ? 'text-primary' : isActive ? 'text-secondary' : 'text-muted-foreground'
                              )}>
                                Stage {stage.phase_number}
                              </p>
                              <h3 className="text-sm font-bold text-foreground">{stage.title}</h3>
                            </div>
                            <div className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-primary/20">
                              <Trophy className="w-3.5 h-3.5" /> {stage.xp_reward} XP
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{stage.description}</p>

                          <div className="space-y-2">
                            {stage.items.map(item => {
                              const isItemCompleted = item.status === 'completed';
                              return (
                                <div key={item.id} className="flex items-center justify-between bg-muted/20 border border-border rounded-xl p-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {item.item_type === 'course' ? (
                                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                                    ) : item.item_type === 'project' ? (
                                      <Terminal className="w-4 h-4 text-secondary shrink-0" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-primary shrink-0" />
                                    )}
                                    <span className={cn(
                                      "text-xs font-semibold truncate", 
                                      isItemCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                                    )}>
                                      {item.title}
                                    </span>
                                  </div>
                                  {isItemCompleted ? (
                                    <CheckCircle2 className="w-4.5 h-4.5 text-primary shrink-0" />
                                  ) : (
                                    <button 
                                      onClick={() => markItemComplete(item.id, stage.id)}
                                      disabled={isLocked}
                                      className="w-4.5 h-4.5 rounded-full border border-border hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-border/40 flex justify-end select-none">
                            <button 
                              onClick={() => {
                                setMentorPrompt(`Can you suggest additional resources or explain the concepts in Stage ${stage.phase_number}: ${stage.title}?`);
                                setShowMentor(true);
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-primary hover:opacity-85 transition-opacity"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Ask Mentor about this stage
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
          <div className="w-full md:w-[360px] shrink-0 border-l border-border bg-card shadow-xl z-30 flex flex-col animate-fade-in absolute right-0 top-0 bottom-0 md:relative">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/5 select-none">
               <h2 className="text-xs sm:text-sm font-bold flex items-center gap-1.5"><Bot className="w-4.5 h-4.5 text-primary" /> Roadmap Mentor</h2>
               <button 
                 onClick={() => setShowMentor(false)} 
                 className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted/50 transition-colors"
                 title="Close Panel"
               >
                 <X className="w-4.5 h-4.5" />
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
