import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { db } from '@/db/firebase';
import { collection, getDocs, query, orderBy, where, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface Contest {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
}

export default function ContestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState<Contest[]>([]);
  const [registeredContestIds, setRegisteredContestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContests() {
      try {
        const contestsRef = collection(db, 'contests');
        const q = query(contestsRef, orderBy('start_time', 'desc'));
        const snap = await getDocs(q);
        
        const fetchedContests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contest));
        setContests(fetchedContests);

        if (user) {
          const pRef = collection(db, 'contest_participants');
          const pQuery = query(pRef, where('user_id', '==', user.uid));
          const pSnap = await getDocs(pQuery);
            
          setRegisteredContestIds(new Set(pSnap.docs.map(doc => doc.data().contest_id)));
        }
      } catch (err: any) {
        toast.error('Failed to load contests');
      } finally {
        setLoading(false);
      }
    }
    loadContests();
  }, [user]);

  const handleRegister = async (contestId: string) => {
    if (!user) {
      toast.error('Please log in to register');
      return;
    }
    try {
      await addDoc(collection(db, 'contest_participants'), { contest_id: contestId, user_id: user.uid });
      
      setRegisteredContestIds(prev => new Set(prev).add(contestId));
      toast.success('Successfully registered!');
    } catch (err: any) {
      toast.error('Failed to register', { description: err.message });
    }
  };

  const now = new Date();
  
  const activeContests = contests.filter(c => new Date(c.start_time) <= now && new Date(c.end_time) > now);
  const upcomingContests = contests.filter(c => new Date(c.start_time) > now);
  const pastContests = contests.filter(c => new Date(c.end_time) <= now);

  const renderCountdown = (dateString: string) => {
    const d = new Date(dateString);
    const diff = d.getTime() - now.getTime();
    if (diff < 0) return 'Started';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `Starts in ${days} days, ${hours} hours`;
  };

  return (
    <AppLayout title="Coding Contests">
      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Contests</h1>
          <p className="text-on-surface-variant font-label-md mt-1">Compete with others, climb the leaderboard, and improve your rating.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-10">
            
            {activeContests.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-error animate-pulse">radio_button_checked</span> Active Contests
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeContests.map(c => {
                    const isRegistered = registeredContestIds.has(c.id);
                    return (
                      <Card key={c.id} className="bg-primary/5 border border-primary/30 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/30 transition-all"></div>
                        <CardHeader>
                          <Badge className="w-fit mb-2 bg-error text-white animate-pulse">LIVE NOW</Badge>
                          <CardTitle className="font-display text-xl text-primary-fixed-dim">{c.title}</CardTitle>
                          <p className="text-on-surface-variant text-sm mt-1">{c.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-4">
                            {isRegistered ? (
                              <Link to={`/coding/contests/${c.id}`}>
                                <Button className="bg-primary text-on-primary">Enter Contest</Button>
                              </Link>
                            ) : (
                              <Button onClick={() => handleRegister(c.id)} className="bg-primary text-on-primary">Register & Enter</Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {upcomingContests.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-on-surface mb-4">Upcoming Contests</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingContests.map(c => {
                    const isRegistered = registeredContestIds.has(c.id);
                    return (
                      <Card key={c.id} className="glass-panel border-outline-variant/60 shadow-sm">
                        <CardHeader>
                          <Badge variant="outline" className="w-fit mb-2 border-primary text-primary">Registration Open</Badge>
                          <CardTitle className="font-display text-lg">{c.title}</CardTitle>
                          <p className="text-on-surface-variant text-sm mt-1">{renderCountdown(c.start_time)}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-4">
                            {isRegistered ? (
                              <Button variant="outline" className="border-primary text-primary" disabled>
                                <span className="material-symbols-outlined text-[16px] mr-1">check</span> Registered
                              </Button>
                            ) : (
                              <Button onClick={() => handleRegister(c.id)} className="bg-surface-variant text-on-surface hover:bg-primary hover:text-on-primary transition-colors">
                                Register Now
                              </Button>
                            )}
                            <Link to={`/coding/contests/${c.id}`}>
                              <Button variant="ghost">Details</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {pastContests.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-on-surface mb-4">Past Contests</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastContests.map(c => (
                    <Card key={c.id} className="bg-surface-container-lowest border border-outline-variant/30">
                      <CardHeader>
                        <CardTitle className="font-display text-lg text-on-surface-variant">{c.title}</CardTitle>
                        <p className="text-xs text-on-surface-variant opacity-70">Ended {new Date(c.end_time).toLocaleDateString()}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Link to={`/coding/contests/${c.id}`} className="w-full">
                            <Button variant="outline" className="w-full" size="sm">Virtual Participation</Button>
                          </Link>
                          <Link to={`/coding/contests/${c.id}?tab=leaderboard`} className="w-full">
                            <Button variant="ghost" className="w-full" size="sm">Standings</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </AppLayout>
  );
}
