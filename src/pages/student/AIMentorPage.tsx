import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AIMentorChat } from '@/components/chat/AIMentorChat';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/db/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useAIRateLimit } from '@/hooks/useAIRateLimit';
import { cn } from '@/lib/utils';

interface MentorAnalytics {
  completedCourses: number;
  averageQuizScore: number;
  strongAreas: string[];
  weakAreas: string[];
}

export default function AIMentorPage() {
  const { user } = useAuth();
  const rateLimit = useAIRateLimit('ai-mentor');
  const [analytics, setAnalytics] = useState<MentorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchAnalytics = async () => {
      try {
        const enrollmentsRef = collection(db, 'user_course_enrollments');
        const enrollmentsQ = query(enrollmentsRef, where('user_id', '==', user.id));
        const enrollmentsSnap = await getDocs(enrollmentsQ);
          
        const quizzesRef = collection(db, 'quiz_attempts');
        const quizzesQ = query(quizzesRef, where('user_id', '==', user.id));
        const quizzesSnap = await getDocs(quizzesQ);

        let completed = 0;
        let categories: Record<string, number> = {};
        
        for (const docSnap of enrollmentsSnap.docs) {
          const e = docSnap.data();
          if (e.completed_at || e.progress_percent === 100) completed++;
          if (e.course_id) {
            const courseDoc = await getDoc(doc(db, 'courses', e.course_id));
            if (courseDoc.exists()) {
              const cat = courseDoc.data().category;
              if (cat) {
                categories[cat] = (categories[cat] || 0) + 1;
              }
            }
          }
        }

        let totalScore = 0;
        let totalMax = 0;
        let strong: string[] = [];
        let weak: string[] = [];

        for (const docSnap of quizzesSnap.docs) {
          const q = docSnap.data();
          totalScore += q.score || 0;
          totalMax += q.total || 0;
          if (q.quiz_id) {
            const quizDoc = await getDoc(doc(db, 'quizzes', q.quiz_id));
            if (quizDoc.exists()) {
              const title = quizDoc.data().title;
              const pct = q.total > 0 ? (q.score / q.total) * 100 : 0;
              if (title) {
                if (pct >= 80) strong.push(title.replace('Quiz: ', ''));
                else if (pct < 60) weak.push(title.replace('Quiz: ', ''));
              }
            }
          }
        }
        
        strong = Array.from(new Set(strong)).slice(0, 3);
        weak = Array.from(new Set(weak)).slice(0, 3);

        if (strong.length === 0) strong = Object.keys(categories).slice(0, 2);
        if (weak.length === 0) weak = ['DSA Algorithms', 'System Design'];

        setAnalytics({
          completedCourses: completed,
          averageQuizScore: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
          strongAreas: strong.length > 0 ? strong : ['Getting Started'],
          weakAreas: weak
        });

      } catch (err) {
        console.error("Failed to load mentor analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  return (
    <AppLayout title="AI Mentor">
      <div className="flex-grow flex flex-col xl:flex-row h-[calc(100vh-80px)] overflow-hidden w-full relative bg-background select-none">
        
        {/* Mentor Analytics Sidebar */}
        <div className="w-full xl:w-[360px] 2xl:w-[420px] shrink-0 border-r border-border bg-card/50 overflow-y-auto hidden xl:block p-6 space-y-6">
          
          <div>
            <h2 className="text-sm font-bold text-foreground mb-1">Loomie Intelligence</h2>
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
              Your personalized AI Mentor constantly analyzes your learning patterns to accelerate your career.
            </p>
          </div>

          {/* Daily AI Usage */}
          {!rateLimit.loading && (
            <Card className="bg-card border-border shadow-sm rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Daily AI Limit</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {rateLimit.used} / {rateLimit.limit}
                </span>
              </div>
              <div className="relative h-2 w-full bg-primary/10 rounded-full overflow-hidden mb-2">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    rateLimit.usagePercent >= 100 ? "bg-destructive" :
                    rateLimit.usagePercent >= 80 ? "bg-amber-500" :
                    "bg-primary"
                  )}
                  style={{ width: `${rateLimit.usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                <span>{rateLimit.remaining} messages left</span>
                {rateLimit.planId === 'free' && (
                  <Link to="/pricing" className="text-primary hover:underline font-bold">
                    Upgrade to Pro
                  </Link>
                )}
              </div>
            </Card>
          )}

          {!loading && analytics ? (
            <div className="space-y-6">
              {/* Core Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card border-border shadow-sm rounded-2xl">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <BookOpen className="w-5 h-5 text-primary mb-2" />
                    <p className="text-xl font-extrabold text-foreground leading-none">{analytics.completedCourses}</p>
                    <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mt-2">Courses Done</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-sm rounded-2xl">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Target className="w-5 h-5 text-primary mb-2" />
                    <p className="text-xl font-extrabold text-foreground leading-none">{analytics.averageQuizScore}%</p>
                    <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mt-2">Avg Quiz Score</p>
                  </CardContent>
                </Card>
              </div>

              {/* Strength Analysis */}
              <Card className="bg-primary/5 border-primary/20 shadow-sm rounded-2xl">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-primary uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" /> Strong Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ul className="space-y-2">
                    {analytics.strongAreas.map(area => (
                      <li key={area} className="flex items-center gap-2 text-foreground text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> 
                        <span className="truncate">{area}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-primary/80 mt-4 font-semibold">
                    Loomie recommends exploring Advanced courses in these topics.
                  </p>
                </CardContent>
              </Card>

              {/* Weakness Analysis */}
              <Card className="bg-destructive/5 border-destructive/20 shadow-sm rounded-2xl">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-destructive uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" /> Focus Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ul className="space-y-2">
                    {analytics.weakAreas.map(area => (
                      <li key={area} className="flex items-center gap-2 text-foreground text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" /> 
                        <span className="truncate">{area}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-destructive/80 mt-4 font-semibold">
                    Ask Loomie to generate a customized 7-day study plan to tackle these weaknesses.
                  </p>
                </CardContent>
              </Card>

            </div>
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-24 bg-muted rounded-2xl w-full" />
              <Skeleton className="h-40 bg-muted rounded-2xl w-full" />
              <Skeleton className="h-40 bg-muted rounded-2xl w-full" />
            </div>
          )}

        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-background relative h-full">
          <AIMentorChat />
        </div>

      </div>
    </AppLayout>
  );
}
export { AIMentorPage };
