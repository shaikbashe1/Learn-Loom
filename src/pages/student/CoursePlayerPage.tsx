import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { auth, db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseModuleProgress, completeModule, getEnrollment } from '@/lib/progress';
import { logUserActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/sanitize';
import { buildYouTubeEmbedUrl } from '@/lib/youtube';
import { renderMarkdown } from '@/lib/markdown';
import { formatDistanceToNow } from 'date-fns';
import { MarkdownToolbar, insertFormat } from '@/components/shared/MarkdownToolbar';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import { 
  Play, 
  CheckCircle2, 
  Circle, 
  Lock, 
  BookOpen, 
  MessageSquare, 
  HelpCircle, 
  Send, 
  RefreshCw, 
  Bot, 
  Check, 
  AlertTriangle, 
  BookOpenCheck,
  Code, 
  Sparkles, 
  ArrowLeft,
  Download,
  X,
  Lightbulb,
  FileQuestion,
  GraduationCap,
  FileText
} from 'lucide-react';
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
      const qPosts = query(
        collection(db, 'forum_posts'),
        where('course_id', '==', courseId),
        where('module_id', '==', moduleId),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(qPosts);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (data && data.length > 0) {
        const uids = Array.from(new Set(data.map((d: any) => d.user_id)));
        const profs = await Promise.all(uids.map(async (uid: any) => {
          const d = await getDoc(doc(db, 'profiles', uid));
          return { id: d.id, ...d.data() };
        }));
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
      const qReplies = query(
        collection(db, 'forum_replies'),
        where('post_id', '==', postId),
        where('parent_id', '==', null),
        orderBy('is_accepted', 'desc'),
        orderBy('created_at', 'asc')
      );
      const snapshot = await getDocs(qReplies);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (data && data.length > 0) {
        const uids = Array.from(new Set(data.map((r: any) => r.user_id)));
        const profs = await Promise.all(uids.map(async (uid: any) => {
          const d = await getDoc(doc(db, 'profiles', uid));
          return { id: d.id, ...d.data() };
        }));
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
        
      const systemPrompt = `You are Loomie AI, the friendly and knowledgeable AI mentor on the Quovexi educational platform. A student has posted a question in the lesson discussions for this module. Provide a clean, helpful, and structured response using Markdown.
      
Lesson Context:
Course ID: ${courseId}
Module ID: ${moduleId}

Post Title: "${title}"
Post Content: "${content}"
${isReply ? `Previous replies:\n${threadContext}\n\nStudent query: "${userQuery}"` : ''}`;

      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

      const token = await auth.currentUser?.getIdToken() ?? '';

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
        await addDoc(collection(db, 'forum_replies'), {
          post_id: postId,
          parent_id: null,
          user_id: currentUserId,
          content: aiText.trim(),
          is_ai: true,
          created_at: new Date().toISOString()
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

    let data: any;
    let error: any;
    try {
      const docRef = await addDoc(collection(db, 'forum_posts'), {
        user_id: currentUserId,
        course_id: courseId,
        module_id: moduleId,
        title: postTitle,
        content: postContent,
        category: 'doubt',
        reply_count: 0,
        created_at: new Date().toISOString()
      });
      data = [{ id: docRef.id }];
    } catch (e: any) {
      error = e.message;
    }

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

    let data: any;
    let error: any;
    try {
      const docRef = await addDoc(collection(db, 'forum_replies'), {
        post_id: postId,
        parent_id: null,
        user_id: currentUserId,
        content: textToSend,
        is_ai: false,
        is_accepted: false,
        created_at: new Date().toISOString()
      });
      data = [{ id: docRef.id }];
    } catch (e: any) {
      error = e.message;
    }

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
          <Skeleton className="h-16 w-full rounded-xl bg-muted" />
          <Skeleton className="h-16 w-full rounded-xl bg-muted" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 border border-border border-dashed rounded-xl bg-card">
          <MessageSquare className="w-8 h-8 text-muted-foreground/45 mx-auto mb-2" />
          <p className="text-xs font-bold text-foreground mb-1">No questions yet</p>
          <p className="text-[10px] text-muted-foreground px-4">Be the first to post a doubt or check back later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const isExpanded = expandedPostId === post.id;
            
            return (
              <div key={post.id} className="border border-border rounded-xl bg-card p-4 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <UserAvatar src={post.profiles?.avatar_url} name={post.profiles?.full_name || ''} size="sm" />
                  <div>
                    <h5 className="text-xs font-bold text-foreground leading-none">{post.profiles?.full_name ?? 'Student'}</h5>
                    <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1">{post.title}</h4>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    {renderMarkdown(post.content)}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                  <button
                    onClick={() => handleExpandPost(post.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-semibold min-h-[28px]"
                  >
                    <MessageSquare size={14} />
                    {post.reply_count} Comments
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t border-border/40 pt-3 space-y-3">
                    {loadingReplies ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 justify-center">
                        <RefreshCw className="animate-spin w-4 h-4" /> Loading...
                      </div>
                    ) : replies.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic text-center py-2">No responses yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
                        {replies.map(reply => (
                          <div key={reply.id} className="flex gap-2 items-start text-xs">
                            {reply.is_ai ? (
                              <div className="w-6 h-6 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/20">
                                <Bot className="w-3.5 h-3.5 animate-pulse" />
                              </div>
                            ) : (
                              <UserAvatar src={reply.profiles?.avatar_url} name={reply.profiles?.full_name || ''} size="xs" />
                            )}

                            <div className={`flex-1 rounded-xl px-3 py-2.5 border ${reply.is_ai ? 'bg-primary/5 border-primary/10' : 'bg-muted/30 border-border'}`}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-foreground text-[11px]">{reply.is_ai ? 'Loomie AI' : reply.profiles?.full_name ?? 'Student'}</span>
                                  {reply.is_ai && <span className="bg-primary/20 text-primary text-[8px] font-bold px-1 rounded">BOT</span>}
                                  {reply.is_accepted && (
                                    <span className="text-emerald-500 font-bold text-[9px] flex items-center gap-0.5">
                                      <Check className="w-3.5 h-3.5" /> Accepted
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                              </div>
                              <div className="text-muted-foreground leading-relaxed text-[11px]">
                                {renderMarkdown(reply.content)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                      
                      <MarkdownToolbar 
                        textareaRef={replyComposerRef.current} 
                        textValue={replyText} 
                        setValue={setReplyText} 
                      />

                      <div className="flex gap-2 justify-end mb-1">
                        <button
                          type="button"
                          onClick={() => setReplyMode('write')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${replyMode === 'write' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                        >
                          Write
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyMode('preview')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${replyMode === 'preview' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
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
                          className="w-full bg-background border border-border rounded-b-xl p-2 text-xs text-foreground focus:outline-none focus:border-primary min-h-[60px] resize-none"
                        />
                      ) : (
                        <div className="w-full bg-background border border-border rounded-b-xl p-2 text-xs text-muted-foreground min-h-[60px] leading-relaxed shadow-sm">
                          {replyText.trim() ? renderMarkdown(replyText) : <span className="italic text-muted-foreground">Nothing to preview.</span>}
                        </div>
                      )}

                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => submitReply(post.id)}
                          disabled={!replyText.trim() || replyPosting}
                          className="bg-primary text-primary-foreground hover:opacity-90 px-3 py-1 rounded-lg text-xs font-bold transition-all min-h-[28px]"
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

    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    const courseData = courseDoc.exists() ? { id: courseDoc.id, ...courseDoc.data() } as DBCourse : null;
    if (!courseData) { navigate('/courses'); return; }
    setCourse(courseData);

    const modsSnap = await getDocs(query(collection(db, 'course_modules'), where('course_id', '==', courseId), orderBy('order_index', 'asc')));
    const moduleList: DBModule[] = modsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DBModule[];

    const enrollment = await getEnrollment(user.id, courseId);
    if (!enrollment) { navigate(`/courses/${courseId}`); return; }

    setProgressPercent(enrollment.progress_percent);
    if (enrollment.completed_at) setCourseDone(true);

    const codingSnap = await getDocs(query(collection(db, 'coding_questions'), where('course_id', '==', courseId), limit(1)));
    setHasCodingQuestions(!codingSnap.empty);

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
      const qSnap = await getDocs(query(collection(db, 'quizzes'), where('module_id', '==', currentActive.id), orderBy('quiz_type')));
      const qData = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Load coding assessment for this module
      const cSnap = await getDocs(query(collection(db, 'coding_questions'), where('module_id', '==', currentActive.id), limit(1)));
      const cData = cSnap.empty ? null : { id: cSnap.docs[0].id };
      
      currentActive.quizzes = qData || [];
      currentActive.codingId = cData?.id || null;

      // Check which are passed
      const qIds = currentActive.quizzes.map((q: DBQuiz) => q.id);
      if (qIds.length > 0) {
        const attemptsSnap = await getDocs(query(collection(db, 'quiz_attempts'), where('user_id', '==', user.id), where('passed', '==', true)));
        const attempts = attemptsSnap.docs.map(d => d.data()).filter(a => qIds.includes(a.quiz_id));
        currentActive.passedQuizzes = attempts.map((a: any) => a.quiz_id);
      } else {
        currentActive.passedQuizzes = [];
      }

      // Check if coding is passed
      if (currentActive.codingId) {
         const cAttSnap = await getDocs(query(collection(db, 'assessment_attempts'), where('user_id', '==', user.id), where('module_id', '==', currentActive.id), where('is_passed', '==', true), limit(1)));
         currentActive.codingPassed = !cAttSnap.empty;
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

      const token = await auth.currentUser?.getIdToken() ?? '';

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
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 select-none">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <h2 className="text-lg font-bold text-foreground">Course failed to load</h2>
          <Link to="/courses" className="px-5 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
            Back to Catalog
          </Link>
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
    <AppLayout>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col lg:flex-row gap-gutter">
        
        {/* Mobile curriculum trigger */}
        <div className="lg:hidden flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-sm mb-2 select-none">
          <span className="text-xs font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-primary" />
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
        <aside className="hidden lg:flex w-[320px] flex-col gap-6 shrink-0 sticky top-24 self-start select-none">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm w-full flex flex-col">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="text-primary w-4.5 h-4.5" />
              Curriculum Roadmap
            </h3>
            
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
              {modules.map((mod, i) => {
                const isCurrent = mod.id === activeModule.id;
                const isLocked = mod.status === 'locked';
                const isDone = mod.status === 'completed';

                return (
                  <button
                    key={mod.id}
                    disabled={isLocked}
                    onClick={() => setActiveModule(mod)}
                    className={cn(
                      "flex items-start gap-3 w-full text-left p-3.5 rounded-xl border transition-all",
                      isCurrent 
                        ? 'bg-primary/5 border-primary/25 text-primary shadow-sm font-semibold' 
                        : isLocked 
                          ? 'opacity-40 cursor-not-allowed border-border bg-muted/40' 
                          : 'bg-card hover:bg-muted/40 border-border text-foreground hover:border-primary/20'
                    )}
                  >
                    <div className="mt-0.5 shrink-0 flex items-center justify-center">
                      {isDone ? (
                        <CheckCircle2 className="text-success w-4.5 h-4.5" />
                      ) : isCurrent ? (
                        <Play className="text-primary w-4.5 h-4.5 animate-pulse" />
                      ) : isLocked ? (
                        <Lock className="text-muted-foreground w-4.5 h-4.5" />
                      ) : (
                        <Circle className="text-primary w-4.5 h-4.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Module {i + 1}</div>
                      <div className="text-xs font-bold leading-snug truncate">{mod.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Mobile Curriculum Sheet */}
        <Sheet open={curriculumOpen} onOpenChange={setCurriculumOpen}>
          <SheetContent side="left" className="w-[300px] p-6 bg-card select-none">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                 <BookOpen className="text-primary w-4.5 h-4.5" />
                 Curriculum Roadmap
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[85vh] pr-1 scrollbar-hide">
              {modules.map((mod, i) => {
                const isCurrent = mod.id === activeModule.id;
                const isLocked = mod.status === 'locked';
                const isDone = mod.status === 'completed';

                return (
                  <button
                    key={mod.id}
                    disabled={isLocked}
                    onClick={() => { setActiveModule(mod); setCurriculumOpen(false); }}
                    className={cn(
                      "flex items-start gap-3 w-full text-left p-3.5 rounded-xl border transition-all",
                      isCurrent 
                        ? 'bg-primary/5 border-primary/25 text-primary font-semibold' 
                        : isLocked 
                          ? 'opacity-40 cursor-not-allowed border-border bg-muted/40' 
                          : 'bg-card hover:bg-muted/40 border-border text-foreground'
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="text-success w-4.5 h-4.5" />
                      ) : isCurrent ? (
                        <Play className="text-primary w-4.5 h-4.5" />
                      ) : isLocked ? (
                        <Lock className="text-muted-foreground w-4.5 h-4.5" />
                      ) : (
                        <Circle className="text-primary w-4.5 h-4.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Module {i + 1}</div>
                      <div className="text-xs font-bold leading-snug truncate">{mod.title}</div>
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
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm flex flex-col gap-6">
            
            {/* Video Player */}
            {activeModule.youtube_url ? (
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-md bg-black border border-border">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={buildYouTubeEmbedUrl(activeModule.youtube_url ?? '') ?? undefined}
                  title={activeModule.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-md bg-muted/30 border border-border flex flex-col items-center justify-center text-center p-6 select-none">
                <Bot className="w-12 h-12 text-primary mb-4 animate-bounce" />
                <h3 className="text-sm font-bold text-foreground mb-1">Interactive Lesson Module</h3>
                <p className="text-xs text-muted-foreground max-w-md">No video file. Review module concepts and complete the tasks below.</p>
              </div>
            )}

            {/* Title block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl text-foreground font-extrabold tracking-tight leading-tight">{activeModule.title}</h1>
                <p className="text-xs text-muted-foreground max-w-2xl">{activeModule.description}</p>
              </div>

              {/* Complete state */}
              {isCompleted ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full font-bold text-xs w-fit select-none shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5" /> Verified Complete
                </div>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={completing || !canMarkComplete}
                  className="bg-primary hover:opacity-90 text-primary-foreground px-5 py-2.5 rounded-full font-bold text-xs shadow-md transition-all shrink-0 min-h-[40px]"
                >
                  {completing ? 'Saving...' : 'Mark Completed'}
                  <Check className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>

            {/* Lesson Module Content Body */}
            {activeModule.content && (
              <div className="border-t border-border pt-6">
                <div className="text-muted-foreground leading-relaxed text-xs sm:text-sm max-w-none">
                  {renderMarkdown(activeModule.content)}
                </div>
              </div>
            )}

            {/* Assessment Warning Gate */}
            {!isCompleted && !canMarkComplete && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex gap-3 items-start select-none">
                <AlertTriangle className="text-warning mt-0.5 w-5 h-5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1">Locked Actions Remain</h4>
                  <p className="text-[11px] text-muted-foreground">Please complete and pass all required quizzes and coding assessments below to unlock completion progress.</p>
                </div>
              </div>
            )}

            {/* Assessment Cards */}
            {(hasQuizzes || activeModule.codingId) && (
              <div className="flex flex-col gap-4 border-t border-border pt-6 select-none">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <BookOpenCheck className="text-primary w-4.5 h-4.5" /> Module Tasks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quizzes */}
                  {activeModule.quizzes?.map((quiz, qidx) => {
                    const isPassed = passedQuizIds.includes(quiz.id);
                    return (
                      <div key={quiz.id} className="border border-border bg-card rounded-xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                            isPassed ? 'bg-success/10 border-success/20 text-success' : 'bg-muted border-border text-muted-foreground'
                          )}>
                            {isPassed ? <CheckCircle2 size={20} /> : <FileQuestion size={20} />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Quiz {qidx + 1}</h4>
                            <h4 className="text-xs font-bold text-foreground truncate">{quiz.title}</h4>
                          </div>
                        </div>
                        {isPassed ? (
                          <span className="text-[11px] font-bold text-success flex items-center gap-0.5 shrink-0">
                            <Check className="w-3.5 h-3.5" /> Passed
                          </span>
                        ) : (
                          <Link to={`/quiz/${quiz.id}`} className="px-4 py-1.5 bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold rounded-lg shrink-0 min-h-[32px] flex items-center">
                            Start
                          </Link>
                        )}
                      </div>
                    );
                  })}

                  {/* Coding Assessment */}
                  {activeModule.codingId && (
                    <div className="border border-border bg-card rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                          activeModule.codingPassed ? 'bg-success/10 border-success/20 text-success' : 'bg-muted border-border text-muted-foreground'
                        )}>
                          {activeModule.codingPassed ? <CheckCircle2 size={20} /> : <Code size={20} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Challenge</h4>
                          <h4 className="text-xs font-bold text-foreground truncate">Coding Practice</h4>
                        </div>
                      </div>
                      {activeModule.codingPassed ? (
                        <span className="text-[11px] font-bold text-success flex items-center gap-0.5 shrink-0">
                          <Check className="w-3.5 h-3.5" /> Passed
                        </span>
                      ) : (
                        <Link to={`/coding?module=${activeModule.id}`} className="px-4 py-1.5 bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold rounded-lg shrink-0 min-h-[32px] flex items-center">
                          Code
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details & Community Tabs */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex border-b border-border gap-6 overflow-x-auto scrollbar-hide select-none">
              <button onClick={() => setActiveTab('overview')} className={cn("pb-4 text-xs font-bold transition-colors", activeTab === 'overview' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>
                Overview & Notes
              </button>
              <button onClick={() => setActiveTab('resources')} className={cn("pb-4 text-xs font-bold transition-colors", activeTab === 'resources' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>
                Resources
              </button>
              <button onClick={() => setActiveTab('discussion')} className={cn("pb-4 text-xs font-bold transition-colors", activeTab === 'discussion' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>
                Discussion
              </button>
            </div>

            <div className="pt-2">
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-8">
                  {/* Key Concepts */}
                  {activeModule.key_concepts && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-2 select-none">
                        <Sparkles className="text-primary w-4.5 h-4.5" /> Key Concepts
                      </h3>
                      <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-1">
                        {renderMarkdown(formatMarkdownContent(activeModule.key_concepts))}
                      </div>
                    </div>
                  )}

                  {/* Real World Use Cases */}
                  {activeModule.real_world_use_cases && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-2 select-none">
                        <Sparkles className="text-primary w-4.5 h-4.5" /> Real-World Scenarios
                      </h3>
                      <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-1">
                        {renderMarkdown(formatMarkdownContent(activeModule.real_world_use_cases))}
                      </div>
                    </div>
                  )}

                  {/* Examples */}
                  {activeModule.examples && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-2 select-none">
                        <Code className="text-primary w-4.5 h-4.5" /> Code Walkthroughs
                      </h3>
                      <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-1">
                        {renderMarkdown(formatMarkdownContent(activeModule.examples))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {activeModule.summary && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-2 select-none">
                        <BookOpen className="text-primary w-4.5 h-4.5" /> Module Summary
                      </h3>
                      <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-1">
                        {renderMarkdown(activeModule.summary)}
                      </div>
                    </div>
                  )}

                  {/* Course Completion / Exam unlocked banner */}
                  {courseDone && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm mt-4 select-none animate-fade-in">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground mb-1">Course Assessments Completed</h4>
                          <p className="text-xs text-muted-foreground leading-normal">You have completed all lesson modules. Take your final exams to earn your verified certificate!</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                        <Link to={`/courses/${courseId}/assessment`} className="px-5 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all text-center flex items-center gap-2 justify-center">
                          <FileQuestion className="w-4.5 h-4.5" /> MCQ Exam
                        </Link>
                        {hasCodingQuestions && (
                          <Link to={`/courses/${courseId}/coding-assessment`} className="px-5 py-2 bg-card text-primary border border-primary rounded-xl font-bold text-xs shadow-sm hover:bg-primary/5 transition-all text-center flex items-center gap-2 justify-center">
                            <Code className="w-4.5 h-4.5" /> Coding Exam
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'resources' && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-muted-foreground select-none">Resources and references for this module.</p>
                  {activeModule.notes_url && (
                    <a href={activeModule.notes_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/25 transition-all group cursor-pointer select-none">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Module Notes (PDF)</h4>
                        <p className="text-[10px] text-muted-foreground">Downloadable study material</p>
                      </div>
                      <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
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
                <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 max-h-96 overflow-y-auto card-lift animate-in slide-in-from-bottom-3">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" /> AI Tutor
                    </h4>
                    <button onClick={() => setAiTutorOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {aiTutorLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <RefreshCw className="animate-spin w-4 h-4" /> Thinking...
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground leading-relaxed font-normal">
                      {renderMarkdown(aiTutorResponse)}
                    </div>
                  )}
                </div>
              )}
              
              {!aiTutorOpen && (
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => askAiTutor('simplify')} className="bg-card text-foreground border border-border px-4 py-2 rounded-full text-[11px] font-semibold shadow-md hover:bg-muted/40 transition-all flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Simplify
                  </button>
                  <button onClick={() => askAiTutor('example')} className="bg-card text-foreground border border-border px-4 py-2 rounded-full text-[11px] font-semibold shadow-md hover:bg-muted/40 transition-all flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-primary" /> Give Example
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
