import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseModuleProgress, completeModule, getEnrollment } from '@/lib/progress';
import { logUserActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { buildYouTubeEmbedUrl } from '@/lib/youtube';
import type { DBCourse, DBModule, DBModuleProgress } from '@/types/types';

type ModuleWithStatus = DBModule & { status: 'locked' | 'unlocked' | 'completed' };

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
      const { data: qData } = await supabase.from('quizzes').select('id').eq('module_id', currentActive.id).maybeSingle();
      setModuleQuizId(qData?.id ?? null);
    }

    setLoading(false);
  }, [courseId, user, navigate]);

  // Load quiz id when active module changes by clicking sidebar
  useEffect(() => {
    if (!activeModule) return;
    supabase.from('quizzes').select('id').eq('module_id', activeModule.id).maybeSingle().then(({ data }) => {
      setModuleQuizId(data?.id ?? null);
    });
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

    toast.success(isCourseDone ? '🎉 Course completed!' : 'Module completed — next one unlocked!');
    void logUserActivity(user.id, 'module_completed', `Completed module: ${activeModule.title}`);
    
    if (isCourseDone) {
      setCourseDone(true);
      void logUserActivity(user.id, 'course_completed', `Completed course: ${course?.title}`);
    }

    await loadData();
    setCompleting(false);
  };

  const canAccess = (mod: ModuleWithStatus) => mod.status !== 'locked';

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
                <div className="flex items-center justify-between mb-8">
                  <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary">{activeModule.title}</h1>
                  {activeModule.status !== 'completed' && !courseDone ? (
                    moduleQuizId ? (
                      <Link to={`/quiz/${moduleQuizId}`} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold hover:brightness-110 transition-all shadow-md hover:shadow-lg shrink-0">
                        <span className="material-symbols-outlined text-[20px]">quiz</span>
                        Take Knowledge Check
                      </Link>
                    ) : (
                      <button onClick={handleComplete} disabled={completing} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold hover:brightness-110 transition-all shadow-md hover:shadow-lg disabled:opacity-50 shrink-0">
                        {completing ? <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span> : <span className="material-symbols-outlined text-[20px]">check_circle</span>}
                        Mark as Complete
                      </button>
                    )
                  ) : (
                    <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-primary/30 bg-primary-fixed/30 text-primary font-label-md text-label-md font-bold shrink-0">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Completed
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
                        <div className="mb-8" dangerouslySetInnerHTML={{ __html: activeModule.content }} />
                      )}
                      {!activeModule.content && (
                        <div className="mb-4 whitespace-pre-wrap">{activeModule.description}</div>
                      )}
                      
                      {courseDone && (
                        <div className="bg-surface-bright p-6 rounded-2xl border border-border-base my-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left mt-8">
                          <span className="material-symbols-outlined text-[40px] text-primary">school</span>
                          <div className="flex-1">
                            <h4 className="font-headline-sm text-headline-sm font-bold text-primary mb-1">Modules Completed! 🎉</h4>
                            <p className="font-body-sm text-text-secondary mb-4 sm:mb-0">You've finished all learning modules. Complete the final assessments to earn your certificate.</p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Link to={`/courses/${courseId}/assessment`} className="px-6 py-2.5 bg-primary text-on-primary rounded-full font-label-sm font-bold shadow-md hover:shadow-lg shrink-0 transition-all hover:-translate-y-0.5 text-center flex items-center gap-2 justify-center">
                               <span className="material-symbols-outlined text-[18px]">quiz</span> MCQ Test
                            </Link>
                            <Link to={`/courses/${courseId}/coding-assessment`} className="px-6 py-2.5 bg-surface text-primary border border-primary rounded-full font-label-sm font-bold shadow-sm hover:bg-primary/5 shrink-0 transition-all hover:-translate-y-0.5 text-center flex items-center gap-2 justify-center">
                               <span className="material-symbols-outlined text-[18px]">code</span> Coding Test
                            </Link>
                          </div>
                        </div>
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
        </section>
        
      </div>
    </AppLayout>
  );
}
