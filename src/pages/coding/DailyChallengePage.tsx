import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function DailyChallengePage() {
  const challenges = [
    { id: '1', title: 'Two Sum', difficulty: 'Beginner', xp: 20 },
    { id: '2', title: 'Add Two Numbers', difficulty: 'Intermediate', xp: 50 },
    { id: '3', title: 'Median of Two Sorted Arrays', difficulty: 'Advanced', xp: 100 },
  ];

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {challenges.map((c) => (
            <Card key={c.id} className="glass-panel border-outline-variant/60 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader className="text-center pb-2">
                <Badge className={`mx-auto mb-2 bg-transparent border-0
                  ${c.difficulty === 'Beginner' ? 'text-[#4ade80]' : c.difficulty === 'Intermediate' ? 'text-tertiary' : 'text-error'}
                `}>
                  {c.difficulty}
                </Badge>
                <CardTitle className="font-display text-xl">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-center justify-center gap-1 text-[#facc15] font-bold mb-6">
                  <span className="material-symbols-outlined text-[18px]">stars</span>
                  +{c.xp} XP Bonus
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
      </div>
    </AppLayout>
  );
}
