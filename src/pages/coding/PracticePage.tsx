import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Trophy, CheckCircle2, Circle, Clock, Building2, Terminal } from 'lucide-react';
import type { DBCodingProblem, DBUserSubmission } from '@/types/types';

const TOPICS = [
  'All', 'Arrays', 'Strings', 'Mathematics', 'Two Pointers', 'Binary Search', 
  'Dynamic Programming', 'Graphs', 'Trees', 'SQL', 'Backtracking', 'Hash Table'
];

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

export default function PracticePage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<DBCodingProblem[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');

  useEffect(() => {
    const fetchData = async () => {
      // Fetch problems
      const q = query(collection(db, 'coding_problems'), orderBy('created_at', 'asc'));
      const querySnapshot = await getDocs(q);
      const probData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
      if (probData) setProblems(probData as DBCodingProblem[]);

      // Fetch user solved status
      if (user) {
        const subQ = query(collection(db, 'coding_submissions'), where('user_id', '==', user.id));
        const subSnapshot = await getDocs(subQ);
        const subData = subSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
        if (subData) {
          const solved = new Set<string>();
          const attempted = new Set<string>();
          
          subData.forEach(sub => {
            if (sub.verdict === 'Accepted') {
              solved.add(sub.problem_id);
            } else {
              attempted.add(sub.problem_id);
            }
          });
          
          setSolvedIds(solved);
          setAttemptedIds(attempted);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const filteredProblems = useMemo(() => {
    return problems.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                         (p.company_tags && p.company_tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())));
      const matchDiff = difficultyFilter === 'All' || p.difficulty === difficultyFilter;
      const matchTopic = topicFilter === 'All' || p.topic === topicFilter;
      
      const isSolved = solvedIds.has(p.id);
      const isAttempted = attemptedIds.has(p.id) && !isSolved;
      
      let matchStatus = true;
      if (statusFilter === 'Solved') matchStatus = isSolved;
      if (statusFilter === 'Attempted') matchStatus = isAttempted;
      if (statusFilter === 'Not Started') matchStatus = !isSolved && !isAttempted;
      
      return matchSearch && matchDiff && matchTopic && matchStatus;
    });
  }, [problems, search, difficultyFilter, topicFilter, statusFilter, solvedIds, attemptedIds]);

  // Calculate XP (Easy=20, Medium=50, Hard=100)
  const totalXP = Array.from(solvedIds).reduce((acc, id) => {
    const p = problems.find(prob => prob.id === id);
    if (!p) return acc;
    if (p.difficulty === 'Easy') return acc + 20;
    if (p.difficulty === 'Medium') return acc + 50;
    return acc + 100;
  }, 0);

  return (
    <AppLayout title="Coding Practice">
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 bg-background">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-heading font-bold text-on-surface flex items-center gap-3">
              <Terminal className="w-8 h-8 text-primary" />
              Practice Hub
            </h1>
            <p className="text-on-surface-variant mt-2 max-w-2xl">
              Master algorithms, data structures, and prepare for technical interviews.
            </p>
          </div>
          
          {/* User Progress Stats */}
          {user && (
            <div className="flex items-center gap-6 bg-surface-container rounded-xl p-4">
              <div className="text-center">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Solved</p>
                <p className="text-2xl font-bold text-primary">{solvedIds.size} <span className="text-sm text-on-surface-variant font-normal">/ {problems.length}</span></p>
              </div>
              <div className="w-px h-10 bg-outline-variant/50"></div>
              <div className="text-center">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Earned XP</p>
                <p className="text-2xl font-bold text-tertiary flex items-center gap-1 justify-center">
                  <Trophy className="w-5 h-5" /> {totalXP}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <Input 
              placeholder="Search problems or companies..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {['All', 'Solved', 'Attempted', 'Not Started'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <select 
            value={difficultyFilter} 
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select 
            value={topicFilter} 
            onChange={(e) => setTopicFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm max-w-[200px]"
          >
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Problem List */}
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Difficulty</th>
                <th className="px-6 py-4 font-semibold">Topic</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Companies</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-5 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    No problems found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredProblems.map((problem) => {
                  const isSolved = solvedIds.has(problem.id);
                  const isAttempted = attemptedIds.has(problem.id) && !isSolved;
                  return (
                    <tr key={problem.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="px-6 py-4">
                        {isSolved ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" title="Solved" />
                        ) : isAttempted ? (
                          <Circle className="w-5 h-5 text-yellow-500 fill-yellow-500/20" title="Attempted" />
                        ) : (
                          <Circle className="w-5 h-5 text-outline-variant" title="Not Started" />
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-on-surface">
                        <Link to={`/coding/problems/${problem.slug}`} className="hover:text-primary transition-colors">
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                          problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-600' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {problem.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {problem.topic || 'General'}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {problem.company_tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs bg-surface-container px-2 py-1 rounded flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {tag}
                            </span>
                          ))}
                          {(problem.company_tags?.length || 0) > 2 && (
                            <span className="text-xs bg-surface-container px-2 py-1 rounded">
                              +{(problem.company_tags?.length || 0) - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/coding/problems/${problem.slug}`}>
                          <Button variant={isSolved ? "outline" : "default"} size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            {isSolved ? 'Review' : 'Solve'}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </AppLayout>
  );
}
