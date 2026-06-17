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
      <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-0 space-y-stack-xl pb-xl">
        
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center space-y-stack-lg py-12 relative overflow-hidden rounded-3xl bg-surface-container-lowest/50 border border-border-base mt-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.05)_0%,transparent_70%)]"></div>
          <div className="relative z-10 w-full max-w-3xl flex flex-col items-center px-4">
            <h1 className="font-display-lg-mobile md:font-display-lg text-on-surface mb-2">What will you master today?</h1>
            <p className="font-body-lg text-body-lg text-text-secondary max-w-2xl mb-8">Discover AI-curated learning paths, industry-recognized certifications, and hands-on projects designed to accelerate your career.</p>
            
            <div className="w-full relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
              <input 
                className="w-full pl-12 pr-[100px] py-4 rounded-xl border border-border-base bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-on-surface outline-none" 
                placeholder="Search for courses, skills, or certifications..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-md hover:bg-primary-fixed transition-colors shadow-sm">Search</button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <span className="text-label-sm font-label-sm text-text-secondary flex items-center">Trending:</span>
              {['Machine Learning', 'React Native', 'UI/UX Design', 'Data Science'].map(t => (
                <span 
                  key={t}
                  onClick={() => { setSearch(t); setCategory('All'); }}
                  className="px-3 py-1 bg-surface-container-low border border-border-base rounded-full font-label-sm text-label-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer hover:border-outline-variant"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Main Layout: Sidebar + Grid */}
        <div className="flex flex-col lg:flex-row gap-gutter">
          
          {/* Filter Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-stack-md hidden lg:block sticky top-[80px] self-start">
            <div className="glass-panel border border-border-base rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b border-border-base pb-4">
                <h3 className="font-headline-md text-headline-md text-on-surface">Filters</h3>
                <button onClick={() => { setCategory('All'); setSortBy('popular'); }} className="text-label-sm font-label-sm text-primary hover:underline">Clear all</button>
              </div>
              
              <div className="space-y-6">
                {/* Category */}
                <div>
                  <h4 className="font-label-md text-label-md text-text-secondary mb-3 uppercase tracking-wider">Category</h4>
                  <div className="space-y-3">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${category === cat ? 'bg-primary border-primary' : 'border-outline group-hover:border-primary'}`}>
                          {category === cat && <span className="material-symbols-outlined text-[12px] text-on-primary">check</span>}
                        </div>
                        <span className={`font-body-sm text-body-sm transition-colors ${category === cat ? 'text-primary font-medium' : 'text-on-surface group-hover:text-primary'}`}>{cat}</span>
                        <input type="radio" className="hidden" checked={category === cat} onChange={() => setCategory(cat)} />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <h4 className="font-label-md text-label-md text-text-secondary mb-3 uppercase tracking-wider">Sort By</h4>
                  <select 
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full bg-surface-container text-label-sm font-label-sm text-on-surface px-3 py-2 rounded-lg border border-border-base focus:border-primary outline-none cursor-pointer"
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
          <div className="flex-1 space-y-stack-xl">
            {/* Results Header */}
            <div className="flex justify-between items-end mb-stack-md">
              <div>
                <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Courses</h2>
                <p className="font-body-sm text-body-sm text-text-secondary mt-1">Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-[320px] bg-surface-container-low animate-pulse rounded-xl border border-border-base"></div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-panel text-center py-16 flex flex-col items-center rounded-xl border border-border-base">
                <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">search_off</span>
                <h3 className="font-headline-md text-on-surface mb-2">No courses found</h3>
                <p className="text-body-sm text-text-secondary mb-6 max-w-md text-balance">We couldn't find any courses matching your current filters. Try adjusting your search criteria.</p>
                <button
                  onClick={() => { setSearch(''); setCategory('All'); }}
                  className="px-6 py-2 rounded-full border border-border-base bg-surface text-label-md font-label-md text-on-surface hover:bg-surface-container-low transition-colors shadow-sm"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((course, index) => {
                  const isEnrolled = enrollments.has(course.id);
                  const isCompleted = enrollments.get(course.id)?.completed_at != null;
                  
                  // Rotating gradients for thumbnails
                  const gradients = [
                    'from-[#004ac6] to-[#7d4ce7]',
                    'from-[#57dffe] to-[#004ac6]',
                    'from-[#632ecd] to-[#b4c5ff]',
                    'from-[#00687a] to-[#4cd7f6]'
                  ];
                  const gradient = gradients[index % gradients.length];
                  const badgeColor = index % 2 === 0 ? 'text-primary bg-primary/10 border-primary/20' : 'text-tertiary bg-tertiary/10 border-tertiary/20';

                  return (
                    <div key={course.id} className="bg-surface border border-border-base rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 group relative flex flex-col">
                      {/* Top gradient border effect */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-tertiary to-secondary opacity-0 group-hover:opacity-100 transition-opacity z-20"></div>
                      
                      <div className="h-40 bg-surface-container relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80 z-0`}></div>
                        {course.thumbnail_url ? (
                          <img 
                            src={course.thumbnail_url} 
                            alt={course.title} 
                            className="w-full h-full object-cover mix-blend-overlay group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center mix-blend-overlay opacity-30">
                            <span className="material-symbols-outlined text-[64px] text-white">code_blocks</span>
                          </div>
                        )}
                        
                        {/* Tags over image */}
                        <div className="absolute top-3 left-3 z-10">
                           <span className={`px-2 py-1 rounded-md bg-surface/90 backdrop-blur-md border border-border-base text-label-sm font-label-sm ${getDifficultyColor(course.difficulty)} shadow-sm`}>
                            {course.difficulty}
                          </span>
                        </div>
                        {isCompleted && (
                          <div className="absolute top-3 right-3 z-10 bg-success text-on-primary px-2 py-1 rounded-md font-label-sm text-label-sm shadow-sm flex items-center gap-1">
                             <span className="material-symbols-outlined text-[14px]">verified</span> Completed
                          </div>
                        )}
                      </div>
                      
                      <div className="p-5 flex flex-col flex-1 relative z-10 bg-surface">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-label-sm px-2 py-0.5 rounded-md uppercase tracking-wider border ${badgeColor}`}>
                            {course.category}
                          </span>
                          <span className="font-label-sm text-label-sm text-text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">schedule</span> 
                            {course.duration_hours ? `${course.duration_hours}h` : `${course.duration_weeks}w`}
                          </span>
                        </div>
                        
                        <h3 className="font-headline-md text-headline-md text-on-surface line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                        
                        <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2 mb-4 flex-grow">
                          {course.description ?? 'A premium course to level up your engineering career.'}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-base">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center border border-border-base text-primary font-label-sm font-bold">
                              {course.instructor.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-label-sm text-label-sm text-on-surface leading-tight max-w-[100px] truncate">{course.instructor}</div>
                              <div className="flex items-center text-warning text-xs mt-0.5">
                                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <span className="ml-0.5 font-body-sm text-on-surface">{course.rating?.toFixed(1) ?? 'New'}</span>
                                {course.student_count > 0 && <span className="ml-1 text-text-secondary">({course.student_count})</span>}
                              </div>
                            </div>
                          </div>
                          <Link to={`/courses/${course.id}`}>
                            <button className={`px-5 py-2 rounded-lg font-label-md transition-colors ${
                              isEnrolled 
                                ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20' 
                                : 'bg-surface hover:bg-primary text-primary hover:text-on-primary border border-primary shadow-sm'
                            }`}>
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
