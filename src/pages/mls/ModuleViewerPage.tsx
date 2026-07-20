import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Bookmark, BookmarkCheck, FileText, Youtube, HelpCircle, FileQuestion, MessageSquare } from 'lucide-react';
import type { DBMLSModule, DBMLSMaterial, DBMLSPractice } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function ModuleViewerPage() {
  const { trackId, moduleId } = useParams<{ trackId: string, moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [moduleData, setModuleData] = useState<DBMLSModule | null>(null);
  const [materials, setMaterials] = useState<DBMLSMaterial[]>([]);
  const [practiceQs, setPracticeQs] = useState<DBMLSPractice[]>([]);
  
  const [isCompleted, setIsCompleted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simple state for practice answers
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchModuleData = async () => {
      if (!moduleId) return;
      setLoading(true);
      try {
        // Fetch Module
        const modSnap = await getDoc(doc(db, 'mls_modules', moduleId));
          
        if (!modSnap.exists()) {
          toast.error("Module not found");
          navigate(`/mls/${trackId}`);
          return;
        }
        setModuleData({ id: modSnap.id, ...modSnap.data() } as DBMLSModule);

        // Fetch Materials
        const matsQuery = query(
          collection(db, 'mls_materials'),
          where('module_id', '==', moduleId),
          orderBy('order_index', 'asc')
        );
        const matsSnap = await getDocs(matsQuery);
        setMaterials(matsSnap.docs.map(d => ({ id: d.id, ...d.data() } as DBMLSMaterial)));

        // Fetch Practice
        const pracQuery = query(
          collection(db, 'mls_practice'),
          where('module_id', '==', moduleId),
          orderBy('order_index', 'asc')
        );
        const pracSnap = await getDocs(pracQuery);
        setPracticeQs(pracSnap.docs.map(d => ({ id: d.id, ...d.data() } as DBMLSPractice)));

        // Fetch User State
        if (user) {
          const progQuery = query(
            collection(db, 'mls_user_progress'),
            where('user_id', '==', user.id),
            where('module_id', '==', moduleId)
          );
          const progDocs = await getDocs(progQuery);
            
          if (!progDocs.empty) {
            setIsCompleted(progDocs.docs[0].data().status === 'completed');
          } else {
            // Mark as started if opening for the first time
            await addDoc(collection(db, 'mls_user_progress'), {
              user_id: user.id,
              module_id: moduleId,
              status: 'started'
            });
          }

          const bmkQuery = query(
            collection(db, 'mls_bookmarks'),
            where('user_id', '==', user.id),
            where('module_id', '==', moduleId)
          );
          const bmkDocs = await getDocs(bmkQuery);
            
          if (!bmkDocs.empty) {
            setIsBookmarked(true);
          }
        }
      } catch (err) {
        console.error("Error fetching module data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchModuleData();
  }, [moduleId, trackId, navigate, user]);

  const toggleCompletion = async () => {
    if (!user || !moduleData) return;
    
    const newStatus = isCompleted ? 'started' : 'completed';
    setIsCompleted(!isCompleted);
    
    try {
      const progQuery = query(
        collection(db, 'mls_user_progress'),
        where('user_id', '==', user.id),
        where('module_id', '==', moduleData.id)
      );
      const progDocs = await getDocs(progQuery);
      
      const payload = {
        user_id: user.id,
        module_id: moduleData.id,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      };

      if (!progDocs.empty) {
        await updateDoc(doc(db, 'mls_user_progress', progDocs.docs[0].id), payload);
      } else {
        await addDoc(collection(db, 'mls_user_progress'), payload);
      }
      
      if (newStatus === 'completed') toast.success("Module marked as complete! 🎉");
    } catch (error) {
      toast.error("Failed to update progress");
      setIsCompleted(isCompleted); // revert
    }
  };

  const toggleBookmark = async () => {
    if (!user || !moduleData) return;
    
    try {
      if (isBookmarked) {
        setIsBookmarked(false);
        const bmkQuery = query(
          collection(db, 'mls_bookmarks'),
          where('user_id', '==', user.id),
          where('module_id', '==', moduleData.id)
        );
        const bmkDocs = await getDocs(bmkQuery);
        if (!bmkDocs.empty) {
          await deleteDoc(doc(db, 'mls_bookmarks', bmkDocs.docs[0].id));
        }
        toast.info("Bookmark removed");
      } else {
        setIsBookmarked(true);
        await addDoc(collection(db, 'mls_bookmarks'), { user_id: user.id, module_id: moduleData.id });
        toast.success("Module bookmarked");
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading Module...">
        <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">
          <Skeleton className="h-10 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!moduleData) return null;

  // Extract YouTube ID if it's a video type
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <AppLayout title={moduleData.title}>
      <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full bg-background space-y-6">
        
        {/* Navigation & Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Link to={`/mls/${trackId}`} className="inline-flex items-center text-sm text-on-surface-variant hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Track
          </Link>
          
          <div className="flex gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              className={`flex-1 md:flex-none ${isBookmarked ? 'bg-primary/10 text-primary border-primary' : ''}`}
              onClick={toggleBookmark}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4 mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
              {isBookmarked ? 'Saved' : 'Save for later'}
            </Button>
            <Button 
              variant={isCompleted ? "outline" : "default"} 
              className={`flex-1 md:flex-none ${isCompleted ? 'bg-green-500/10 text-green-600 border-green-500 hover:bg-green-500/20' : ''}`}
              onClick={toggleCompletion}
            >
              {isCompleted ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2 opacity-50" />}
              {isCompleted ? 'Completed' : 'Mark as Complete'}
            </Button>
          </div>
        </div>

        {/* Title Block */}
        <div className="bg-surface rounded-2xl p-6 md:p-8 border border-outline-variant shadow-sm relative overflow-hidden">
          {isCompleted && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          )}
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-on-surface mb-3 pr-8">{moduleData.title}</h1>
          <p className="text-on-surface-variant text-lg leading-relaxed">{moduleData.description}</p>
        </div>

        {/* Learning Materials */}
        <div className="space-y-6">
          {materials.map((mat) => (
            <Card key={mat.id} className="glass-panel border-outline-variant/60 shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant/50 flex items-center gap-2">
                {mat.type === 'video' && <Youtube className="w-5 h-5 text-red-500" />}
                {mat.type === 'pdf' && <FileText className="w-5 h-5 text-blue-500" />}
                {mat.type === 'notes' && <MessageSquare className="w-5 h-5 text-tertiary" />}
                <h3 className="font-bold text-on-surface">{mat.title}</h3>
              </div>
              <CardContent className="p-0">
                {mat.type === 'video' && mat.url && (
                  <div className="aspect-video w-full bg-black">
                    <iframe 
                      src={`https://www.youtube.com/embed/${getYoutubeId(mat.url)}`} 
                      title={mat.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
                
                {mat.type === 'pdf' && mat.url && (
                  <div className="p-8 flex flex-col items-center justify-center text-center bg-surface-container-lowest">
                    <FileText className="w-16 h-16 text-outline-variant mb-4" />
                    <p className="text-on-surface-variant mb-4">This module includes a PDF document.</p>
                    <a href={mat.url} target="_blank" rel="noopener noreferrer">
                      <Button>View Document</Button>
                    </a>
                  </div>
                )}
                
                {mat.type === 'notes' && mat.content && (
                  <div className="p-6 md:p-8 prose prose-sm md:prose-base dark:prose-invert max-w-none">
                    <ReactMarkdown>{mat.content}</ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Practice Questions */}
        {practiceQs.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2 mb-6">
              <HelpCircle className="w-6 h-6 text-primary" />
              Practice Questions
            </h2>
            
            {practiceQs.map((q, idx) => (
              <Card key={q.id} className="border-outline-variant/60 shadow-sm bg-surface">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 shrink-0 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-4">
                      <p className="text-on-surface font-medium text-lg leading-relaxed">{q.question}</p>
                      
                      {!showAnswer[q.id] ? (
                        <Button variant="outline" size="sm" onClick={() => setShowAnswer(prev => ({...prev, [q.id]: true}))}>
                          Show Answer
                        </Button>
                      ) : (
                        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/50 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="font-bold text-sm text-green-600">Answer</span>
                          </div>
                          <p className="text-on-surface mb-3 whitespace-pre-wrap">{q.answer}</p>
                          
                          {q.explanation && (
                            <>
                              <div className="flex items-center gap-2 mb-2 mt-4 pt-4 border-t border-outline-variant/30">
                                <FileQuestion className="w-4 h-4 text-tertiary" />
                                <span className="font-bold text-sm text-tertiary">Explanation</span>
                              </div>
                              <p className="text-on-surface-variant text-sm whitespace-pre-wrap leading-relaxed">{q.explanation}</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* End of Module Action */}
        <div className="pt-12 pb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className={`w-8 h-8 ${isCompleted ? 'text-green-500' : 'text-outline-variant'}`} />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">
            {isCompleted ? "You've completed this module!" : "Done with this module?"}
          </h3>
          <p className="text-on-surface-variant mb-6 max-w-md">
            {isCompleted 
              ? "Great job! Head back to the track to continue your learning journey." 
              : "Mark it as complete to track your progress and unlock achievements."}
          </p>
          <div className="flex gap-4">
            <Link to={`/mls/${trackId}`}>
              <Button variant="outline">Back to Track</Button>
            </Link>
            {!isCompleted && (
              <Button onClick={toggleCompletion} className="bg-green-600 hover:bg-green-700 text-white">
                Complete Module
              </Button>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
