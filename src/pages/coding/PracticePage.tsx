import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/db/supabase';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface Problem {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  credits: number;
}

const TOPICS = [
  'Arrays', 'Strings', 'Math', 'Searching', 'Sorting', 'Linked List', 
  'Stack', 'Queue', 'Trees', 'BST', 'Graphs', 'Heap', 'Greedy', 
  'Dynamic Programming', 'Backtracking', 'Bit Manipulation', 'SQL'
];

export default function PracticePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');

  useEffect(() => {
    supabase
      .from('coding_problems')
      .select('id, title, difficulty, credits')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setProblems(data as Problem[]);
        setLoading(false);
      });
  }, []);

  const filteredProblems = useMemo(() => {
    return problems.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      const matchDiff = difficultyFilter === 'All' || p.difficulty === difficultyFilter;
      // Topic filter not fully implemented in schema yet (using problem_tags table), 
      // so this is just a placeholder logic. We assume title might have topic or we skip.
      const matchTopic = topicFilter === 'All' || true; 
      
      return matchSearch && matchDiff && matchTopic;
    });
  }, [problems, search, difficultyFilter, topicFilter]);

  return (
    <AppLayout title="Coding Practice">
      <div className="flex flex-col gap-6 p-4">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-primary-fixed-dim">Practice</h1>
            <p className="text-on-surface-variant font-label-md">Sharpen your coding skills with our problem library.</p>
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <Input 
              placeholder="Search problems..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-full bg-surface-container-low border-outline-variant/60 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64 shrink-0 space-y-6">
            
            <div className="bg-surface border border-outline-variant/60 rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">filter_list</span> Difficulty
              </h3>
              <div className="flex flex-col gap-2">
                {['All', 'Beginner', 'Intermediate', 'Advanced'].map(diff => (
                  <label key={diff} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value={diff} 
                      checked={difficultyFilter === diff}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      className="text-primary focus:ring-primary rounded-full border-outline-variant/60 bg-surface-container-highest"
                    />
                    <span className={`text-sm ${difficultyFilter === diff ? 'text-primary font-medium' : 'text-on-surface-variant group-hover:text-on-surface transition-colors'}`}>
                      {diff}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-outline-variant/60 rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">tag</span> Topics
              </h3>
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                 <Badge 
                    variant="outline" 
                    className={`cursor-pointer transition-colors ${topicFilter === 'All' ? 'bg-primary/20 text-primary border-primary/50' : 'hover:bg-surface-variant/50 border-outline-variant/60'}`}
                    onClick={() => setTopicFilter('All')}
                  >
                    All
                  </Badge>
                {TOPICS.map(topic => (
                  <Badge 
                    key={topic} 
                    variant="outline" 
                    className={`cursor-pointer transition-colors ${topicFilter === topic ? 'bg-primary/20 text-primary border-primary/50' : 'hover:bg-surface-variant/50 border-outline-variant/60 text-on-surface-variant'}`}
                    onClick={() => setTopicFilter(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

          </div>

          {/* Problem List */}
          <div className="flex-1 bg-surface border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_100px_80px_100px] gap-4 p-4 border-b border-outline-variant/60 bg-surface-container-lowest font-bold text-sm text-on-surface-variant">
              <div>Problem</div>
              <div className="text-center">Difficulty</div>
              <div className="text-center">XP</div>
              <div className="text-right">Action</div>
            </div>
            
            {loading ? (
              <div className="p-4 space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg bg-surface-variant/50" />)}
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">search_off</span>
                <p>No problems found matching your criteria.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {filteredProblems.map(p => (
                  <div key={p.id} className="grid grid-cols-[1fr_100px_80px_100px] gap-4 p-4 items-center hover:bg-surface-variant/10 transition-colors group">
                    <div>
                      <Link to={`/coding/problems/${p.id}`} className="font-medium text-on-surface group-hover:text-primary transition-colors flex items-center gap-2">
                        {p.title}
                      </Link>
                    </div>
                    <div className="text-center">
                      <Badge className={`bg-transparent border-0
                        ${p.difficulty === 'Beginner' ? 'text-[#4ade80]' : p.difficulty === 'Intermediate' ? 'text-tertiary' : 'text-error'}
                      `}>
                        {p.difficulty === 'Beginner' ? 'Easy' : p.difficulty === 'Intermediate' ? 'Medium' : 'Hard'}
                      </Badge>
                    </div>
                    <div className="text-center text-sm font-medium text-[#facc15]">
                      +{p.credits}
                    </div>
                    <div className="text-right">
                      <Link to={`/coding/problems/${p.id}`}>
                        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-on-primary h-8 px-3 rounded-full transition-all">
                          Solve
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
