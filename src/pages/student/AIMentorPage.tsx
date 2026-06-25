import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AIMentorChat } from '@/components/chat/AIMentorChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';

interface MentorAnalytics {
  completedCourses: number;
  averageQuizScore: number;
  strongAreas: string[];
  weakAreas: string[];
}

export default function AIMentorPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<MentorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchAnalytics = async () => {
      try {
        const { data: enrollments } = await supabase
          .from('user_course_enrollments')
          .select('progress_percent, completed_at, courses(category)')
          .eq('user_id', user.id);
          
        const { data: quizzes } = await supabase
          .from('quiz_attempts')
          .select('score, total, passed, quizzes(title, is_grand_test)')
          .eq('user_id', user.id);

        let completed = 0;
        let categories: Record<string, number> = {};
        
        if (enrollments) {
          enrollments.forEach(e => {
            if (e.completed_at || e.progress_percent === 100) completed++;
            const c = (Array.isArray(e.courses) ? e.courses[0] : e.courses) as { category: string } | null;
            const cat = c?.category;
            if (cat) {
              categories[cat] = (categories[cat] || 0) + 1;
            }
          });
        }

        let totalScore = 0;
        let totalMax = 0;
        let strong: string[] = [];
        let weak: string[] = [];

        if (quizzes && quizzes.length > 0) {
          quizzes.forEach(q => {
            totalScore += q.score;
            totalMax += q.total;
            const quiz = (Array.isArray(q.quizzes) ? q.quizzes[0] : q.quizzes) as { title: string; is_grand_test: boolean } | null;
            const title = quiz?.title;
            const pct = (q.score / q.total) * 100;
            if (title) {
              if (pct >= 80) strong.push(title.replace('Quiz: ', ''));
              else if (pct < 60) weak.push(title.replace('Quiz: ', ''));
            }
          });
        }
        
        // Deduplicate
        strong = Array.from(new Set(strong)).slice(0, 3);
        weak = Array.from(new Set(weak)).slice(0, 3);

        if (strong.length === 0) strong = Object.keys(categories).slice(0, 2);
        if (weak.length === 0) weak = ['DSA Algorithms', 'System Design']; // Default placeholders if no bad scores

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
      <div className="flex-1 flex flex-col xl:flex-row h-[calc(100vh-80px)] overflow-hidden w-full relative bg-background">
        
        {/* Mentor Analytics Sidebar */}
        <div className="w-full xl:w-[400px] 2xl:w-[500px] shrink-0 border-r border-outline-variant/40 bg-surface/50 overflow-y-auto hidden lg:block p-6 space-y-6">
          
          <div>
            <h2 className="text-2xl font-heading font-bold text-on-surface mb-2">Loomie Intelligence</h2>
            <p className="text-on-surface-variant font-body-md">Your personalized AI Mentor constantly analyzes your learning patterns to accelerate your career.</p>
          </div>

          {!loading && analytics ? (
            <div className="space-y-6">
              {/* Core Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-surface border-outline-variant shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <BookOpen className="w-6 h-6 text-primary mb-2" />
                    <p className="text-3xl font-bold text-on-surface">{analytics.completedCourses}</p>
                    <p className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Courses Done</p>
                  </CardContent>
                </Card>
                <Card className="bg-surface border-outline-variant shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Target className="w-6 h-6 text-secondary mb-2" />
                    <p className="text-3xl font-bold text-on-surface">{analytics.averageQuizScore}%</p>
                    <p className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Avg Quiz Score</p>
                  </CardContent>
                </Card>
              </div>

              {/* Strength Analysis */}
              <Card className="bg-primary/5 border-primary/20 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <TrendingUp className="w-5 h-5" /> Strong Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analytics.strongAreas.map(area => (
                      <li key={area} className="flex items-center gap-2 text-on-surface font-body-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {area}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-primary/80 mt-4">Loomie recommends exploring Advanced courses in these topics.</p>
                </CardContent>
              </Card>

              {/* Weakness Analysis */}
              <Card className="bg-error/5 border-error/20 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-error">
                    <AlertTriangle className="w-5 h-5" /> Focus Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analytics.weakAreas.map(area => (
                      <li key={area} className="flex items-center gap-2 text-on-surface font-body-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-error" /> {area}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-error/80 mt-4">Ask Loomie to generate a customized 7-day study plan to tackle these weaknesses.</p>
                </CardContent>
              </Card>

            </div>
          ) : (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-surface-container rounded-xl w-full" />
              <div className="h-40 bg-surface-container rounded-xl w-full" />
              <div className="h-40 bg-surface-container rounded-xl w-full" />
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
