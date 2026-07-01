import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ContestsPage() {
  return (
    <AppLayout title="Coding Contests">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Contests</h1>
          <p className="text-on-surface-variant font-label-md mt-1">Compete with others, climb the leaderboard, and improve your rating.</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-on-surface">Upcoming Contests</h2>
          <Card className="bg-primary/5 border border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <CardHeader>
              <Badge className="w-fit mb-2">Registration Open</Badge>
              <CardTitle className="font-display text-2xl text-primary-fixed-dim">Weekly Coder Challenge #42</CardTitle>
              <p className="text-on-surface-variant text-sm mt-1">Starts in 2 days, 14 hours</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button className="bg-primary text-on-primary">Register Now</Button>
                <Button variant="outline">View Details</Button>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-xl font-bold text-on-surface mt-8">Past Contests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[41, 40, 39].map(num => (
              <Card key={num} className="glass-panel border-outline-variant/60">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Weekly Coder Challenge #{num}</CardTitle>
                  <p className="text-xs text-on-surface-variant">Ended 1 week ago</p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" className="w-full" size="sm">Virtual Participation</Button>
                    <Button variant="ghost" className="w-full" size="sm">Standings</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
