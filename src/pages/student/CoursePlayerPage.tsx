import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseModuleProgress, completeModule, getEnrollment } from '@/lib/progress';
import { logUserActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/sanitize';
import { buildYouTubeEmbedUrl } from '@/lib/youtube';
import type { DBCourse, DBModule, DBModuleProgress, DBQuiz, DBQuizAttempt } from '@/types/types';

type ModuleWithStatus = DBModule & {
  status: 'locked' | 'unlocked' | 'completed';
  quizzes?: DBQuiz[];
  codingId?: string | null;
  passedQuizzes?: string[];
  codingPassed?: boolean;
};

export default function CoursePlayerPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<DBCourse | null>(null);
  const [modules, setModules] = useState<ModuleWithStatus[]>([]);
  const [activeModule, setActiveModule] = useState<ModuleWithStatus | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseDone, setCourseDone] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [moduleQuizId, setModuleQuizId] = useState<string | null>(null);
  const [hasCodingQuestions, setHasCodingQuestions] = useState(false);

  // AI Learning Assistant state
  const [aiTutorOpen, setAiTutorOpen] = useState(false);
  const [aiTutorResponse, setAiTutorResponse] = useState('');
  const [aiTutorLoading, setAiTutorLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!courseId || !user) return;

    const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (!courseData) { navigate('/courses'); return; }
    setCourse(courseData);

    const { data: mods } = await supabase.from('course_modules').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
    const moduleList: DBModule[] = mods ?? [];

    const enrollment = await getEnrollment(user.id, courseId);
    if (!enrollment) { navigate(`/courses/${courseId}`); return; }

    setProgressPercent(enrollment.progress_percent);
    if (enrollment.completed_at) setCourseDone(true);

    const { count: codingCount } = await supabase
      .from('coding_questions')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId);
    setHasCodingQuestions((codingCount ?? 0) > 0);

    const progRows: DBModuleProgress[] = await getCourseModuleProgress(user.id, courseId);
    const statusMap = new Map(progRows.map(p => [p.module_id, p.status]));

    const enriched: ModuleWithStatus[] = moduleList.map(m => ({
      ...m,
      status: statusMap.get(m.id) ?? 'locked',
    }));
    setModules(enriched);

    const lastMod = enriched.find(m => m.id === enrollment.last_module_id);
    const firstUnlocked = enriched.find(m => m.status === 'unlocked');
    const currentActive = lastMod ?? firstUnlocked ?? enriched[0] ?? null;
    setActiveModule(currentActive);

    if (currentActive) {
      // Load all quizzes for this module
      const { data: qData } = await supabase.from('quizzes').select('*').eq('module_id', currentActive.id).order('quiz_type');
      
      // Load coding assessment for this module
      const { data: cData } = await supabase.from('coding_questions').select('id').eq('module_id', currentActive.id).maybeSingle();
      
      currentActive.quizzes = qData || [];
      currentActive.codingId = cData?.id || null;

      // Check which are passed
      const qIds = currentActive.quizzes.map((q: DBQuiz) => q.id);
      if (qIds.length > 0) {
        const { data: attempts } = await supabase.from('quiz_attempts').select('quiz_id, passed').in('quiz_id', qIds).eq('user_id', user.id).eq('passed', true);
        currentActive.passedQuizzes = (attempts || []).map((a: { quiz_id: string; passed: boolean }) => a.quiz_id);
      } else {
        currentActive.passedQuizzes = [];
      }

      // Check if coding is passed
      if (currentActive.codingId) {
         const { data: cAtt } = await supabase.from('assessment_attempts').select('is_passed').eq('user_id', user.id).eq('module_id', currentActive.id).eq('is_passed', true).maybeSingle();
         currentActive.codingPassed = !!cAtt?.is_passed;
      }
    }

    setLoading(false);
  }, [courseId, user, navigate]);

  // Load quizzes when active module changes
  useEffect(() => {
    if (!activeModule) return;
    loadData(); // Re-run load data to get the new active module's details
  }, [activeModule?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleComplete = async () => {
    if (!user || !activeModule || !courseId) return;
    if (activeModule.status === 'completed') return;
    setCompleting(true);

    const { error, isCourseDone } = await completeModule(user.id, courseId, activeModule.id);
    if (error) {
      toast.error('Failed to save progress', { description: error });
      setCompleting(false);
      return;
    }

    toast.success(isCourseDone ? 'Course completed!' : 'Module completed — next one unlocked!');
    void logUserActivity(user.id, 'module_completed', `Completed module: ${activeModule.title}`);
    
    if (isCourseDone) {
      setCourseDone(true);
      void logUserActivity(user.id, 'course_completed', `Completed course: ${course?.title}`);
    }

    await loadData();
    setCompleting(false);
  };

  const canAccess = (mod: ModuleWithStatus) => mod.status !== 'locked';

  const askAiTutor = async (action: 'simplify' | 'explain' | 'example') => {
    if (!activeModule) return;
    setAiTutorOpen(true);
    setAiTutorLoading(true);
    try {
      const promptMap = {
        simplify: 'Please simplify the core concepts of this module for a beginner.',
        explain: 'Please explain this module in more depth with step-by-step reasoning.',
        example: 'Please provide a real-world example applying the concepts of this module.'
      };
      // In a real implementation this would hit an API endpoint that has the Gemini key
      // For demo purposes within the strict time constraints, we'll hit the ai-roadmap endpoint with a tailored prompt
      const res = await fetch('/api/ai-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: activeModule.title, role: promptMap[action], difficulty: 'Beginner' })
      });
      if (!res.ok) throw new Error('Failed to reach AI Tutor');
      const data = await res.json();
      setAiTutorResponse(data.description || data.title || JSON.stringify(data));
    } catch (err: any) {
      setAiTutorResponse(`Sorry, I couldn't process that request: ${err.message}`);
    } finally {
      setAiTutorLoading(false);
    }
  };

  if (loading) return (
    <AppLayout title="Course Player">
      <div className="flex-1 flex justify-center items-center h-full">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">autorenew</span>
      </div>
    </AppLayout>
  );

  const completedCount = modules.filter(m => m.status === 'completed').length;

  return (
    <AppLayout title={course?.title ?? 'Course Player'} noPadding>
      <div className="flex-1 flex w-full h-[calc(100vh-80px)] overflow-hidden bg-background">
        
        {/* Left Sidebar: Curriculum */}
        <aside className="w-80 bg-surface border-r border-border-base flex flex-col h-full z-10 shrink-0 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="p-6 border-b border-border-base/50">
            <Link to={`/courses/${courseId}`} className="flex items-center gap-2 text-text-secondary font-label-sm text-label-sm mb-2 uppercase tracking-widest hover:text-primary transition-colors w-fit">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Course Overview</span>
            </Link>
            <h1 className="font-headline-sm text-headline-sm font-bold text-text-primary leading-tight line-clamp-2" title={course?.title}>{course?.title ?? 'Course Player'}</h1>
            <div className="mt-4">
              <div className="flex justify-between items-end mb-1">
                <span className="font-label-sm text-label-sm text-text-secondary">Progress</span>
                <span className="font-label-sm text-label-sm font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary via-secondary-fixed-dim to-tertiary-container rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {modules.map((mod, idx) => {
              const isActive = mod.id === activeModule?.id;
              
              if (mod.status === 'completed') {
                return (
                  <button key={mod.id} onClick={() => setActiveModule(mod)} className={`w-full flex flex-col gap-1 p-3 rounded-xl transition-colors text-left ${isActive ? 'bg-primary-fixed/20 border border-primary/30 shadow-sm' : 'hover:bg-surface-container-low border border-transparent'}`}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="material-symbols-outlined text-success shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className={`font-label-md text-label-md font-semibold truncate ${isActive ? 'text-primary' : 'text-text-primary'}`}>{idx + 1}. {mod.title}</span>
                      </div>
                    </div>
                  </button>
                );
              }
              
              if (isActive || mod.status === 'unlocked') {
                return (
                  <button key={mod.id} onClick={() => setActiveModule(mod)} className={`w-full flex flex-col gap-1 p-3 rounded-xl transition-colors text-left ${isActive ? 'bg-primary-fixed/20 border border-primary/30 shadow-sm' : 'hover:bg-surface-container-low border border-transparent'}`}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className={`material-symbols-outlined shrink-0 ${isActive ? 'text-primary' : 'text-text-secondary'}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>play_circle</span>
                        <span className={`font-label-md text-label-md font-semibold truncate ${isActive ? 'text-primary' : 'text-text-primary'}`}>{idx + 1}. {mod.title}</span>
                      </div>
                    </div>
                  </button>
                );
              }
              
              // Locked
              return (
                <div key={mod.id} className="w-full flex flex-col gap-1 p-3 rounded-xl border border-border-base/50 bg-surface opacity-75">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="material-symbols-outlined text-text-secondary shrink-0">lock</span>
                      <span className="font-label-md text-label-md font-semibold text-text-secondary truncate">{idx + 1}. {mod.title}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center: Video Player & Content */}
        <section className="flex-1 flex flex-col h-full bg-background overflow-y-auto relative">
          
          {/* Video Container Area */}
          <div className="w-full bg-black relative flex-shrink-0 flex items-center justify-center min-h-[400px] max-h-[716px] border-b border-border-base">
            {(() => {
              const videoUrl = activeModule?.content_url || activeModule?.youtube_url || null;
              if (!videoUrl) return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-low text-text-primary">
                  <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">menu_book</span>
                  <p className="font-body-md text-text-secondary">No video for this module</p>
                </div>
              );
              const embedUrl = buildYouTubeEmbedUrl(videoUrl);
              const videoId = embedUrl?.match(/embed\/([a-zA-Z0-9_-]{11})/)?.[1];
              const cleanWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl;
              
              return (
                <div className="w-full h-full relative group">
                  {/* Top title bar overlay */}
                  <div className="absolute top-0 left-0 w-full bg-gradient-to-b from-black/80 to-transparent p-6 flex items-start justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                    <h2 className="text-white font-headline-md text-headline-md font-bold drop-shadow-md truncate pr-4 pointer-events-auto">{activeModule?.title}</h2>
                    <a href={cleanWatchUrl} target="_blank" rel="noopener noreferrer" className="bg-surface/20 hover:bg-surface/30 backdrop-blur-md text-white p-2 rounded-full transition-colors pointer-events-auto shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                    </a>
                  </div>

                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={activeModule?.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-surface-container-low text-text-primary">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant">smart_display</span>
                      <p className="font-body-sm text-text-secondary">Unable to load video</p>
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="font-label-sm text-primary underline">Watch on YouTube</a>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Content Area Below Video */}
          <div className="max-w-4xl w-full mx-auto p-8 pb-32">
            {activeModule && (
              <>
                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex items-center justify-between">
                    <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary">{activeModule.title}</h1>
                    {activeModule.status === 'completed' && (
                      <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-primary/30 bg-primary-fixed/30 text-primary font-label-md text-label-md font-bold shrink-0">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Completed
                      </div>
                    )}
                  </div>
                  
                  {/* Strict Learning Locks UI */}
                  {activeModule.status !== 'completed' && !courseDone && (
                     <div className="bg-surface-container-low border border-border-base rounded-xl p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-text-primary text-[16px] flex items-center gap-2">
                           <span className="material-symbols-outlined text-tertiary">lock</span> Module Requirements
                        </h3>
                        <div className="flex flex-wrap gap-4">
                           {/* Render Quiz 1 if exists */}
                           {activeModule.quizzes?.find((q: DBQuiz) => q.quiz_type === 'quiz_1') && (() => {
                              const q = activeModule.quizzes.find((q: DBQuiz) => q.quiz_type === 'quiz_1')!;
                              const passed = activeModule.passedQuizzes?.includes(q.id);
                              return (
                                 <Link to={`/quiz/${q.id}`} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${passed ? 'bg-success/20 text-success border border-success/30 pointer-events-none' : 'bg-primary text-on-primary hover:brightness-110'}`}>
                                    <span className="material-symbols-outlined text-[18px]">{passed ? 'check_circle' : 'quiz'}</span>
                                    {passed ? 'Quiz 1 Passed' : 'Take Quiz 1'}
                                 </Link>
                              );
                           })()}

                           {/* Render Quiz 2 if exists (Locked behind Quiz 1) */}
                           {activeModule.quizzes?.find((q: DBQuiz) => q.quiz_type === 'quiz_2') && (() => {
                              const q1 = activeModule.quizzes.find((q: DBQuiz) => q.quiz_type === 'quiz_1');
                              const q2 = activeModule.quizzes.find((q: DBQuiz) => q.quiz_type === 'quiz_2')!;
                              const q1Passed = !q1 || activeModule.passedQuizzes?.includes(q1.id);
                              const passed = activeModule.passedQuizzes?.includes(q2.id);
                              
                              if (!q1Passed) {
                                return (
                                   <div className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm border border-border-base bg-surface text-text-secondary opacity-60 cursor-not-allowed">
                                      <span className="material-symbols-outlined text-[18px]">lock</span> Quiz 2 (Locked)
                                   </div>
                                );
                              }
                              return (
                                 <Link to={`/quiz/${q2.id}`} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${passed ? 'bg-success/20 text-success border border-success/30 pointer-events-none' : 'bg-tertiary text-on-tertiary hover:brightness-110'}`}>
                                    <span className="material-symbols-outlined text-[18px]">{passed ? 'check_circle' : 'psychology'}</span>
                                    {passed ? 'Quiz 2 Passed' : 'Take Quiz 2 (Scenario)'}
                                 </Link>
                              );
                           })()}

                           {/* Render Coding Assessment if exists (Locked behind Quiz 2) */}
                           {activeModule.codingId && (() => {
                              const q2 = activeModule.quizzes?.find((q: DBQuiz) => q.quiz_type === 'quiz_2');
                              const q2Passed = !q2 || activeModule.passedQuizzes?.includes(q2.id);
                              const passed = activeModule.codingPassed;

                              if (!q2Passed) {
                                return (
                                   <div className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm border border-border-base bg-surface text-text-secondary opacity-60 cursor-not-allowed">
                                      <span className="material-symbols-outlined text-[18px]">lock</span> Coding Test (Locked)
                                   </div>
                                );
                              }
                              return (
                                 <Link to={`/courses/${courseId}/coding-assessment?moduleId=${activeModule.id}`} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${passed ? 'bg-success/20 text-success border border-success/30 pointer-events-none' : 'bg-secondary text-on-secondary hover:brightness-110'}`}>
                                    <span className="material-symbols-outlined text-[18px]">{passed ? 'check_circle' : 'code'}</span>
                                    {passed ? 'Coding Passed' : 'Take Coding Test'}
                                 </Link>
                              );
                           })()}

                           {/* Complete Module Button (Locked behind all others) */}
                           {(() => {
                              const q1 = activeModule.quizzes?.find((q: DBQuiz) => q.quiz_type === 'quiz_1');
                              const q2 = activeModule.quizzes?.find((q: DBQuiz) => q.quiz_type === 'quiz_2');
                              const q1Passed = !q1 || activeModule.passedQuizzes?.includes(q1.id);
                              const q2Passed = !q2 || activeModule.passedQuizzes?.includes(q2.id);
                              const codingPassed = !activeModule.codingId || activeModule.codingPassed;
                              
                              const allPassed = q1Passed && q2Passed && codingPassed;

                              return (
                                 <button 
                                   onClick={handleComplete} 
                                   disabled={completing || !allPassed} 
                                   className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white ml-auto"
                                 >
                                    {completing ? <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> : <span className="material-symbols-outlined text-[18px]">{allPassed ? 'arrow_forward' : 'lock'}</span>}
                                    {allPassed ? 'Mark Complete & Continue' : 'Finish requirements to unlock'}
                                 </button>
                              );
                           })()}
                        </div>
                     </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-8 border-b border-border-base mb-8">
                  <button onClick={() => setActiveTab('overview')} className={`pb-4 font-label-md text-label-md font-bold transition-colors ${activeTab === 'overview' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}>Overview & Notes</button>
                  <button onClick={() => setActiveTab('resources')} className={`pb-4 font-label-md text-label-md transition-colors ${activeTab === 'resources' ? 'text-primary border-b-2 border-primary font-bold' : 'text-text-secondary hover:text-text-primary font-bold'}`}>Resources</button>
                  <button onClick={() => setActiveTab('discussion')} className={`pb-4 font-label-md text-label-md transition-colors ${activeTab === 'discussion' ? 'text-primary border-b-2 border-primary font-bold' : 'text-text-secondary hover:text-text-primary font-bold'}`}>Discussion</button>
                </div>

                {/* Tab Content */}
                <div className="space-y-8">
                  {activeTab === 'overview' && (
                    <div className="prose prose-slate max-w-none font-body-lg text-body-lg text-text-primary">
                      {activeModule.learning_objectives && (
                        <div className="mb-6 p-6 bg-surface-container-lowest border border-border-base rounded-2xl shadow-sm">
                          <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined">flag</span> Learning Objectives
                          </h3>
                          <div className="whitespace-pre-wrap">{activeModule.learning_objectives}</div>
                        </div>
                      )}

                      {activeModule.content && (
                        <div className="mb-8" dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeModule.content) }} />
                      )}
                      {!activeModule.content && (
                        <div className="mb-4 whitespace-pre-wrap">{activeModule.description}</div>
                      )}

                      {/* Rich Elements (Concepts, Use Cases, Examples, Summary) */}
                      {activeModule.key_concepts && activeModule.key_concepts.length > 0 && (
                        <div className="mt-8 mb-6 p-6 bg-surface-container-lowest border border-border-base rounded-2xl shadow-sm">
                          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">rocket_launch</span> Key Concepts
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeModule.key_concepts.map((concept, index) => (
                              <div key={index} className="p-4 bg-surface border border-border-base rounded-xl flex items-start gap-3 hover:shadow-md transition-shadow">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                                  {index + 1}
                                </div>
                                <span className="font-body-md text-text-primary mt-1">{concept}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeModule.real_world_use_cases && activeModule.real_world_use_cases.length > 0 && (
                        <div className="mb-6 p-6 bg-surface-container-lowest border border-border-base rounded-2xl shadow-sm">
                          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">architecture</span> Real-World Use Cases
                          </h3>
                          <div className="space-y-3">
                            {activeModule.real_world_use_cases.map((useCase, index) => (
                              <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
                                <span className="font-body-md text-text-primary">{useCase}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeModule.examples && activeModule.examples.length > 0 && (
                        <div className="mb-6 p-6 bg-surface-container-lowest border border-border-base rounded-2xl shadow-sm">
                          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">terminal</span> Examples & Walkthroughs
                          </h3>
                          <div className="space-y-4">
                            {activeModule.examples.map((example, index) => (
                              <div key={index} className="prose prose-slate max-w-none bg-surface border border-border-base rounded-xl p-5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(example) }} />
                            ))}
                          </div>
                        </div>
                      )}

                      {activeModule.summary && (
                        <div className="mb-6 p-6 bg-primary/10 border border-primary/20 rounded-2xl shadow-sm">
                          <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">summarize</span> Module Summary
                          </h3>
                          <p className="font-body-md text-text-primary whitespace-pre-wrap">{activeModule.summary}</p>
                        </div>
                      )}
                      
                      {courseDone ? (
                        <div className="bg-primary/10 p-6 rounded-2xl border-2 border-primary/20 my-6 shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left mt-8">
                          <span className="material-symbols-outlined text-[48px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                          <div className="flex-1">
                            <h4 className="font-headline-sm text-headline-sm font-bold text-primary mb-1">Course Certified!</h4>
                            <p className="font-body-sm text-text-primary mb-4 sm:mb-0">Congratulations! You've passed all validation assessments and earned your certificate of completion.</p>
                          </div>
                          <Link to="/certificates" className="px-6 py-2.5 bg-primary text-on-primary rounded-full font-label-sm font-bold shadow-md hover:shadow-lg shrink-0 transition-all hover:-translate-y-0.5 text-center flex items-center gap-2 justify-center">
                             <span className="material-symbols-outlined text-[18px]">verified</span> View Certificate
                          </Link>
                        </div>
                      ) : (
                        progressPercent === 100 && (
                          <div className="bg-surface-bright p-6 rounded-2xl border border-border-base my-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left mt-8">
                            <span className="material-symbols-outlined text-[40px] text-primary">school</span>
                            <div className="flex-1">
                              <h4 className="font-headline-sm text-headline-sm font-bold text-primary mb-1">Modules Finished!</h4>
                              <p className="font-body-sm text-text-secondary mb-4 sm:mb-0">You've completed all modules. Complete the final assessment(s) below to validate your learning and unlock your certificate.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Link to={`/courses/${courseId}/assessment`} className="px-6 py-2.5 bg-primary text-on-primary rounded-full font-label-sm font-bold shadow-md hover:shadow-lg shrink-0 transition-all hover:-translate-y-0.5 text-center flex items-center gap-2 justify-center">
                                 <span className="material-symbols-outlined text-[18px]">quiz</span> MCQ Exam
                              </Link>
                              {hasCodingQuestions && (
                                <Link to={`/courses/${courseId}/coding-assessment`} className="px-6 py-2.5 bg-surface text-primary border border-primary rounded-full font-label-sm font-bold shadow-sm hover:bg-primary/5 shrink-0 transition-all hover:-translate-y-0.5 text-center flex items-center gap-2 justify-center">
                                   <span className="material-symbols-outlined text-[18px]">code</span> Coding Exam
                                </Link>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'resources' && (
                    <div className="flex flex-col gap-4">
                      <p className="font-body-md text-text-secondary">Resources and references for this module.</p>
                      {activeModule.notes_url && (
                        <a href={activeModule.notes_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 rounded-xl border border-border-base bg-surface hover:shadow-md transition-shadow group cursor-pointer">
                          <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
                            <span className="material-symbols-outlined text-[24px]">description</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-label-md text-label-md font-bold text-text-primary group-hover:text-primary transition-colors">Module Notes (PDF)</h4>
                            <p className="font-label-sm text-label-sm text-text-secondary">Downloadable study material</p>
                          </div>
                          <span className="material-symbols-outlined text-text-secondary group-hover:text-primary transition-colors">download</span>
                        </a>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'discussion' && (
                    <div className="text-center py-xl">
                      <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">forum</span>
                      <h4 className="font-headline-sm text-headline-sm font-bold text-text-primary mb-2">Discussions</h4>
                      <p className="font-body-md text-body-md text-text-secondary">Community discussions for this module will appear here.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* AI Tutor Widget */}
          {activeModule && (
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
               {aiTutorOpen && (
                 <div className="bg-surface border border-border-base rounded-2xl shadow-2xl p-6 w-80 max-h-96 overflow-y-auto card-lift">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="font-bold text-tertiary flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">smart_toy</span> AI Tutor</h4>
                       <button onClick={() => setAiTutorOpen(false)} className="text-text-secondary hover:text-text-primary"><span className="material-symbols-outlined text-[18px]">close</span></button>
                    </div>
                    {aiTutorLoading ? (
                       <div className="flex items-center gap-2 text-text-secondary">
                          <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Thinking...
                       </div>
                    ) : (
                       <div className="text-sm text-text-primary whitespace-pre-wrap">{aiTutorResponse}</div>
                    )}
                 </div>
               )}
               
               {!aiTutorOpen && (
                 <div className="flex flex-col items-end gap-2">
                   <button onClick={() => askAiTutor('simplify')} className="bg-surface text-text-primary border border-border-base px-4 py-2 rounded-full text-xs font-bold shadow-md hover:bg-surface-container transition-all flex items-center gap-2">
                     <span className="material-symbols-outlined text-[14px]">psychology</span> Simplify
                   </button>
                   <button onClick={() => askAiTutor('example')} className="bg-surface text-text-primary border border-border-base px-4 py-2 rounded-full text-xs font-bold shadow-md hover:bg-surface-container transition-all flex items-center gap-2">
                     <span className="material-symbols-outlined text-[14px]">lightbulb</span> Give Example
                   </button>
                 </div>
               )}
            </div>
          )}
        </section>
        
      </div>
    </AppLayout>
  );
}
