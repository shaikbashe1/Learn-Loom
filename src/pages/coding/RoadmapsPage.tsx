import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function RoadmapsPage() {
  const roadmaps = [
    { title: 'Data Structures & Algorithms', level: 'Intermediate', progress: 45, icon: 'account_tree' },
    { title: 'Frontend Mastery', level: 'Advanced', progress: 12, icon: 'web' },
    { title: 'Backend with Node.js', level: 'Intermediate', progress: 0, icon: 'dns' },
    { title: 'SQL & Databases', level: 'Beginner', progress: 80, icon: 'database' },
  ];

  return (
    <AppLayout title="Coding Roadmaps">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Learning Roadmaps</h1>
          <p className="text-on-surface-variant font-label-md mt-1">Structured paths to master specific domains and ace interviews.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roadmaps.map((r, i) => (
            <Card key={i} className="glass-panel border-outline-variant/60">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[28px]">{r.icon}</span>
                </div>
                <div>
                  <CardTitle className="font-display text-lg">{r.title}</CardTitle>
                  <p className="text-xs text-on-surface-variant">{r.level}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-on-surface font-medium">Progress</span>
                    <span className="text-primary font-bold">{r.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${r.progress}%` }}></div>
                  </div>
                  <Button className="w-full" variant={r.progress > 0 ? "default" : "outline"}>
                    {r.progress > 0 ? 'Continue Roadmap' : 'Start Roadmap'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
