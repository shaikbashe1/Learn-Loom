import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Search, Star, Users, Clock, BookOpen, Filter, CheckCircle, Trophy } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { DBCourse, DBEnrollment } from '@/types/types';

const CATEGORIES = ['All', 'Data Science', 'Web Development', 'AI/ML', 'DSA', 'Programming'];
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced'];

// Difficulty badge colors
const difficultyStyle: Record<string, string> = {
  Beginner: 'bg-amber-100 text-amber-700 border-amber-200',
  Intermediate: 'bg-sky-100 text-sky-700 border-sky-200',
  Advanced: 'bg-rose-100 text-rose-700 border-rose-200',
};

// Category badge colors
const categoryStyle: Record<string, string> = {
  'Data Science':     'bg-violet-100 text-violet-700 border-violet-200',
  'Web Development':  'bg-blue-100 text-blue-700 border-blue-200',
  'AI/ML':            'bg-emerald-100 text-emerald-700 border-emerald-200',
  'DSA':              'bg-orange-100 text-orange-700 border-orange-200',
  'Programming':      'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export default function CourseCatalogPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [moduleCounts, setModuleCounts] = useState<Map<string, number>>(new Map());
  const [enrollments, setEnrollments] = useState<Map<string, DBEnrollment>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      const list = coursesData ?? [];
      setCourses(list);

      // Fetch module counts
      const { data: modData } = await supabase
        .from('course_modules')
        .select('course_id');
      const countMap = new Map<string, number>();
      (modData ?? []).forEach((m: { course_id: string }) => {
        countMap.set(m.course_id, (countMap.get(m.course_id) ?? 0) + 1);
      });
      setModuleCounts(countMap);

      if (user) {
        const { data: enrollData } = await supabase
          .from('user_course_enrollments')
          .select('*')
          .eq('user_id', user.id);
        const map = new Map((enrollData ?? []).map((e: DBEnrollment) => [e.course_id, e]));
        setEnrollments(map);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = courses
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = c.title.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
      const matchCat = category === 'All' || c.category === category;
      const matchDiff = difficulty === 'All' || c.difficulty === difficulty;
      return matchSearch && matchCat && matchDiff;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.student_count ?? 0) - (a.student_count ?? 0);
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'newest') return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      return 0;
    });

  return (
    <AppLayout title="Course Catalog">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground text-balance">Explore Courses</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Browse {courses.length} expert-led courses across all domains
          </p>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} courses found</p>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs w-40 border-0 bg-transparent text-muted-foreground focus:ring-0 pr-0">
                <span className="text-muted-foreground mr-1">Sort by:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="aspect-[16/10] bg-muted animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                    <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                  </div>
                  <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                  <div className="h-10 bg-muted animate-pulse rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(course => {
              const enroll = enrollments.get(course.id);
              const isEnrolled = !!enroll;
              const isCompleted = !!enroll?.completed_at;
              const modCount = moduleCounts.get(course.id) ?? 0;

              return (
                <div
                  key={course.id}
                  className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-full group hover:shadow-lg hover:border-primary/30 transition-all duration-200"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[16/10] overflow-hidden relative bg-muted">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {/* Enrolled / Completed badge overlay */}
                    {isCompleted && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white shadow">
                          <Trophy className="w-2.5 h-2.5" /> Completed
                        </span>
                      </div>
                    )}
                    {isEnrolled && !isCompleted && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white shadow">
                          <CheckCircle className="w-2.5 h-2.5" /> Enrolled
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4 flex flex-col flex-1">
                    {/* Category + Difficulty badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium border ${categoryStyle[course.category] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {course.category}
                      </span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium border ${difficultyStyle[course.difficulty] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {course.difficulty}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-foreground text-base leading-snug mb-1.5 text-balance">
                      {course.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 text-pretty mb-2">
                      {course.description ?? ''}
                    </p>

                    {/* Instructor */}
                    <p className="text-xs text-muted-foreground mb-3">
                      by <span className="text-foreground font-medium">{course.instructor}</span>
                    </p>

                    {/* Progress bar if enrolled */}
                    {isEnrolled && (
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] text-muted-foreground">Progress</span>
                          <span className="text-[11px] font-semibold text-primary">{enroll.progress_percent}%</span>
                        </div>
                        <Progress value={enroll.progress_percent} className="h-1.5" />
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-foreground">{course.rating.toFixed(1)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.student_count.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration_weeks} weeks
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {modCount} modules
                      </span>
                    </div>

                    {/* CTA Button */}
                    <Link to={`/courses/${course.id}`} className="mt-auto">
                      <Button className="w-full h-10 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                        {isCompleted ? 'Review Course' : isEnrolled ? 'Continue Learning' : 'View Course'}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No courses found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            <Button
              onClick={() => { setSearch(''); setCategory('All'); setDifficulty('All'); }}
              variant="outline"
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
