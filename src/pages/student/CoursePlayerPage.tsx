import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseModuleProgress, completeModule, getEnrollment } from '@/lib/progress';
import { logUserActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/sanitize';
import { buildYouTubeEmbedUrl } from '@/lib/youtube';
import { renderMarkdown } from '@/lib/markdown';
import { formatDistanceToNow } from 'date-fns';
import type { DBCourse, DBModule, DBModuleProgress, DBQuiz, DBQuizAttempt } from '@/types/types';

type ModuleWithStatus = DBModule & {
  status: 'locked' | 'unlocked' | 'completed';
  quizzes?: DBQuiz[];
  codingId?: string | null;
  passedQuizzes?: string[];
  codingPassed?: boolean;
};

function formatMarkdownContent(val: string | string[] | null | undefined): string {
  if (!val) return '';
  if (Array.isArray(val)) {
    return val.map(item => `- ${item}`).join('\n');
  }
  return val;
}

// ── Selection-aware Markdown formatting injection helper ─────────────────────
function insertFormat(
  textareaRef: HTMLTextAreaElement | null,
  textValue: string,
  setValue: (v: string) => void,
  before: string,
  after: string = ''
) {
  if (!textareaRef) {
    setValue(textValue + before + after);
    return;
  }
  const start = textareaRef.selectionStart;
  const end = textareaRef.selectionEnd;
  const selectedText = textValue.substring(start, end);
  const replacement = before + selectedText + after;
  setValue(
    textValue.substring(0, start) + replacement + textValue.substring(end)
  );
  
  setTimeout(() => {
    textareaRef.focus();
    textareaRef.setSelectionRange(
      start + before.length,
      start + before.length + selectedText.length
    );
  }, 0);
}

// ── Markdown Toolbar Component ────────────────────────────────────────────────
interface MarkdownToolbarProps {
  textareaRef: HTMLTextAreaElement | null;
  textValue: string;
  setValue: (v: string) => void;
}

function MarkdownToolbar({ textareaRef, textValue, setValue }: MarkdownToolbarProps) {
  return (
    <div className="flex items-center gap-1 bg-surface-container border border-border-base rounded-t-lg p-1 shrink-0 flex-wrap">
      <button
        type="button"
        title="Bold"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '**', '**')}
        className="p-1 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[28px] min-w-[28px]"
      >
        <span className="material-symbols-outlined text-[16px] font-bold">format_bold</span>
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '*', '*')}
        className="p-1 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[28px] min-w-[28px]"
      >
        <span className="material-symbols-outlined text-[16px]">format_italic</span>
      </button>
      <button
        type="button"
        title="Link"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '[', '](url)')}
        className="p-1 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[28px] min-w-[28px]"
      >
        <span className="material-symbols-outlined text-[16px]">link</span>
      </button>
      <button
        type="button"
        title="Code Block"
        onClick={() => insertFormat(textareaRef, textValue, setValue, '```javascript\n', '\n```')}
        className="p-1 rounded hover:bg-surface hover:text-primary transition-colors flex items-center justify-center min-h-[28px] min-w-[28px]"
      >
        <span className="material-symbols-outlined text-[16px]">code</span>
      </button>
    </div>
  );
}

// ── ModuleDiscussionBoard sub-component ───────────────────────────────────────
interface ModuleDiscussionBoardProps {
  courseId: string;
  moduleId: string;
  currentUserId: string;
}

