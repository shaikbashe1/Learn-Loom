import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '@/db/firebase';
import { collection, getDocs, query, orderBy, limit, where, documentId } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ChallengeProblem {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  credits: number;
}

export default function DailyChallengePage() {
  const [challenges, setChallenges] = useState<ChallengeProblem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDailyChallenge() {
      try {
        const dailyQuery = query(collection(db, 'daily_challenges'), orderBy('date', 'desc'), limit(1));
        const dailySnap = await getDocs(dailyQuery);
        
        if (!dailySnap.empty) {
          const dailyData = dailySnap.docs[0].data();
          const problemIds = [dailyData.easy_problem_id, dailyData.medium_problem_id, dailyData.hard_problem_id].filter(Boolean);
          
          if (problemIds.length > 0) {
            const problemsQuery = query(
              collection(db, 'coding_problems'),
              where(documentId(), 'in', problemIds)
            );
            const problemsSnap = await getDocs(problemsQuery);
            const problemsData = problemsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as ChallengeProblem[];

            // Sort them Easy, Medium, Hard
            const diffOrder: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };
            const sorted = problemsData.sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]);
            setChallenges(sorted);
          }
        }
      } catch (err: any) {
        toast.error('Failed to load daily challenges', { description: err.message });
      } finally {
        setLoading(false);
      }
    }

    loadDailyChallenge();
  }, []);

  return (
    <AppLayout title="Daily Challenge">
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        
        <div className="text-center space-y-4 mb-8">
          <span className="material-symbols-outlined text-[64px] text-tertiary drop-shadow-[0_0_15px_rgba(var(--tertiary),0.5)]">local_fire_department</span>
          <h1 className="text-4xl font-bold font-display text-on-surface">Daily Coding Challenge</h1>
          <p className="text-on-surface-variant font-label-md max-w-2xl mx-auto">
            Complete today's challenges to earn bonus XP and maintain your coding streak. 
            Challenges refresh every 24 hours.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass-panel border-outline-variant/60">
                <CardHeader className="text-center pb-2">
                  <Skeleton className="h-6 w-24 mx-auto mb-2 rounded-full" />
                  <Skeleton className="h-8 w-48 mx-auto" />
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <Skeleton className="h-6 w-32 mx-auto" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center p-12 glass-panel border border-outline-variant/60 rounded-xl">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-30">hourglass_empty</span>
            <h2 className="text-xl font-bold text-on-surface">No Challenges Available</h2>
            <p className="text-on-surface-variant mt-2">Check back later for new daily challenges.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {challenges.map((c) => (
              <Card key={c.id} className="glass-panel border-outline-variant/60 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <CardHeader className="text-center pb-2">
                  <Badge className={`mx-auto mb-2 bg-transparent border-0
                    ${c.difficulty === 'Beginner' ? 'text-[#4ade80]' : c.difficulty === 'Intermediate' ? 'text-tertiary' : 'text-error'}
                  `}>
                    {c.difficulty === 'Beginner' ? 'Easy' : c.difficulty === 'Intermediate' ? 'Medium' : 'Hard'}
                  </Badge>
                  <CardTitle className="font-display text-xl">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[#facc15] font-bold mb-6">
                    <span className="material-symbols-outlined text-[18px]">stars</span>
                    +{c.credits} XP
                  </div>
                  <Link to={`/coding/problems/${c.id}`}>
                    <Button className="w-full bg-primary text-on-primary shadow-md hover:brightness-110">
                      Solve Challenge
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
