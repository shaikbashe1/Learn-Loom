import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { db } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui/loading';
import { 
  Map, 
  Trophy, 
  Target, 
  BookOpen, 
  ChevronRight, 
  Zap, 
  Flame, 
  TrendingUp,
  Calendar,
  Sparkles
} from 'lucide-react';
import { ProfileStrength } from '@/components/profile/ProfileStrength';
import type { DBCourse, DBEnrollment, DBModule, DBUserRoadmap, DBRoadmapStage } from '@/types/types';

type EnrollWithCourse = DBEnrollment & {
  course: DBCourse;
  last_module: DBModule | null;
};

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollWithCourse[]>([]);
  const [recommended, setRecommended] = useState<DBCourse[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<(DBUserRoadmap & { stages: DBRoadmapStage[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const load = async () => {
      const [enrollRes, rankRes, roadmapRes] = await Promise.all([
        (async () => {
          try {
            const q = query(collection(db, 'user_course_enrollments'), where('user_id', '==', user.id), orderBy('enrolled_at', 'desc'), limit(4));
            const snap = await getDocs(q);
            const enrollments = await Promise.all(snap.docs.map(async (d) => {
              const data = d.data();
              let course = null;
              if (data.course_id) {
                const cSnap = await getDoc(doc(db, 'courses', data.course_id));
                if (cSnap.exists()) course = { id: cSnap.id, ...cSnap.data() };
              }
              let last_module = null;
              if (data.last_module_id) {
                const mSnap = await getDoc(doc(db, 'course_modules', data.last_module_id));
                if (mSnap.exists()) last_module = { id: mSnap.id, ...mSnap.data() };
              }
              return { id: d.id, ...data, course, last_module };
            }));
            return { data: enrollments };
          } catch (e) {
            console.error(e);
            return { data: [] };
          }
        })(),
        (async () => {
          try {
            const q = query(collection(db, 'leaderboard_view'), where('user_id', '==', user.id), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              return { data: { id: snap.docs[0].id, ...snap.docs[0].data() } };
            }
            return { data: null };
          } catch (e) {
            console.error(e);
            return { data: null };
          }
        })(),
        (async () => {
          try {
            const q = query(collection(db, 'user_roadmaps'), where('user_id', '==', user.id), orderBy('created_at', 'desc'), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const d = snap.docs[0];
              const roadmapData = d.data();
              const stagesQ = query(collection(db, 'roadmap_stages'), where('roadmap_id', '==', d.id));
              const stagesSnap = await getDocs(stagesQ);
              const stages = stagesSnap.docs.map(sd => ({ id: sd.id, ...sd.data() }));
              return { data: [{ id: d.id, ...roadmapData, roadmap_stages: stages }] };
            }
            return { data: null };
          } catch (e) {
            console.error(e);
            return { data: null };
          }
        })()
      ]);

      const enrollList = Array.isArray(enrollRes.data) ? (enrollRes.data as unknown as EnrollWithCourse[]) : [];
      setEnrollments(enrollList);

      if (rankRes.data) setMyRank((rankRes.data as { rank: number }).rank);

      if (roadmapRes.data && roadmapRes.data.length > 0) {
        const rm = roadmapRes.data[0];
        setActiveRoadmap({ ...rm, stages: rm.roadmap_stages || [] });
      }

      const enrolledIds = enrollList.map(e => e.course_id);
      let recData: DBCourse[] = [];
      try {
        const cQuery = query(collection(db, 'courses'), where('is_published', '==', true), orderBy('student_count', 'desc'), limit(10));
        const cSnap = await getDocs(cQuery);
        recData = cSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as DBCourse))
          .filter(c => !enrolledIds.includes(c.id))
          .slice(0, 3);
      } catch (e) {
        console.error(e);
      }
        
      setRecommended(recData);
      setLoading(false);
    };
    
    void load();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <AppLayout>
        <Loading variant="page" />
      </AppLayout>
    );
  }

  const completedCount = enrollments.filter(e => !!e.completed_at).length;
  const displayName = profile?.full_name?.split(' ')[0] ?? 'there';
  const streak = profile?.streak_days ?? 0;

  // Mock weekly activity for the chart
  const weeklyActivity = [40, 70, 45, 90, 60, 20, 85]; // Mon - Sun percentage

  return (
    <AppLayout>
      <div className="flex-1 max-w-container-max mx-auto w-full space-y-8 animate-fade-in">
        
        {/* Premium Welcome Banner */}
        <section className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-chart-4/5 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">{getGreeting()}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Welcome back, {displayName}!</h2>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              You've completed <span className="text-primary font-semibold">{completedCount}</span> course{completedCount !== 1 ? 's' : ''}. Keep learning and maintaining your streak!
            </p>
          </div>
          <div className="relative z-10 shrink-0 w-full md:w-auto">
            <Link to="/courses" className="bg-primary text-primary-foreground hover:brightness-110 px-6 py-2.5 rounded-xl text-xs font-semibold hover:shadow-md transition-all flex items-center justify-center gap-2 shadow-sm min-h-[40px]">
              <Zap size={16} />
              Resume Learning
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left Column) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI Roadmap Status Widget */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 select-none">
                  <Map className="w-5 h-5 text-primary" /> Active AI Roadmap
                </h3>
                <Link to="/ai-roadmap" className="text-primary font-semibold text-xs hover:underline flex items-center gap-1">
                  View full roadmap <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              
              {!activeRoadmap ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center flex flex-col items-center shadow-sm">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1">No Roadmap Generated</h4>
                  <p className="text-xs text-muted-foreground mb-6 max-w-xs">Let Loomie generate a personalized career path for you.</p>
                  <Link to="/ai-roadmap" className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-semibold hover:brightness-110 transition-all min-h-[38px] flex items-center shadow-sm">
                    Create Roadmap
                  </Link>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                  <div className="flex justify-between items-start mb-6 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider">
                        {activeRoadmap.difficulty}
                      </span>
                      <h4 className="text-lg font-bold text-foreground tracking-tight leading-snug">{activeRoadmap.title}</h4>
                      <p className="text-xs text-muted-foreground">{activeRoadmap.target_role}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-extrabold text-primary">
                        {activeRoadmap.stages.filter(s => s.status === 'completed').length}
                        <span className="text-sm text-muted-foreground font-medium">/{activeRoadmap.stages.length}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Stages</p>
                    </div>
                  </div>
                  
                  {/* Visual Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="text-primary font-semibold">
                        {Math.round((activeRoadmap.stages.filter(s => s.status === 'completed').length / activeRoadmap.stages.length) * 100) || 0}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-chart-4 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(37,99,235,0.2)]" 
                        style={{ width: `${Math.round((activeRoadmap.stages.filter(s => s.status === 'completed').length / activeRoadmap.stages.length) * 100) || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Continue Learning */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 select-none">
                  <BookOpen className="w-5 h-5 text-primary" /> Continue Learning
                </h3>
                <Link to="/courses" className="text-primary font-semibold text-xs hover:underline">View All</Link>
              </div>
              
              {enrollments.length === 0 ? (
                 <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
                   <p className="text-sm text-muted-foreground">You haven't enrolled in any courses yet.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrollments.map((e) => (
                    <Link key={e.id} to={`/courses/${e.course_id}`} className="bg-card border border-border rounded-2xl p-4 flex gap-4 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md card-lift">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                        {e.course?.thumbnail_url ? (
                          <img src={e.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-primary/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <h4 className="font-bold text-foreground line-clamp-2 leading-tight text-sm sm:text-base">{e.course?.title}</h4>
                        <div className="space-y-1 mt-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="text-primary">{e.progress_percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${e.progress_percent}%` }} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Content (Right Column) */}
          <div className="space-y-8">

            {/* Profile Strength (LinkedIn-style completion score) */}
            <ProfileStrength />

            {/* Quick Stats */}
            <section className="grid grid-cols-2 gap-4 select-none">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center hover:border-primary/20 hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-extrabold text-foreground">#{myRank ?? '-'}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Global Rank</p>
                <span className="text-[10px] text-success font-bold mt-1">↑ 3 this week</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center hover:border-chart-3/20 hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center mb-2">
                  <Flame className="w-5 h-5 text-chart-3" />
                </div>
                <p className="text-2xl font-extrabold text-foreground">{streak}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Day Streak</p>
                <span className="text-[10px] text-muted-foreground font-medium mt-1">active today</span>
              </div>
            </section>

            {/* Weekly Activity Chart */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm select-none">
              <h3 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Weekly Activity
              </h3>
              <div className="flex items-end justify-between h-32 gap-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="w-full bg-muted rounded-t-md relative flex items-end h-full min-w-[8px]">
                      <div 
                        className="w-full bg-primary/80 group-hover:bg-primary transition-colors rounded-t-md"
                        style={{ height: `${weeklyActivity[i]}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold">{day}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommended Paths */}
            {recommended.length > 0 && (
              <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Recommended
                </h3>
                <div className="space-y-4">
                  {recommended.map((c) => (
                    <Link key={c.id} to={`/courses/${c.id}`} className="group flex gap-3 items-center p-2 -mx-2 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                        {c.thumbnail_url ? (
                          <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary/30" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{c.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.level ?? 'All Levels'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