function ModuleDiscussionBoard({ courseId, moduleId, currentUserId }: ModuleDiscussionBoardProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Post State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'write' | 'preview'>('write');
  const [posting, setPosting] = useState(false);
  
  // Expanded Comment State
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyMode, setReplyMode] = useState<'write' | 'preview'>('write');
  const [replyPosting, setReplyPosting] = useState(false);

  const mainComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const replyComposerRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('course_id', courseId)
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const uids = Array.from(new Set(data.map(d => d.user_id)));
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', uids);
        const pMap = new Map(profs?.map(p => [p.id, p]) ?? []);
        setPosts(data.map(p => ({ ...p, profiles: pMap.get(p.user_id) })));
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error('Fetch posts error:', err);
    }
    setLoading(false);
  }, [courseId, moduleId]);

  useEffect(() => {
    fetchPosts();
    setExpandedPostId(null);
    setComposerOpen(false);
  }, [fetchPosts, moduleId]);

  const loadReplies = async (postId: string) => {
    setLoadingReplies(true);
    try {
      const { data } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('is_accepted', { ascending: false })
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const uids = Array.from(new Set(data.map(r => r.user_id)));
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', uids);
        const pMap = new Map(profs?.map(p => [p.id, p]) ?? []);
        setReplies(data.map(r => ({ ...r, profiles: pMap.get(r.user_id) })));
      } else {
        setReplies([]);
      }
    } catch (err) {
      console.error('Load replies error:', err);
    }
    setLoadingReplies(false);
  };

  const handleExpandPost = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      loadReplies(postId);
    }
  };

  // Loomie AI thread responder stream helper
  const triggerLoomieAI = async (postId: string, title: string, content: string, isReply: boolean = false, userQuery: string = '') => {
    try {
      const threadContext = isReply 
        ? replies.slice(-5).map(r => `${r.profiles?.full_name ?? 'User'}: ${r.content}`).join('\n')
        : '';
        
      const systemPrompt = `You are Loomie AI, the friendly and knowledgeable AI mentor on the LearnLoom educational platform. A student has posted a question in the lesson discussions for this module. Provide a clean, helpful, and structured response using Markdown.
      
Lesson Context:
Course ID: ${courseId}
Module ID: ${moduleId}

Post Title: "${title}"
Post Content: "${content}"
${isReply ? `Previous replies:\n${threadContext}\n\nStudent query: "${userQuery}"` : ''}`;

      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await fetch('/api/ai-mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contents }),
      });

      if (!res.ok) return;
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              aiText += parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            } catch {}
          }
        }
      }

      if (aiText.trim()) {
        await supabase.from('forum_replies').insert({
          post_id: postId,
          parent_id: null,
          user_id: currentUserId,
          content: aiText.trim(),
          is_ai: true,
        });
        if (expandedPostId === postId) {
          loadReplies(postId);
        }
        // Increment reply count in local view
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p));
      }
    } catch (err) {
      console.error('Loomie response error:', err);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setPosting(true);
    const postTitle = newTitle.trim();
    const postContent = newContent.trim();

    const { data, error } = await supabase.from('forum_posts').insert({
      user_id: currentUserId,
      course_id: courseId,
      module_id: moduleId,
      title: postTitle,
      content: postContent,
      category: 'doubt',
    }).select();

    setPosting(false);
    if (error) { toast.error('Failed to ask question'); return; }
    
    toast.success('Question added to community feed!');
    setNewTitle('');
    setNewContent('');
    setComposerOpen(false);
    setComposerMode('write');
    fetchPosts();

    // Trigger AI if post mentions @loomie
    if (postContent.toLowerCase().includes('@loomie') || postTitle.toLowerCase().includes('@loomie')) {
      const newPostId = data?.[0]?.id;
      if (newPostId) {
        toast.info('Loomie AI is formulating a response...');
        await triggerLoomieAI(newPostId, postTitle, postContent);
      }
    }
  };

  const submitReply = async (postId: string) => {
    if (!replyText.trim() || !currentUserId) return;
    setReplyPosting(true);
    const textToSend = replyText.trim();

    const { data, error } = await supabase.from('forum_replies').insert({
      post_id: postId,
      parent_id: null,
      user_id: currentUserId,
      content: textToSend,
      is_ai: false,
    }).select();

    setReplyPosting(false);
    if (error) { toast.error('Failed to post reply'); return; }
    
    setReplyText('');
    setReplyMode('write');
    loadReplies(postId);
    
    // Update reply count in local state
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p));

    // Trigger AI if comment mentions @loomie
    if (textToSend.toLowerCase().includes('@loomie')) {
      toast.info('Loomie AI is reviewing the thread...');
      const parentPost = posts.find(p => p.id === postId);
      await triggerLoomieAI(postId, parentPost?.title ?? '', parentPost?.content ?? '', true, textToSend);
    }
  };

  const initials = (name: string | null | undefined) => {
    if (!name) return 'CM';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h4 className="font-label-md text-label-md font-bold text-text-primary">Q&A Discussions</h4>
        <button
          onClick={() => setComposerOpen(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-all min-h-[36px]"
        >
          <span className="material-symbols-outlined text-[16px]">{composerOpen ? 'close' : 'add'}</span>
          {composerOpen ? 'Cancel' : 'Ask Question'}
        </button>
      </div>

      {/* Inline composer for course player */}
      {composerOpen && (
        <form onSubmit={handlePost} className="bg-surface-container border border-border-base rounded-xl p-4 flex flex-col gap-3 shadow-inner">
          <input 
            type="text" 
            placeholder="What is your question?" 
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full bg-background border border-border-base rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-primary shadow-sm"
            required
            minLength={5}
          />
          
          <MarkdownToolbar 
            textareaRef={mainComposerRef.current} 
            textValue={newContent} 
            setValue={setNewContent} 
          />

          <div className="flex gap-2 justify-end mb-1 shrink-0">
            <button
              type="button"
              onClick={() => setComposerMode('write')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${composerMode === 'write' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setComposerMode('preview')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${composerMode === 'preview' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`}
            >
              Preview
            </button>
          </div>

          {composerMode === 'write' ? (
            <textarea
              ref={mainComposerRef}
              placeholder="Provide more context or paste code here... (use @loomie for AI help)"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              className="w-full bg-background border border-border-base rounded-b-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-primary min-h-[100px] resize-y"
              required
              minLength={10}
            />
          ) : (
            <div className="w-full bg-background border border-border-base rounded-b-lg p-3 text-xs text-text-secondary min-h-[100px] leading-relaxed shadow-sm">
              {newContent.trim() ? renderMarkdown(newContent) : <span className="italic text-muted-foreground">Nothing to preview.</span>}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="submit"
              disabled={posting}
              className="bg-primary text-on-primary hover:bg-primary-container px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              {posting ? 'Posting...' : 'Submit Post'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col gap-3 py-4">
          <Skeleton className="h-16 w-full rounded-xl bg-surface-container" />
          <Skeleton className="h-16 w-full rounded-xl bg-surface-container" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 border border-border-base border-dashed rounded-xl bg-surface/50">
          <span className="material-symbols-outlined text-[36px] text-outline mb-2">forum</span>
          <p className="font-label-md text-label-md font-bold text-text-primary mb-1">No questions yet</p>
          <p className="font-body-sm text-[12px] text-text-secondary px-4">Be the first to post a doubt or check back later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const isExpanded = expandedPostId === post.id;
            
            return (
              <div key={post.id} className="border border-border-base rounded-xl bg-surface p-4 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container border border-border-base flex items-center justify-center font-bold text-text-primary text-xs shadow-sm">
                    {initials(post.profiles?.full_name)}
                  </div>
                  <div>
                    <h5 className="font-label-sm text-[13px] font-bold text-text-primary">{post.profiles?.full_name ?? 'Student'}</h5>
                    <span className="text-[10px] text-text-secondary">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-label-md text-label-md font-bold text-text-primary mb-1">{post.title}</h4>
                  <div className="text-xs text-text-secondary leading-relaxed font-body-sm">
                    {renderMarkdown(post.content)}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-border-base/50">
                  <button
                    onClick={() => handleExpandPost(post.id)}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors font-bold min-h-[28px]"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                    {post.reply_count} Comments
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t border-border-base/50 pt-3 space-y-3">
                    {loadingReplies ? (
                      <div className="flex items-center gap-2 text-xs text-text-secondary py-2 justify-center">
                        <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span> Loading...
                      </div>
                    ) : replies.length === 0 ? (
                      <p className="text-[11px] text-text-secondary italic text-center py-2">No responses yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                        {replies.map(reply => (
                          <div key={reply.id} className="flex gap-2 items-start text-xs">
                            {reply.is_ai ? (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--chart-4))] flex items-center justify-center text-white shrink-0 shadow-sm">
                                <span className="material-symbols-outlined text-[12px] animate-pulse">smart_toy</span>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center font-bold text-text-primary text-[10px] shrink-0 border border-border-base shadow-sm">
                                {initials(reply.profiles?.full_name)}
                              </div>
                            )}

                            <div className={`flex-1 rounded-lg px-2.5 py-2 border ${reply.is_ai ? 'bg-primary/5 border-primary/10' : 'bg-surface-container-low border-border-base'}`}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-text-primary">{reply.is_ai ? 'Loomie AI' : reply.profiles?.full_name ?? 'Student'}</span>
                                  {reply.is_ai && <span className="bg-primary/20 text-primary text-[8px] font-bold px-1 rounded">BOT</span>}
                                  {reply.is_accepted && <span className="text-emerald-500 font-bold text-[9px] flex items-center gap-0.5"><span className="material-symbols-outlined text-[11px] font-bold">check</span>Accepted</span>}
                                </div>
                                <span className="text-[9px] text-text-secondary">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                              </div>
                              <div className="text-text-secondary leading-relaxed text-[11px]">
                                {renderMarkdown(reply.content)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2 border-t border-border-base/50">
                      
                      <MarkdownToolbar 
                        textareaRef={replyComposerRef.current} 
                        textValue={replyText} 
                        setValue={setReplyText} 
                      />

                      <div className="flex gap-2 justify-end mb-1">
                        <button
                          type="button"
                          onClick={() => setReplyMode('write')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${replyMode === 'write' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`}
                        >
                          Write
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyMode('preview')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${replyMode === 'preview' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`}
                        >
                          Preview
                        </button>
                      </div>

                      {replyMode === 'write' ? (
                        <textarea
                          ref={replyComposerRef}
                          placeholder="Type your reply (markdown supported, use @loomie for AI help)..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          className="w-full bg-background border border-border-base rounded-b-lg p-2 text-xs text-text-primary focus:outline-none focus:border-primary min-h-[60px] resize-none"
                        />
                      ) : (
                        <div className="w-full bg-background border border-border-base rounded-b-lg p-2 text-xs text-text-secondary min-h-[60px] leading-relaxed shadow-sm">
                          {replyText.trim() ? renderMarkdown(replyText) : <span className="italic text-muted-foreground">Nothing to preview.</span>}
                        </div>
                      )}

                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => submitReply(post.id)}
                          disabled={!replyText.trim() || replyPosting}
                          className="bg-primary text-on-primary hover:bg-primary-container px-3 py-1 rounded text-xs font-bold transition-all min-h-[28px]"
                        >
                          {replyPosting ? 'Sending...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main player page component ───────────────────────────────────────────────
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
  const [curriculumOpen, setCurriculumOpen] = useState(false);

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
        explain: 'Please provide a comprehensive explanation of this module\'s topics.',
        example: 'Please provide a practical code example demonstrating this module\'s concepts.',
      };

      const systemPrompt = `You are Loomie AI, the student's personal tutor. Answer this question about the course module: "${activeModule.title}".
Context of the module:
- Description: ${activeModule.description}
- Summary: ${activeModule.summary || ''}
- Key Concepts: ${activeModule.key_concepts || ''}

Question / Request: ${promptMap[action]}`;

      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await fetch('/api/ai-mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contents }),
      });

      if (!res.ok) throw new Error('Failed to ask AI Tutor');
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              aiText += parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            } catch {}
          }
        }
        setAiTutorResponse(aiText);
      }
    } catch (err: any) {
      toast.error('AI Tutor request failed');
    } finally {
      setAiTutorLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading Course...">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-6">
          <Skeleton className="h-10 w-1/4 bg-surface-container" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Skeleton className="h-[400px] w-full rounded-2xl bg-surface-container" />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <Skeleton className="h-8 w-1/2 bg-surface-container" />
              <Skeleton className="h-64 w-full rounded-2xl bg-surface-container" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!course || !activeModule) {
    return (
      <AppLayout title="Course Not Found">
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
          <span className="material-symbols-outlined text-[64px] text-outline">error</span>
          <h2 className="text-2xl font-bold text-text-primary">Course failed to load</h2>
          <Link to="/courses" className="px-6 py-2.5 bg-primary text-white rounded-full font-bold">Back to Catalog</Link>
        </div>
      </AppLayout>
    );
  }

  const isCompleted = activeModule.status === 'completed';
  const hasQuizzes = activeModule.quizzes && activeModule.quizzes.length > 0;
  const passedQuizIds = activeModule.passedQuizzes || [];
  const quizzesAllPassed = hasQuizzes && activeModule.quizzes?.every(q => passedQuizIds.includes(q.id));
  const codingPassed = !activeModule.codingId || activeModule.codingPassed;
  
  const canMarkComplete = (!hasQuizzes || quizzesAllPassed) && codingPassed;

  return (
    <AppLayout title={course.title}>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col lg:flex-row gap-gutter">
        
        {/* Mobile curriculum trigger */}
        <div className="lg:hidden flex items-center justify-between bg-surface border border-border-base p-4 rounded-xl shadow-sm mb-2">
          <span className="font-label-md text-label-md font-bold text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            Curriculum Roadmap
          </span>
          <button 
            onClick={() => setCurriculumOpen(true)}
            className="flex items-center gap-1 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg text-xs min-h-[36px]"
          >
             Open Roadmap
          </button>
        </div>

        {/* Desktop Sidebar: Modules Index */}
        <aside className="hidden lg:flex w-[320px] flex-col gap-6 shrink-0 sticky top-24 self-start">
          <div className="glass-panel border border-border-base rounded-2xl p-5 shadow-sm w-full flex flex-col">
            <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary mb-4 flex items-center gap-2 select-none">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              Curriculum Roadmap
            </h3>
            
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {modules.map((mod, i) => {
                const isCurrent = mod.id === activeModule.id;
                const isLocked = mod.status === 'locked';
                const isDone = mod.status === 'completed';

                return (
                  <button
                    key={mod.id}
                    disabled={isLocked}
                    onClick={() => setActiveModule(mod)}
                    className={`flex items-start gap-3 w-full text-left p-3.5 rounded-xl border transition-all ${
                      isCurrent 
                        ? 'bg-primary/5 border-primary/30 text-primary shadow-sm' 
                        : isLocked 
                          ? 'opacity-40 cursor-not-allowed border-border-base bg-surface-container-low' 
                          : 'bg-surface hover:bg-surface-container border-border-base text-text-primary hover:border-primary/20'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 flex items-center justify-center">
                      {isDone ? (
                        <span className="material-symbols-outlined text-success font-extrabold text-[20px]">check_circle</span>
                      ) : isCurrent ? (
                        <span className="material-symbols-outlined text-primary text-[20px] animate-pulse">play_circle</span>
                      ) : isLocked ? (
                        <span className="material-symbols-outlined text-outline text-[20px]">lock</span>
                      ) : (
                        <span className="material-symbols-outlined text-primary text-[20px]">radio_button_unchecked</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-label-sm text-[11px] text-text-secondary uppercase tracking-wider font-bold mb-0.5">Module {i + 1}</div>
                      <div className="font-label-md text-[14px] font-bold leading-snug truncate">{mod.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Mobile Curriculum Sheet */}
        <Sheet open={curriculumOpen} onOpenChange={setCurriculumOpen}>
          <SheetContent side="left" className="w-[300px] p-6 bg-surface">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle className="font-headline-sm text-headline-sm font-bold text-text-primary flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">menu_book</span>
                 Curriculum Roadmap
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[85vh] pr-1">
              {modules.map((mod, i) => {
                const isCurrent = mod.id === activeModule.id;
                const isLocked = mod.status === 'locked';
                const isDone = mod.status === 'completed';

                return (
                  <button
                    key={mod.id}
                    disabled={isLocked}
                    onClick={() => { setActiveModule(mod); setCurriculumOpen(false); }}
                    className={`flex items-start gap-3 w-full text-left p-3.5 rounded-xl border transition-all ${
                      isCurrent 
                        ? 'bg-primary/5 border-primary/30 text-primary' 
                        : isLocked 
                          ? 'opacity-40 cursor-not-allowed border-border-base bg-surface-container-low' 
                          : 'bg-surface hover:bg-surface-container border-border-base text-text-primary'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <span className="material-symbols-outlined text-success font-bold text-[20px]">check_circle</span>
                      ) : isCurrent ? (
                        <span className="material-symbols-outlined text-primary text-[20px]">play_circle</span>
                      ) : isLocked ? (
                        <span className="material-symbols-outlined text-outline text-[20px]">lock</span>
                      ) : (
                        <span className="material-symbols-outlined text-primary text-[20px]">radio_button_unchecked</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-label-sm text-[11px] text-text-secondary uppercase tracking-wider font-bold mb-0.5">Module {i + 1}</div>
                      <div className="font-label-md text-[14px] font-bold leading-snug truncate">{mod.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <section className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Module Player View */}
          <div className="glass-panel border border-border-base rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm flex flex-col gap-6">
            
            {/* Video Player */}
            {activeModule.youtube_url ? (
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-md bg-black border border-border-base">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={buildYouTubeEmbedUrl(activeModule.youtube_url ?? '') ?? undefined}
                  title={activeModule.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-md bg-secondary-container-high border border-border-base flex flex-col items-center justify-center text-center p-6 select-none">
                <span className="material-symbols-outlined text-[64px] text-primary mb-4 animate-float">smart_toy</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary mb-1">Interactive Lesson Module</h3>
                <p className="font-body-md text-body-md text-text-secondary max-w-md">No video file. Review module concepts and complete the tasks below.</p>
              </div>
            )}

            {/* Title block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-headline-lg text-[24px] sm:text-[28px] text-text-primary font-extrabold tracking-tight mb-1 leading-snug">{activeModule.title}</h1>
                <p className="font-body-md text-body-md text-text-secondary max-w-2xl">{activeModule.description}</p>
              </div>

              {/* Complete state */}
              {isCompleted ? (
                <div className="flex items-center gap-2 bg-success/10 border border-success/20 text-success px-5 py-2.5 rounded-full font-label-md font-bold text-sm w-fit select-none">
                  <span className="material-symbols-outlined font-extrabold text-[20px]">check_circle</span> Verified Complete
                </div>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={completing || !canMarkComplete}
                  className="bg-primary hover:bg-primary-container text-white px-6 py-2.5 rounded-full font-label-md font-bold text-sm shadow-md transition-all shrink-0 min-h-[44px]"
                >
                  {completing ? 'Saving...' : 'Mark Completed'}
                  <span className="material-symbols-outlined text-[20px]">check</span>
                </Button>
              )}
            </div>

            {/* Lesson Module Content Body */}
            {activeModule.content && (
              <div className="border-t border-border-base/50 pt-6">
                <div className="text-text-secondary leading-relaxed font-body-md max-w-none">
                  {renderMarkdown(activeModule.content)}
                </div>
              </div>
            )}

            {/* Assessment Warning Gate */}
            {!isCompleted && !canMarkComplete && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex gap-3 items-start select-none">
                <span className="material-symbols-outlined text-warning mt-0.5 text-[20px]">warning</span>
                <div>
                  <h4 className="font-label-md text-label-md font-bold text-text-primary mb-1">Locked Actions Remain</h4>
                  <p className="font-body-sm text-body-sm text-text-secondary">Please complete and pass all required quizzes and coding assessments below to unlock completion progress.</p>
                </div>
              </div>
            )}

            {/* Assessment Cards */}
            {(hasQuizzes || activeModule.codingId) && (
              <div className="flex flex-col gap-4 border-t border-border-base pt-6 select-none">
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary">assignment_turned_in</span> Module Tasks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quizzes */}
                  {activeModule.quizzes?.map((quiz, qidx) => {
                    const isPassed = passedQuizIds.includes(quiz.id);
                    return (
                      <div key={quiz.id} className="border border-border-base bg-surface rounded-xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${isPassed ? 'bg-success/10 border-success/20 text-success' : 'bg-surface-container-high border-border-base text-text-secondary'}`}>
                            <span className="material-symbols-outlined text-[20px]">{isPassed ? 'check_circle' : 'quiz'}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-label-sm text-[11px] text-text-secondary uppercase tracking-wider font-bold mb-0.5">Quiz {qidx + 1}</h4>
                            <h4 className="font-label-md text-[14px] font-bold text-text-primary truncate">{quiz.title}</h4>
                          </div>
                        </div>
                        {isPassed ? (
                          <span className="text-[12px] font-bold text-success flex items-center gap-0.5 shrink-0"><span className="material-symbols-outlined text-[14px]">check</span>Passed</span>
                        ) : (
                          <Link to={`/quiz/${quiz.id}`} className="px-4 py-1.5 bg-primary text-white hover:bg-primary-container text-xs font-bold rounded-lg shrink-0 min-h-[32px] flex items-center">Start</Link>
                        )}
                      </div>
                    );
                  })}

                  {/* Coding Assessment */}
                  {activeModule.codingId && (
                    <div className="border border-border-base bg-surface rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${activeModule.codingPassed ? 'bg-success/10 border-success/20 text-success' : 'bg-surface-container-high border-border-base text-text-secondary'}`}>
                          <span className="material-symbols-outlined text-[20px]">{activeModule.codingPassed ? 'check_circle' : 'code'}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-label-sm text-[11px] text-text-secondary uppercase tracking-wider font-bold mb-0.5">Challenge</h4>
                          <h4 className="font-label-md text-[14px] font-bold text-text-primary truncate">Coding Practice</h4>
                        </div>
                      </div>
                      {activeModule.codingPassed ? (
                        <span className="text-[12px] font-bold text-success flex items-center gap-0.5 shrink-0"><span className="material-symbols-outlined text-[14px]">check</span>Passed</span>
                      ) : (
                        <Link to={`/coding?module=${activeModule.id}`} className="px-4 py-1.5 bg-primary text-white hover:bg-primary-container text-xs font-bold rounded-lg shrink-0 min-h-[32px] flex items-center">Code</Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details & Community Tabs */}
          <div className="glass-panel border border-border-base rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex border-b border-border-base gap-6 overflow-x-auto scrollbar-hide select-none">
              <button onClick={() => setActiveTab('overview')} className={`pb-4 font-label-md text-label-md font-bold transition-colors ${activeTab === 'overview' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}>Overview & Notes</button>
              <button onClick={() => setActiveTab('resources')} className={`pb-4 font-label-md text-label-md transition-colors ${activeTab === 'resources' ? 'text-primary border-b-2 border-primary font-bold' : 'text-text-secondary hover:text-text-primary font-bold'}`}>Resources</button>
              <button onClick={() => setActiveTab('discussion')} className={`pb-4 font-label-md text-label-md transition-colors ${activeTab === 'discussion' ? 'text-primary border-b-2 border-primary font-bold' : 'text-text-secondary hover:text-text-primary font-bold'}`}>Discussion</button>
            </div>

            <div className="pt-2">
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-8">
                  {/* Key Concepts */}
                  {activeModule.key_concepts && (
                    <div className="flex flex-col gap-3">
                      <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary flex items-center gap-2 select-none">
                         <span className="material-symbols-outlined text-primary">key_visualizer</span> Key Concepts
                      </h3>
                      <div className="font-body-md text-text-secondary leading-relaxed pl-1">
                        {renderMarkdown(formatMarkdownContent(activeModule.key_concepts))}
                      </div>
                    </div>
                  )}

                  {/* Real World Use Cases */}
                  {activeModule.real_world_use_cases && (
                    <div className="flex flex-col gap-3">
                      <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary flex items-center gap-2 select-none">
                         <span className="material-symbols-outlined text-primary">analytics</span> Real-World Scenarios
                      </h3>
                      <div className="font-body-md text-text-secondary leading-relaxed pl-1">
                        {renderMarkdown(formatMarkdownContent(activeModule.real_world_use_cases))}
                      </div>
                    </div>
                  )}

                  {/* Examples */}
                  {activeModule.examples && (
                    <div className="flex flex-col gap-3">
                      <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary flex items-center gap-2 select-none">
                         <span className="material-symbols-outlined text-primary">terminal</span> Code Walkthroughs
                      </h3>
                      <div className="font-body-md text-text-secondary leading-relaxed pl-1">
                        {renderMarkdown(formatMarkdownContent(activeModule.examples))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {activeModule.summary && (
                    <div className="flex flex-col gap-3">
                      <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary flex items-center gap-2 select-none">
                         <span className="material-symbols-outlined text-primary">summarize</span> Module Summary
                      </h3>
                      <div className="font-body-md text-text-secondary leading-relaxed pl-1">
                        {renderMarkdown(activeModule.summary)}
                      </div>
                    </div>
                  )}

                  {/* Course Completion / Exam unlocked banner */}
                  {courseDone && (
                    <div className="bg-success/5 border border-success/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm mt-4 select-none">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success shadow-inner">
                           <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
                        </div>
                        <div>
                          <h4 className="font-headline-sm text-headline-sm font-bold text-text-primary mb-1">Course Assessments Completed</h4>
                          <p className="font-body-sm text-body-sm text-text-secondary">You have completed all lesson modules. Take your final exams to earn your verified certificate!</p>
                        </div>
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
                  )}
                </div>
              )}
              
              {activeTab === 'resources' && (
                <div className="flex flex-col gap-4">
                  <p className="font-body-md text-text-secondary select-none">Resources and references for this module.</p>
                  {activeModule.notes_url && (
                    <a href={activeModule.notes_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 rounded-xl border border-border-base bg-surface hover:shadow-md transition-shadow group cursor-pointer select-none">
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
              
              {activeTab === 'discussion' && user && (
                <ModuleDiscussionBoard 
                  courseId={courseId ?? ''} 
                  moduleId={activeModule.id} 
                  currentUserId={user.id} 
                />
              )}
            </div>
          </div>

          {/* AI Tutor Widget */}
          {activeModule && (
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 select-none">
               {aiTutorOpen && (
                 <div className="bg-surface border border-border-base rounded-2xl shadow-2xl p-6 w-80 max-h-96 overflow-y-auto card-lift animate-in slide-in-from-bottom-3">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="font-bold text-tertiary flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">smart_toy</span> AI Tutor</h4>
                       <button onClick={() => setAiTutorOpen(false)} className="text-text-secondary hover:text-text-primary"><span className="material-symbols-outlined text-[18px]">close</span></button>
                    </div>
                    {aiTutorLoading ? (
                       <div className="flex items-center gap-2 text-text-secondary">
                          <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Thinking...
                       </div>
                    ) : (
                       <div className="text-sm text-text-primary leading-relaxed">{renderMarkdown(aiTutorResponse)}</div>
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
