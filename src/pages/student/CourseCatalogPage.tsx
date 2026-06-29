import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loading } from '@/components/ui/loading';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Search, 
  Star, 
  BookOpen, 
  Clock, 
  SlidersHorizontal, 
  Check, 
  RotateCcw,
  BookMarked
} from 'lucide-react';
import type { DBCourse, DBEnrollment } from '@/types/types';

const CATEGORIES = ['All', 'Data Science', 'Web Development', 'AI/ML', 'DSA', 'Programming'];
const SORT_OPTIONS = [
  { value: 'popular', label: 'Popularity' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
];

export default function CourseCatalogPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [enrollments, setEnrollments] = useState<Map<string, DBEnrollment>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      setCourses(coursesData ?? []);

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
    void load();
  }, [user]);

  const filtered = courses
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = c.title.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
      const matchCat = category === 'All' || c.category === category;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.student_count ?? 0) - (a.student_count ?? 0);
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'newest') return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      return 0;
    });

  const getDifficultyStatus = (diff: string) => {
    if (diff === 'Beginner') return 'success';
    if (diff === 'Intermediate') return 'info';
    return 'purple';
  };

  return (
    <AppLayout>
      <div className="max-w-container-max mx-auto w-full space-y-8 pb-12 animate-fade-in">
        
        {/* Premium Hero Section */}
        <section className="flex flex-col items-center justify-center text-center space-y-6 py-12 relative overflow-hidden rounded-3xl bg-card border border-border shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.03)_0%,transparent_70%)]"></div>
          <div className="relative z-10 w-full max-w-2xl flex flex-col items-center px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-3 tracking-tight">What will you master today?</h1>
            <p className="text-muted-foreground max-w-xl mb-8 text-xs sm:text-sm leading-relaxed">
              Discover AI-curated learning paths, industry-recognized certifications, and hands-on projects designed to accelerate your career.
            </p>
            
            <div className="w-full relative select-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input 
                className="w-full pl-11 pr-24 py-3 rounded-xl border border-border bg-card shadow-inner focus:ring-2 focus:ring-primary focus:border-primary transition-all text-xs sm:text-sm text-foreground outline-none min-h-[44px]" 
                placeholder="Search for courses, skills, or certifications..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-semibold hover:brightness-110 transition-colors shadow-sm min-h-[32px] flex items-center justify-center">
                Search
              </button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <span className="text-xs text-muted-foreground flex items-center mr-1">Trending:</span>
              {['Machine Learning', 'React Native', 'UI/UX Design', 'Data Science'].map(t => (
                <span 
                  key={t}
                  onClick={() => { setSearch(t); setCategory('All'); }}
                  className="px-3 py-1 bg-muted hover:bg-muted/80 border border-border rounded-full text-xs text-foreground transition-colors cursor-pointer select-none min-h-[28px] flex items-center"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile Filters and Sort Bar */}
        <div className="lg:hidden flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center border-b border-border pb-4 select-none">
          <div className="flex-grow flex gap-2 overflow-x-auto scrollbar-hide scroll-touch snap-x -mx-4 px-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "snap-center px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border min-h-[36px]",
                  category === cat 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Sort:</span>
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-card text-xs font-semibold text-foreground px-3 py-2 rounded-xl border border-border focus:border-primary outline-none cursor-pointer flex-1 sm:flex-none min-h-[36px]"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Layout: Sidebar + Grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Filter Sidebar (Desktop only) */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-6 hidden lg:block sticky top-[80px] self-start select-none">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <SlidersHorizontal size={16} /> Filters
                </h3>
                <button 
                  onClick={() => { setSearch(''); setCategory('All'); setSortBy('popular'); }} 
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Clear
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Category */}
                <div>
                  <h4 className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider font-bold">Category</h4>
                  <div className="space-y-2">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          category === cat ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'
                        )}>
                          {category === cat && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className={cn(
                          "text-xs transition-colors",
                          category === cat ? 'text-primary font-semibold' : 'text-foreground group-hover:text-primary'
                        )}>{cat}</span>
                        <input type="radio" className="hidden" checked={category === cat} onChange={() => setCategory(cat)} />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <h4 className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider font-bold">Sort By</h4>
                  <select 
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full bg-muted text-xs font-semibold text-foreground px-3 py-2.5 rounded-xl border border-border focus:border-primary outline-none cursor-pointer min-h-[38px]"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Course Content */}
          <div className="flex-1 space-y-6">
            {/* Results Header */}
            <div className="flex justify-between items-end mb-4 select-none">
              <div>
                <h2 className="text-lg font-bold text-foreground">Courses</h2>
                <p className="text-xs text-muted-foreground mt-1">Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-[320px] bg-card border border-border rounded-2xl flex flex-col p-4 space-y-4">
                    <Loading variant="skeleton" className="h-40 w-full rounded-xl" />
                    <Loading variant="skeleton" className="h-5 w-3/4" />
                    <Loading variant="skeleton" className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-card text-center py-16 flex flex-col items-center rounded-2xl border border-border p-6 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">No courses found</h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
                  We couldn't find any courses matching your current filters. Try adjusting your search criteria.
                </p>
                <button
                  onClick={() => { setSearch(''); setCategory('All'); }}
                  className="px-5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm min-h-[38px]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((course, index) => {
                  const isEnrolled = enrollments.has(course.id);
                  const enrollmentInfo = enrollments.get(course.id);
                  const isCompleted = enrollmentInfo?.completed_at != null;
                  const progressPercent = enrollmentInfo?.progress_percent ?? 0;
                  
                  // Premium curated gradients for thumbnails
                  const gradients = [
                    'from-[#0F2027] via-[#203A43] to-[#2C5364]',
                    'from-[#8A2387] via-[#E94057] to-[#F27121]',
                    'from-[#1f4037] to-[#99f2c8]',
                    'from-[#3A1C71] via-[#D76D77] to-[#FFAF7B]'
                  ];
                  const gradient = gradients[index % gradients.length];
                  const badgeColor = index % 2 === 0 ? 'text-primary bg-primary/10 border-primary/10' : 'text-chart-4 bg-chart-4/10 border-chart-4/10';

                  const instructorName = course.instructor || "LearnLoom Group";
                  const instructorInitials = instructorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div key={course.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 transition-all duration-300 hover:shadow-md group relative flex flex-col card-lift">
                      {/* Top gradient border effect on hover */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-chart-4 to-secondary opacity-0 group-hover:opacity-100 transition-opacity z-20" />
                      
                      <div className="h-40 bg-muted relative overflow-hidden shrink-0">
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90 z-0", gradient)} />
                        {course.thumbnail_url ? (
                          <img 
                            src={course.thumbnail_url} 
                            alt={course.title} 
                            className="w-full h-full object-cover mix-blend-overlay group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center mix-blend-overlay opacity-20">
                            <BookMarked className="w-14 h-14 text-white" />
                          </div>
                        )}
                        
                        {/* Difficulty Badge */}
                        <div className="absolute top-3 left-3 z-10 select-none">
                          <StatusBadge status={getDifficultyStatus(course.difficulty)} variant="subtle" className="font-bold">
                            {course.difficulty}
                          </StatusBadge>
                        </div>

                        {/* Completed Status Badge */}
                        {isCompleted && (
                          <div className="absolute top-3 right-3 z-10 bg-success text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 select-none">
                            <Check className="w-3 h-3" /> Completed
                          </div>
                        )}
                      </div>
                      
                      <div className="p-5 flex flex-col flex-grow relative z-10 bg-card">
                        <div className="flex justify-between items-center mb-3.5 select-none">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", badgeColor)}>
                            {course.category}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
                            <Clock className="w-3.5 h-3.5" /> 
                            {course.duration_hours ? `${course.duration_hours}h` : `${course.duration_weeks}w`}
                          </span>
                        </div>
                        
                        <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
                          {course.title}
                        </h3>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                          {course.description ?? 'Accelerate your career with personalized, AI-driven learning paths and projects.'}
                        </p>

                        {/* User Enrolled Progress Bar */}
                        {isEnrolled && !isCompleted && (
                          <div className="mb-5 select-none">
                            <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                              <span className="text-primary">Learning Progress</span>
                              <span className="text-muted-foreground">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-primary h-full rounded-full transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border select-none">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border text-primary font-bold text-xs shadow-inner shrink-0">
                              {instructorInitials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-foreground leading-tight truncate max-w-[100px]">{instructorName}</div>
                              <div className="flex items-center text-chart-3 text-[10px] mt-0.5">
                                <Star className="w-3.5 h-3.5 fill-chart-3 text-chart-3" />
                                <span className="ml-0.5 font-bold text-foreground">{course.rating?.toFixed(1) ?? 'New'}</span>
                                {course.student_count > 0 && <span className="ml-1 text-muted-foreground font-medium">({course.student_count})</span>}
                              </div>
                            </div>
                          </div>
                          
                          <Link to={`/courses/${course.id}`}>
                            <button className={cn(
                              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] active:scale-95 flex items-center justify-center cursor-pointer shadow-sm",
                              isEnrolled 
                                ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10' 
                                : 'bg-primary text-primary-foreground hover:brightness-110'
                            )}>
                              {isEnrolled ? 'Continue' : 'Enroll'}
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
