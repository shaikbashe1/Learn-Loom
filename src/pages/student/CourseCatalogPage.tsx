import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
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

  const getDifficultyColor = (diff: string) => {
    if (diff === 'Beginner') return 'text-secondary-fixed-dim';
    if (diff === 'Intermediate') return 'text-primary-fixed-dim';
    return 'text-tertiary-fixed-dim';
  };

  return (
    <AppLayout title="Course Catalog">
      <div className="flex-1 p-gutter max-w-[1440px] mx-auto w-full">
        {/* Catalog Header */}
        <section className="mb-xl">
          <h1 className="text-headline-lg font-headline-lg text-on-surface mb-2">Explore Courses</h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl">
            Master new skills with our premium, developer-focused curriculum. From systems design to advanced AI implementation, level up your engineering career.
          </p>
        </section>

        {/* Filter & Sort Bar */}
        <section className="mb-lg flex flex-col md:flex-row gap-4 items-start md:items-center justify-between sticky top-[64px] z-30 bg-background/95 backdrop-blur py-4 border-b border-outline-variant/30">
          <div className="relative w-full md:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              className="w-full bg-surface-container text-body-md font-body-md text-on-surface pl-10 pr-4 py-2 rounded-lg border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50" 
              placeholder="Search catalog..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              type="text"
            />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar flex-nowrap">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-label-sm font-label-sm border transition-colors ${
                  category === cat 
                    ? 'bg-primary text-on-primary border-primary' 
                    : 'bg-transparent text-on-surface-variant border-outline-variant/60 hover:border-outline-variant hover:text-on-surface'
                }`}
              >
                {cat}
              </button>
            ))}
            <div className="h-6 w-px bg-outline-variant/40 mx-1 hidden md:block shrink-0"></div>
            <div className="relative shrink-0 ml-auto md:ml-0">
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="appearance-none bg-surface-container text-label-sm font-label-sm text-on-surface pl-4 pr-10 py-1.5 rounded-lg border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>
        </section>

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-80 bg-surface-container-low animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">search_off</span>
            <h3 className="font-semibold text-on-surface mb-2">No courses found</h3>
            <p className="text-sm text-on-surface-variant mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => { setSearch(''); setCategory('All'); }}
              className="px-4 py-1.5 rounded-lg border border-outline-variant/60 text-label-sm font-label-sm text-on-surface hover:bg-surface-container transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((course, index) => {
              const isEnrolled = enrollments.has(course.id);
              const isCompleted = enrollments.get(course.id)?.completed_at != null;
              const colors = [
                'from-[#1a1a2e] to-[#16213e]',
                'from-[#0f2027] via-[#203a43] to-[#2c5364]',
                'from-[#000000] to-[#434343]',
                'from-[#232526] to-[#414345]'
              ];
              const gradient = colors[index % colors.length];

              return (
                <div key={course.id} className="group flex flex-col bg-surface border border-outline-variant/40 rounded-xl overflow-hidden hover:border-outline-variant transition-colors duration-300 relative">
                  <div className="h-40 relative overflow-hidden bg-surface-container-high">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80 z-0`}></div>
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title} 
                        className="w-full h-full object-cover mix-blend-overlay group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center mix-blend-overlay opacity-30">
                         <span className="material-symbols-outlined text-[64px] text-white">code</span>
                      </div>
                    )}
                    
                    <div className="absolute top-3 left-3 z-10 flex gap-2">
                      <span className={`px-2 py-1 rounded bg-surface/80 backdrop-blur border border-outline-variant/40 text-label-sm font-label-sm ${getDifficultyColor(course.difficulty)}`}>
                        {course.difficulty}
                      </span>
                    </div>
                    
                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="px-2 py-1 rounded bg-surface/80 backdrop-blur border border-outline-variant/40 text-label-sm font-label-sm text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span> 
                        {course.duration_hours ? `${course.duration_hours}h` : `${course.duration_weeks}w`}
                      </span>
                    </div>
                    
                    {isCompleted && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="px-2 py-1 rounded bg-surface/80 backdrop-blur border border-outline-variant/40 text-label-sm font-label-sm text-tertiary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">workspace_premium</span> 
                          Completed
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-body-lg font-body-lg font-semibold text-on-surface line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                    </div>
                    <p className="text-body-sm font-body-sm text-on-surface-variant mb-4 line-clamp-2">
                      {course.description ?? 'A premium course to level up your engineering career.'}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-4 mt-auto">
                      <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/40 text-label-sm text-primary overflow-hidden">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                      </div>
                      <span className="text-label-sm font-label-sm text-on-surface-variant truncate max-w-[120px]">{course.instructor}</span>
                      <div className="ml-auto flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant shrink-0">
                        <span className="material-symbols-outlined text-tertiary-fixed-dim text-[14px] icon-fill">star</span>
                        <span className="text-on-surface">{course.rating?.toFixed(1) ?? 'New'}</span>
                        {course.student_count > 0 && <span>({course.student_count})</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                      {isEnrolled ? (
                        <span className="text-label-md font-label-md px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Enrolled</span>
                      ) : (
                        <span className="text-body-lg font-body-lg font-semibold text-on-surface">Free</span>
                      )}
                      <Link to={`/courses/${course.id}`}>
                        <button className={`px-4 py-1.5 rounded-lg text-label-sm font-label-sm transition-colors ${
                          isEnrolled 
                            ? 'bg-transparent text-primary border border-primary/50 hover:bg-primary/10' 
                            : 'bg-primary text-on-primary hover:bg-primary/90'
                        }`}>
                          {isEnrolled ? 'Continue' : 'Enroll'}
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
