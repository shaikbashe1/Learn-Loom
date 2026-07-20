import { AppLayout } from '@/components/layouts/AppLayout';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Contest {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
}

interface ContestProblem {
  id: string;
  problem_id: string;
  points: number;
  order_index: number;
  coding_problems: {
    id: string;
    title: string;
    difficulty: string;
  };
}

interface LeaderboardEntry {
  user_id: string;
  score: number;
  finish_time_ms: number;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

export default function ContestDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  
  const { user } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContest() {
      if (!id) return;
      try {
        const contestDoc = await getDoc(doc(db, 'contests', id));
        if (!contestDoc.exists()) throw new Error('Contest not found');
        setContest({ id: contestDoc.id, ...contestDoc.data() } as Contest);

        if (user) {
          const pQuery = query(collection(db, 'contest_participants'), where('contest_id', '==', id), where('user_id', '==', user.id));
          const pSnap = await getDocs(pQuery);
          if (!pSnap.empty) setIsRegistered(true);
        }

        const probQuery = query(collection(db, 'contest_problems'), where('contest_id', '==', id), orderBy('order_index', 'asc'));
        const probSnap = await getDocs(probQuery);
        
        const problemsList = await Promise.all(probSnap.docs.map(async (pDoc) => {
          const pData = pDoc.data();
          let coding_problems = null;
          if (pData.problem_id) {
            const problemDoc = await getDoc(doc(db, 'coding_problems', pData.problem_id));
            if (problemDoc.exists()) {
              coding_problems = { id: problemDoc.id, ...problemDoc.data() };
            }
          }
          return { id: pDoc.id, ...pData, coding_problems } as ContestProblem;
        }));
        
        setProblems(problemsList);
        
        loadLeaderboard();

      } catch (e: any) {
        toast.error('Failed to load contest details');
      } finally {
        setLoading(false);
      }
    }
    loadContest();
  }, [id, user]);

  const loadLeaderboard = async () => {
    if (!id) return;
    try {
      const q = query(
        collection(db, 'contest_participants'),
        where('contest_id', '==', id),
        orderBy('score', 'desc'),
        orderBy('finish_time_ms', 'asc'),
        limit(100)
      );
      const snap = await getDocs(q);
      
      const leaderboardList = await Promise.all(snap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let profiles = null;
        if (data.user_id) {
          const profileDoc = await getDoc(doc(db, 'profiles', data.user_id));
          if (profileDoc.exists()) {
            profiles = profileDoc.data();
          }
        }
        return { user_id: data.user_id, score: data.score || 0, finish_time_ms: data.finish_time_ms || 0, profiles, ...data } as LeaderboardEntry;
      }));
      setLeaderboard(leaderboardList);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'contest_participants'), where('contest_id', '==', id));
    const unsubscribe = onSnapshot(q, () => {
      loadLeaderboard();
    });
      
    return () => unsubscribe();
  }, [id]);

  const handleRegister = async () => {
    if (!user) {
      toast.error('Please log in to register');
      return;
    }
    try {
      await addDoc(collection(db, 'contest_participants'), {
        contest_id: id,
        user_id: user.id,
        score: 0,
        finish_time_ms: 0,
        registered_at: new Date().toISOString()
      });
      
      setIsRegistered(true);
      toast.success('Successfully registered!');
      loadLeaderboard();
    } catch (err: any) {
      toast.error('Failed to register', { description: err.message });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6 max-w-5xl mx-auto"><Skeleton className="h-32 w-full rounded-xl" /></div>
      </AppLayout>
    );
  }

  if (!contest) return <AppLayout><div className="p-6 text-center">Contest not found</div></AppLayout>;

  const now = new Date();
  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);
  const isStarted = now >= startTime;
  const isEnded = now >= endTime;

  return (
    <AppLayout title={contest.title}>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">{contest.title}</h1>
            <p className="text-on-surface-variant font-label-md mt-2">{contest.description}</p>
            <div className="flex gap-4 mt-4 text-sm text-on-surface-variant">
              <span><span className="material-symbols-outlined text-[16px] align-middle mr-1">calendar_today</span> {startTime.toLocaleDateString()}</span>
              <span><span className="material-symbols-outlined text-[16px] align-middle mr-1">schedule</span> {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="relative z-10">
            {isEnded ? (
              <Badge variant="outline" className="text-on-surface-variant border-outline">Contest Ended</Badge>
            ) : isRegistered ? (
              <Badge className="bg-success text-on-success">Registered</Badge>
            ) : (
              <Button onClick={handleRegister} className="bg-primary text-on-primary">Register Now</Button>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full">
          <TabsList className="bg-surface-container-low border border-outline-variant/50 w-full justify-start p-1 h-auto rounded-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-on-primary py-2 px-6">Overview</TabsTrigger>
            <TabsTrigger value="problems" className="data-[state=active]:bg-primary data-[state=active]:text-on-primary py-2 px-6">Problems</TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-primary data-[state=active]:text-on-primary py-2 px-6">Leaderboard</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="pt-6">
            <Card className="glass-panel">
              <CardHeader><CardTitle>Rules & Information</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-on-surface-variant">
                <p>1. Ensure you are registered before the contest begins.</p>
                <p>2. You can solve problems in any order.</p>
                <p>3. Ties in score are broken by finish time (lower is better).</p>
                <p>4. Plagiarism is strictly prohibited and will result in disqualification.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="problems" className="pt-6">
            {!isRegistered ? (
              <div className="text-center p-12 glass-panel rounded-xl">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30 text-primary">lock</span>
                <h3 className="text-xl font-bold">Registration Required</h3>
                <p className="text-on-surface-variant mb-4">Please register to view contest problems.</p>
                {!isEnded && <Button onClick={handleRegister}>Register Now</Button>}
              </div>
            ) : !isStarted ? (
              <div className="text-center p-12 glass-panel rounded-xl">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30 text-tertiary">hourglass_empty</span>
                <h3 className="text-xl font-bold">Contest Hasn't Started</h3>
                <p className="text-on-surface-variant">Problems will be revealed when the contest begins.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {problems.map((p, index) => (
                  <Card key={p.id} className="glass-panel hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary font-display">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{p.coding_problems.title}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className={p.coding_problems.difficulty === 'Beginner' ? 'text-[#4ade80] border-[#4ade80]/30' : p.coding_problems.difficulty === 'Intermediate' ? 'text-tertiary border-tertiary/30' : 'text-error border-error/30'}>
                              {p.coding_problems.difficulty}
                            </Badge>
                            <Badge variant="secondary" className="bg-surface-container-high">{p.points} Points</Badge>
                          </div>
                        </div>
                      </div>
                      <Link to={`/coding/problems/${p.coding_problems.id}?contest=${id}`}>
                        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-on-primary">Solve</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="leaderboard" className="pt-6">
            <Card className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30 uppercase font-label-md">
                    <tr>
                      <th className="p-4">Rank</th>
                      <th className="p-4">Participant</th>
                      <th className="p-4 text-right">Score</th>
                      <th className="p-4 text-right">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, idx) => (
                      <tr key={entry.user_id} className="border-b border-outline-variant/20 hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="p-4 font-bold font-display">
                          {idx === 0 ? <span className="text-[#fbbf24]">1st 🏆</span> : 
                           idx === 1 ? <span className="text-[#9ca3af]">2nd 🥈</span> : 
                           idx === 2 ? <span className="text-[#b45309]">3rd 🥉</span> : 
                           `#${idx + 1}`}
                        </td>
                        <td className="p-4 flex items-center gap-3">
                          <img src={entry.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + entry.user_id} alt="Avatar" className="w-8 h-8 rounded-full border border-outline-variant/50" />
                          <span className="font-medium text-on-surface">{entry.profiles?.full_name || 'Anonymous'}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-primary">{entry.score}</td>
                        <td className="p-4 text-right text-on-surface-variant">{entry.finish_time_ms > 0 ? `${Math.floor(entry.finish_time_ms / 60000)}m` : '-'}</td>
                      </tr>
                    ))}
                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                          No participants on the leaderboard yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
