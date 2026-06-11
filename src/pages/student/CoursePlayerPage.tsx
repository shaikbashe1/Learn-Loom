import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle, Lock, PlayCircle, ChevronLeft, FileDown,
  BookOpen, Trophy, Loader2, ExternalLink,
} from 'lucide-react';
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

  const loadData = useCallback(async () => {
    if (!courseId || !user) return;

    // Fetch course
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();
    if (!courseData) { navigate('/courses'); return; }
    setCourse(courseData);

    // Fetch modules
    const { data: mods } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    const moduleList: DBModule[] = mods ?? [];

    // Fetch enrollment for progress percent + last module
    const enrollment = await getEnrollment(user.id, courseId);
    if (!enrollment) { navigate(`/courses/${courseId}`); return; }

    setProgressPercent(enrollment.progress_percent);
    if (enrollment.completed_at) setCourseDone(true);

    // Fetch per-module progress
    const progRows: DBModuleProgress[] = await getCourseModuleProgress(user.id, courseId);
    const statusMap = new Map(progRows.map(p => [p.module_id, p.status]));

    const enriched: ModuleWithStatus[] = moduleList.map(m => ({
      ...m,
      status: statusMap.get(m.id) ?? 'locked',
    }));
    setModules(enriched);

    // Set active module: last_module_id or first unlocked
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

    // Reload to reflect new statuses
    await loadData();
    setCompleting(false);
  };

  const canAccess = (mod: ModuleWithStatus) => mod.status !== 'locked';

  const statusIcon = (status: string, idx: number) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === 'unlocked')  return <PlayCircle  className="w-4 h-4 text-primary" />;
    return <span className="text-[11px] font-semibold text-muted-foreground">{idx + 1}</span>;
  };

  if (loading) return (
    <AppLayout title="Course Player">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="lg:w-80 space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title={course?.title ?? 'Course Player'}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Course
          </Link>
          <div className="flex items-center gap-3 flex-1 max-w-xs md:max-w-sm">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="text-sm font-semibold text-primary shrink-0">{progressPercent}%</span>
          </div>
          {courseDone && (
            <Badge className="bg-success/15 text-success border-success/30 shrink-0">
              <Trophy className="w-3 h-3 mr-1" /> Completed
            </Badge>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Video player */}
            {(() => {
              // Support both new schema (content_url) and legacy (youtube_url)
              const videoUrl = activeModule?.content_url || activeModule?.youtube_url || null;
              if (!videoUrl) return (
                <div className="rounded-xl border border-border bg-card aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No video for this module</p>
                  </div>
                </div>
              );
              const embedUrl = buildYouTubeEmbedUrl(videoUrl);
              const videoId = embedUrl?.match(/embed\/([a-zA-Z0-9_-]{11})/)?.[1];
              const cleanWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl;
              return (
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <div className="bg-secondary px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">{activeModule?.title}</span>
                    <a
                      href={cleanWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open on YouTube"
                      className="text-slate-400 hover:text-white transition-colors shrink-0 ml-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="aspect-video w-full bg-black">
                    {embedUrl ? (
                      <iframe
                        key={embedUrl}
                        src={embedUrl}
                        title={activeModule?.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        loading="lazy"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <BookOpen className="w-10 h-10 text-slate-400" />
                        <p className="text-sm text-slate-400">Unable to load video.</p>
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary underline">
                          Watch on YouTube
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Module info + actions */}
            {activeModule && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground text-balance">{activeModule.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Module {modules.findIndex(m => m.id === activeModule.id) + 1} of {modules.length}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {/* Download notes */}
                  {(activeModule.notes_url || (activeModule.type === 'reading' && activeModule.content_url)) && (
                    <a href={activeModule.notes_url || activeModule.content_url || '#'} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" className="h-9 text-sm border border-border text-secondary hover:bg-accent">
                        <FileDown className="w-4 h-4 mr-2" /> Download Notes
                      </Button>
                    </a>
                  )}

                  {/* Mark as complete */}
                  {activeModule.status !== 'completed' && !courseDone ? (
                    <Button
                      onClick={handleComplete}
                      disabled={completing}
                      className="h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {completing
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                        : <><CheckCircle className="w-4 h-4 mr-2" /> Mark as Complete</>
                      }
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-success font-medium">
                      <CheckCircle className="w-4 h-4" /> Module Completed
                    </div>
                  )}
                </div>

                {/* Course finished banner */}
                {courseDone && (
                  <div className="rounded-lg bg-success/10 border border-success/30 p-4 flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-success shrink-0" />
                    <div>
                      <p className="font-semibold text-success">Course Completed! 🎉</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You've finished all modules. Check your certificates page.
                      </p>
                    </div>
                    <Link to="/certificates" className="ml-auto shrink-0">
                      <Button size="sm" className="bg-success text-white hover:bg-success/90 h-8 text-xs">
                        View Certificate
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Module sidebar ── */}
          <div className="lg:w-80 shrink-0">
            <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-4">
              <div className="bg-secondary px-4 py-3">
                <h3 className="text-sm font-semibold text-white">Course Modules</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modules.filter(m => m.status === 'completed').length}/{modules.length} completed
                </p>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-16rem)]">
                {modules.map((mod, idx) => {
                  const isActive = mod.id === activeModule?.id;
                  const accessible = canAccess(mod);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => accessible && setActiveModule(mod)}
                      disabled={!accessible}
                      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border transition-colors text-left
                        ${isActive ? 'bg-primary/10 border-l-2 border-l-primary' : ''}
                        ${accessible && !isActive ? 'hover:bg-accent cursor-pointer' : ''}
                        ${!accessible ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      {/* Status icon circle */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                        ${mod.status === 'completed' ? 'bg-success/15' :
                          mod.status === 'unlocked' ? 'bg-primary/15' : 'bg-muted'}
                      `}>
                        {mod.status === 'locked'
                          ? <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          : statusIcon(mod.status, idx)
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {mod.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{mod.status}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
