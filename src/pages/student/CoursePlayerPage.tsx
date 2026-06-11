import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseModuleProgress, completeModule, getEnrollment } from '@/lib/progress';
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
    setActiveModule(lastMod ?? firstUnlocked ?? enriched[0] ?? null);

    setLoading(false);
  }, [courseId, user, navigate]);

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
    if (isCourseDone) setCourseDone(true);

    await loadData();
    setCompleting(false);
  };

  const canAccess = (mod: ModuleWithStatus) => mod.status !== 'locked';

  if (loading) return (
    <AppLayout title="Course Player">
      <div className="max-w-[1440px] mx-auto p-xl flex justify-center items-center h-64">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">autorenew</span>
      </div>
    </AppLayout>
  );

  const completedCount = modules.filter(m => m.status === 'completed').length;

  return (
    <AppLayout title={course?.title ?? 'Course Player'}>
      <div className="max-w-[1440px] mx-auto flex flex-col h-[calc(100vh-80px)]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-md shrink-0">
          <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-2 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Course
          </Link>
          <div className="flex items-center gap-md w-full max-w-sm ml-auto">
            <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden relative">
              <div className="absolute left-0 top-0 h-full bg-primary progress-glow transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="font-label-md text-label-md text-primary font-bold shrink-0">{progressPercent}%</span>
            {courseDone && (
              <span className="font-label-sm text-label-sm px-2 py-1 rounded bg-primary/20 text-primary border border-primary/30 shrink-0 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">workspace_premium</span> Completed
              </span>
            )}
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-xl flex-1 min-h-0">
          
          {/* Main Content (Video + Tabs) */}
          <div className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden">
            
            {/* Video Player Area */}
            <div className="aspect-video w-full bg-surface-lowest relative group border-b border-outline-variant/60">
              {(() => {
                const videoUrl = activeModule?.content_url || activeModule?.youtube_url || null;
                if (!videoUrl) return (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-low">
                    <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">menu_book</span>
                    <p className="font-body-md text-on-surface-variant">No video for this module</p>
                  </div>
                );
                const embedUrl = buildYouTubeEmbedUrl(videoUrl);
                const videoId = embedUrl?.match(/embed\/([a-zA-Z0-9_-]{11})/)?.[1];
                const cleanWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl;
                
                return (
                  <div className="w-full h-full relative">
                    {/* Top title bar overlay */}
                    <div className="absolute top-0 left-0 w-full bg-gradient-to-b from-surface/80 to-transparent p-md flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      <span className="font-label-md text-label-md font-bold text-white shadow-sm pointer-events-auto truncate pr-4">{activeModule?.title}</span>
                      <a href={cleanWatchUrl} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors pointer-events-auto">
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
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-surface-container-low">
                        <span className="material-symbols-outlined text-[48px] text-outline-variant">smart_display</span>
                        <p className="font-body-sm text-on-surface-variant">Unable to load video</p>
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="font-label-sm text-primary underline">Watch on YouTube</a>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Below Video Content */}
            <div className="flex-1 overflow-y-auto">
              {activeModule && (
                <div className="p-xl max-w-4xl mx-auto w-full">
                  <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-2">{activeModule.title}</h1>
                  <div className="flex items-center gap-4 mb-xl pb-md border-b border-outline-variant/60">
                    <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      <span>Instructor: {course?.instructor ?? 'LearnLoom'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span>{activeModule.duration_minutes} mins</span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-lg border-b border-outline-variant/60 mb-lg overflow-x-auto whitespace-nowrap">
                    <button onClick={() => setActiveTab('overview')} className={`pb-2 border-b-2 font-label-md text-label-md transition-colors ${activeTab === 'overview' ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>Overview</button>
                    <button onClick={() => setActiveTab('resources')} className={`pb-2 border-b-2 font-label-md text-label-md transition-colors ${activeTab === 'resources' ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>Resources</button>
                    <button onClick={() => setActiveTab('discussion')} className={`pb-2 border-b-2 font-label-md text-label-md transition-colors ${activeTab === 'discussion' ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>Discussion</button>
                  </div>

                  {/* Tab Content */}
                  <div className="font-body-md text-on-surface-variant">
                    {activeTab === 'overview' && (
                      <>
                        <div className="mb-xl text-balance whitespace-pre-wrap">{activeModule.description}</div>
                        
                        <div className="flex flex-wrap gap-4 mt-xl">
                          {(activeModule.notes_url || (activeModule.type === 'reading' && activeModule.content_url)) && (
                            <a href={activeModule.notes_url || activeModule.content_url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/60 bg-surface-container hover:bg-surface-container-highest transition-colors font-label-md text-on-surface">
                              <span className="material-symbols-outlined text-[18px] text-secondary">file_download</span> Download Notes
                            </a>
                          )}

                          {activeModule.status !== 'completed' && !courseDone ? (
                            <button onClick={handleComplete} disabled={completing} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-on-primary font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-50 ml-auto">
                              {completing ? <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> : <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                              Mark as Complete
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 px-6 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary font-label-md font-bold ml-auto">
                              <span className="material-symbols-outlined text-[18px] fill">check_circle</span> Module Completed
                            </div>
                          )}
                        </div>

                        {courseDone && (
                          <div className="mt-xl p-md rounded-lg bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                            <span className="material-symbols-outlined text-[40px] text-primary">workspace_premium</span>
                            <div className="flex-1">
                              <h4 className="font-headline-sm text-headline-sm font-bold text-primary mb-1">Course Completed! 🎉</h4>
                              <p className="font-body-sm text-on-surface-variant mb-4 sm:mb-0">You've finished all modules. Check your certificates page.</p>
                            </div>
                            <Link to="/certificates" className="px-4 py-2 bg-primary text-on-primary rounded font-label-sm font-bold shrink-0">View Certificate</Link>
                          </div>
                        )}
                      </>
                    )}
                    {activeTab === 'resources' && (
                      <div className="flex flex-col gap-sm">
                        <p className="mb-4">Resources and references for this module.</p>
                        {activeModule.notes_url && (
                          <a href={activeModule.notes_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-md rounded-lg border border-outline-variant/60 bg-surface-container hover:border-primary/50 transition-colors group">
                            <span className="material-symbols-outlined text-[24px] text-on-surface">description</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-label-md text-label-md font-bold text-on-surface group-hover:text-primary transition-colors">Module Notes (PDF)</h4>
                              <p className="font-label-sm text-label-sm text-on-surface-variant">Downloadable study material</p>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant">download</span>
                          </a>
                        )}
                      </div>
                    )}
                    {activeTab === 'discussion' && (
                      <div className="text-center py-xl">
                        <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">forum</span>
                        <h4 className="font-headline-sm text-on-surface mb-2">Discussions</h4>
                        <p className="font-body-sm text-on-surface-variant">Community discussions for this module will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Curriculum Playlist */}
          <div className="w-full lg:w-80 bg-surface-container-high border border-outline-variant/60 rounded-xl flex flex-col shrink-0 overflow-hidden">
            <div className="p-md border-b border-outline-variant/60 flex justify-between items-center bg-surface-container-highest">
              <h3 className="font-label-md text-label-md font-bold text-on-surface">Module Contents</h3>
              <span className="font-label-sm text-label-sm text-primary">{completedCount}/{modules.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {modules.map((mod, idx) => {
                const isActive = mod.id === activeModule?.id;
                const accessible = canAccess(mod);
                
                if (mod.status === 'completed') {
                  return (
                    <button key={mod.id} onClick={() => setActiveModule(mod)} className={`flex items-start text-left gap-3 p-3 rounded-lg hover:bg-surface-container transition-colors cursor-pointer ${isActive ? 'bg-surface-container border-l-2 border-l-primary' : 'opacity-70'}`}>
                      <div className="mt-0.5 shrink-0"><span className="material-symbols-outlined text-primary text-[20px] fill">check_circle</span></div>
                      <div className="min-w-0">
                        <h4 className={`font-label-md text-label-md truncate ${isActive ? 'text-primary font-bold' : 'text-on-surface line-through'}`}>{idx + 1}. {mod.title}</h4>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{mod.duration_minutes} min</p>
                      </div>
                    </button>
                  );
                }
                
                if (isActive || mod.status === 'unlocked') {
                  return (
                    <button key={mod.id} onClick={() => setActiveModule(mod)} className={`flex items-start text-left gap-3 p-3 rounded-lg transition-colors cursor-pointer ${isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface-container border border-transparent'}`}>
                      <div className="mt-0.5 relative flex items-center justify-center w-5 h-5 shrink-0">
                        <span className={`material-symbols-outlined text-[20px] absolute ${isActive ? 'text-primary fill' : 'text-on-surface-variant'}`}>play_circle</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className={`font-label-md text-label-md truncate ${isActive ? 'text-primary font-bold' : 'text-on-surface font-bold'}`}>{idx + 1}. {mod.title}</h4>
                        <p className={`font-label-sm text-label-sm truncate ${isActive ? 'text-primary/80' : 'text-on-surface-variant'}`}>{mod.duration_minutes} min {isActive && '• Playing'}</p>
                      </div>
                    </button>
                  );
                }
                
                // Locked
                return (
                  <div key={mod.id} className="flex items-start text-left gap-3 p-3 rounded-lg hover:bg-surface-container transition-colors cursor-not-allowed opacity-60">
                    <div className="mt-0.5 shrink-0"><span className="material-symbols-outlined text-outline-variant text-[20px]">lock</span></div>
                    <div className="min-w-0">
                      <h4 className="font-label-md text-label-md text-on-surface-variant truncate">{idx + 1}. {mod.title}</h4>
                      <p className="font-label-sm text-label-sm text-outline-variant">{mod.duration_minutes} min</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
