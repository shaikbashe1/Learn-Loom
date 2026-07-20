import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const VERDICT_META: Record<string, { label: string; color: string; bg: string }> = {
  accepted:             { label: 'Accepted',         color: 'text-[#4ade80]', bg: 'bg-[#4ade80]/10' },
  wrong_answer:         { label: 'Wrong Answer',     color: 'text-error',     bg: 'bg-error/10' },
  time_limit_exceeded:  { label: 'TLE',              color: 'text-tertiary',  bg: 'bg-tertiary/10' },
  compilation_error:    { label: 'Compile Error',    color: 'text-error',     bg: 'bg-error/10' },
  runtime_error:        { label: 'Runtime Error',    color: 'text-error',     bg: 'bg-error/10' },
  pending:              { label: 'Pending',          color: 'text-outline',   bg: 'bg-surface-variant' },
};

export default function SubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchSubs = async () => {
      setLoading(true);
      try {
        const subsRef = collection(db, 'submissions');
        const q = query(
          subsRef,
          where('user_id', '==', user.id),
          orderBy('created_at', 'desc'),
          limit(20)
        );
        
        const snapshot = await getDocs(q);
        const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const populatedSubs = await Promise.all(
          subs.map(async (sub: any) => {
            if (sub.problem_id) {
              const probRef = doc(db, 'coding_problems', sub.problem_id);
              const probSnap = await getDoc(probRef);
              if (probSnap.exists()) {
                return {
                  ...sub,
                  coding_problems: { title: probSnap.data().title }
                };
              }
            }
            return sub;
          })
        );
        
        setSubmissions(populatedSubs);
      } catch (err) {
        console.error('Error fetching submissions:', err);
      }
      setLoading(false);
    };

    fetchSubs();
  }, [user]);

  return (
    <AppLayout title="My Submissions">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">My Submissions</h1>
          <p className="text-on-surface-variant font-label-md mt-1">Review your recent code submissions and results.</p>
        </div>

        <Card className="glass-panel border-outline-variant/60 overflow-hidden">
          <div className="grid grid-cols-[100px_1fr_120px_100px_100px_150px] gap-4 p-4 border-b border-outline-variant/60 bg-surface-container-lowest font-bold text-xs text-on-surface-variant uppercase tracking-wider">
            <div>Time Submitted</div>
            <div>Problem</div>
            <div className="text-center">Status</div>
            <div className="text-center">Runtime</div>
            <div className="text-center">Memory</div>
            <div className="text-right">Language</div>
          </div>
          
          <div className="divide-y divide-outline-variant/30">
            {loading ? (
               <div className="p-4 space-y-4">
                 {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded" />)}
               </div>
            ) : submissions.length === 0 ? (
               <div className="p-12 text-center text-on-surface-variant">
                 <span className="material-symbols-outlined text-4xl mb-2 opacity-30">history</span>
                 <p>No submissions found.</p>
               </div>
            ) : (
              submissions.map(sub => {
                const meta = VERDICT_META[sub.verdict] || { label: sub.verdict, color: 'text-on-surface', bg: 'bg-surface-variant' };
                return (
                  <div key={sub.id} className="grid grid-cols-[100px_1fr_120px_100px_100px_150px] gap-4 p-4 items-center hover:bg-surface-variant/20 transition-colors text-sm">
                    <div className="text-xs text-on-surface-variant">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <Link to={`/coding/problems/${sub.problem_id}`} className="font-medium text-on-surface hover:text-primary transition-colors">
                        {sub.coding_problems?.title || `Problem ${sub.problem_id.substring(0,8)}`}
                      </Link>
                    </div>
                    <div className="text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${meta.color} ${meta.bg}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-center text-on-surface-variant font-mono text-xs">
                      {sub.time_ms ? `${sub.time_ms} ms` : 'N/A'}
                    </div>
                    <div className="text-center text-on-surface-variant font-mono text-xs">
                      {sub.memory_kb ? `${sub.memory_kb} KB` : 'N/A'}
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">{sub.language}</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
