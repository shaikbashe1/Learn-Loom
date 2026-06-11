import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain, Code2, Trophy, Users, Target, Zap, Star, ChevronRight,
  BookOpen, GraduationCap, Medal, BarChart3, Play, CheckCircle,
  ArrowRight, Shield, Cpu, Globe, Flame, MessageSquare, Sparkles,
  TrendingUp, Award, Clock
} from 'lucide-react';
import { supabase } from '@/db/supabase';

/* ─── Static data ─────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    id: 't1', name: 'Aditya Singh', role: 'Software Engineer @ Google', avatar: 'AS', rating: 5,
    text: "LearnLoom's AI mentor helped me crack my Google interview. The personalized roadmap and daily coding challenges made all the difference. I went from zero to offer in 6 months!",
  },
  {
    id: 't2', name: 'Priya Sharma', role: 'Data Scientist @ Microsoft', avatar: 'PS', rating: 5,
    text: "The Data Science course on LearnLoom is phenomenal. Structured learning, AI guidance, and community support all in one place. Best educational investment I have ever made.",
  },
  {
    id: 't3', name: 'Rahul Verma', role: 'Full-Stack Developer @ Startup', avatar: 'RV', rating: 5,
    text: 'I built and deployed 3 full-stack projects while completing the Web Dev course. The QR-verified certificate was accepted by my employer on day one. LearnLoom is the real deal!',
  },
  {
    id: 't4', name: 'Sneha Patel', role: 'ML Engineer @ Amazon', avatar: 'SP', rating: 5,
    text: 'The gamification system kept me motivated throughout. Earning badges, climbing the leaderboard, and redeeming credits made every study session feel like progress — not a chore.',
  },
];

const FEATURES = [
  {
    icon: Brain, title: 'AI Mentor', badge: 'Most Popular',
    description: 'Get 24/7 personalized guidance from your AI mentor for doubt-clearing, interview prep, and adaptive study plans.',
    color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20',
  },
  {
    icon: Target, title: 'Smart Roadmaps', badge: 'AI-Generated',
    description: 'Receive week-by-week learning paths tailored to your goal: Data Science, Web Dev, AI/ML, Cybersecurity, or DSA.',
    color: 'text-chart-4', bg: 'bg-chart-4/10', border: 'border-chart-4/20',
  },
  {
    icon: Code2, title: 'Coding Practice', badge: 'Multi-Language',
    description: 'Solve daily coding challenges with real-time code execution. Earn credits for every problem solved.',
    color: 'text-chart-1', bg: 'bg-chart-1/10', border: 'border-chart-1/20',
  },
  {
    icon: Trophy, title: 'Gamification', badge: 'Streaks & Credits',
    description: 'Earn XP credits, unlock achievement badges, maintain daily streaks, and compete on the global leaderboard.',
    color: 'text-chart-3', bg: 'bg-chart-3/10', border: 'border-chart-3/20',
  },
  {
    icon: Users, title: 'Community', badge: 'Peer Learning',
    description: 'Join study groups, participate in weekly challenges, and collaborate with thousands of learners worldwide.',
    color: 'text-chart-2', bg: 'bg-chart-2/10', border: 'border-chart-2/20',
  },
  {
    icon: GraduationCap, title: 'Certifications', badge: 'QR-Verified',
    description: 'Earn blockchain-style QR-verified certificates after passing proctored grand tests. Trusted by top employers.',
    color: 'text-chart-5', bg: 'bg-chart-5/10', border: 'border-chart-5/20',
  },
];

const STATS = [
  { value: '50K+', label: 'Active Learners', icon: Users },
  { value: '200+', label: 'Expert Courses',  icon: BookOpen },
  { value: '95%',  label: 'Placement Rate',  icon: TrendingUp },
  { value: '4.9★', label: 'Platform Rating', icon: Star },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Choose Your Domain', desc: 'Pick from Data Science, Web Dev, AI/ML, Cybersecurity, or DSA.', icon: Target },
  { step: '02', title: 'Get Your AI Roadmap', desc: 'Our AI generates a personalised week-by-week plan for your goal.', icon: Brain },
  { step: '03', title: 'Learn & Practice', desc: 'Watch courses, solve coding challenges, and take quizzes daily.', icon: Code2 },
  { step: '04', title: 'Earn & Get Hired', desc: 'Collect credits, earn your certificate, and land your dream role.', icon: Award },
];

const DOMAINS = [
  { name: 'Data Science & Analytics', icon: BarChart3, accent: 'text-primary',  bg: 'bg-primary/8',  border: 'border-primary/20' },
  { name: 'Web Development',          icon: Globe,     accent: 'text-chart-4',  bg: 'bg-chart-4/8',  border: 'border-chart-4/20' },
  { name: 'AI / Machine Learning',    icon: Cpu,       accent: 'text-chart-1',  bg: 'bg-chart-1/8',  border: 'border-chart-1/20' },
  { name: 'Cybersecurity',            icon: Shield,    accent: 'text-chart-2',  bg: 'bg-chart-2/8',  border: 'border-chart-2/20' },
  { name: 'DSA & Competitive Coding', icon: Code2,     accent: 'text-chart-3',  bg: 'bg-chart-3/8',  border: 'border-chart-3/20' },
];

interface LandingCourse {
  id: string; title: string; description: string | null; category: string;
  difficulty: string; rating: number; student_count: number;
  instructor_name: string; thumbnail_url: string | null;
  duration_hours: number | null; duration_weeks: number | null;
}

/* ─── Component ───────────────────────────────────────────── */
export default function LandingPage() {
  const [featuredCourses, setFeaturedCourses] = useState<LandingCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('courses')
      .select('id,title,description,category,difficulty,rating,student_count,thumbnail_url,duration_hours,duration_weeks,instructor_name')
      .eq('is_published', true)
      .order('student_count', { ascending: false })
      .limit(6)
      .then(({ data }) => { setFeaturedCourses((data as LandingCourse[]) ?? []); setCoursesLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* ─── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">LearnLoom</span>
          </div>
          <div className="hidden md:flex items-center gap-7">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Courses',  href: '#courses'  },
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Community', href: '#community' },
            ].map(item => (
              <a key={item.label} href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-accent font-medium">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-primary text-white hover:opacity-90 font-semibold px-5 glow-blue shadow-md">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-24 px-4 overflow-hidden bg-secondary">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/10 rounded-full blur-[120px] opacity-60" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-chart-4/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-chart-1/10 rounded-full blur-3xl" />
          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Floating badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full glass border border-white/15 shadow-lg">
            <Sparkles className="w-4 h-4 text-chart-3" />
            <span className="text-sm font-medium text-white/90">Powered by Gemini AI + Judge0 Code Execution</span>
            <Badge className="bg-primary/30 text-primary-foreground border-0 text-[10px] px-2 py-0">New</Badge>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight text-balance">
            Learn Smarter with{' '}
            <span className="gradient-text">AI‑Powered</span>
            <br className="hidden md:block" />
            {' '}Personalized Education
          </h1>

          {/* Sub-headline */}
          <p className="text-base md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
            Master in-demand skills with AI mentors, personalized roadmaps, coding practice,
            quizzes, certificates, and career guidance — all in one platform.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/signup">
              <Button size="lg"
                className="bg-gradient-primary text-white hover:opacity-90 glow-blue px-8 h-13 text-base font-semibold shadow-lg">
                Start Learning Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/courses">
              <Button size="lg" variant="ghost"
                className="border border-white/25 text-white hover:bg-white/10 px-8 h-13 text-base font-medium">
                <Play className="w-4 h-4 mr-2" />Browse Courses
              </Button>
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {STATS.map(stat => (
              <div key={stat.label} className="glass rounded-2xl p-4 text-center border border-white/10">
                <div className="text-2xl font-extrabold gradient-text mb-1">{stat.value}</div>
                <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/25 font-semibold">
              <Sparkles className="w-3 h-3 mr-1.5" />Everything You Need
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 text-balance">
              A Complete <span className="gradient-text">Learning Ecosystem</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
              From beginner to job-ready professional — every tool you need in one intelligent platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <Card key={f.title}
                className={`bg-card border ${f.border} card-hover group h-full relative overflow-hidden`}>
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Top accent line */}
                  <div className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <f.icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <Badge className="text-[10px] bg-muted text-muted-foreground border-border font-medium">{f.badge}</Badge>
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-balance text-base">{f.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1 text-pretty leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 section-light">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-chart-4/10 text-chart-4 border-chart-4/25 font-semibold">Simple Process</Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 text-balance">
              From Zero to <span className="gradient-text">Job-Ready</span> in 4 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {/* Connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-primary/40 to-transparent z-0" />
                )}
                <Card className="bg-card border-border card-hover h-full relative z-10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl font-extrabold gradient-text opacity-60">{step.step}</span>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-bold text-foreground mb-2 text-balance">{step.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{step.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Popular Courses ──────────────────────────────────── */}
      <section id="courses" className="py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <Badge className="mb-4 bg-chart-2/10 text-chart-2 border-chart-2/25 font-semibold">Top Rated</Badge>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground text-balance">Popular Courses</h2>
              <p className="text-muted-foreground mt-2">Curated by industry experts and loved by thousands.</p>
            </div>
            <Link to="/courses">
              <Button variant="ghost" className="border border-border text-foreground hover:bg-accent font-medium">
                View All Courses <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {coursesLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="bg-card border-border h-full flex flex-col">
                    <Skeleton className="aspect-video w-full bg-muted" />
                    <CardContent className="p-4 space-y-2.5">
                      <Skeleton className="h-4 w-20 bg-muted" />
                      <Skeleton className="h-5 w-full bg-muted" />
                      <Skeleton className="h-4 w-3/4 bg-muted" />
                    </CardContent>
                  </Card>
                ))
              : featuredCourses.map(course => (
                  <Card key={course.id}
                    className="bg-card border-border card-hover overflow-hidden group h-full flex flex-col">
                    <div className="aspect-video overflow-hidden bg-muted relative">
                      {course.thumbnail_url
                        ? <img src={course.thumbnail_url} alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                          </div>
                      }
                      <div className="absolute top-3 left-3">
                        <Badge className="text-[10px] bg-black/60 text-white border-0 backdrop-blur-sm">{course.difficulty}</Badge>
                      </div>
                    </div>
                    <CardContent className="p-5 flex flex-col flex-1">
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 w-fit mb-2">{course.category}</Badge>
                      <h3 className="font-bold text-foreground text-sm mb-2 text-balance flex-1 leading-snug">{course.title}</h3>
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2 text-pretty">{course.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-chart-3 text-chart-3" />
                          <span className="font-semibold text-foreground">{course.rating?.toFixed(1) ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{(course.student_count ?? 0).toLocaleString()}</span>
                        </div>
                        {course.duration_weeks && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{course.duration_weeks}w</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            }
          </div>
        </div>
      </section>

      {/* ─── AI Roadmap ───────────────────────────────────────── */}
      <section className="py-24 px-4 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-chart-4/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <Badge className="mb-5 bg-chart-1/20 text-chart-1 border-chart-1/30 font-semibold">
                <Cpu className="w-3 h-3 mr-1.5" />AI-Powered Roadmaps
              </Badge>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 text-balance">
                Your Personalized<br />
                <span className="gradient-text">Learning Roadmap</span>
              </h2>
              <p className="text-slate-300 mb-8 text-pretty leading-relaxed">
                Tell our AI your goal domain and experience level. Get a tailored week-by-week
                curriculum with daily tasks, curated resources, and practice goals — updated as you progress.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  'Personalised weekly plans aligned to your goal',
                  'Daily task breakdown with realistic time estimates',
                  'Curated resources: videos, articles & practice problems',
                  'Adaptive adjustments based on your progress & quiz scores',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/signup">
                <Button className="bg-gradient-primary text-white hover:opacity-90 glow-blue font-semibold shadow-lg">
                  Generate My Roadmap <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {DOMAINS.map(domain => (
                <div key={domain.name}
                  className={`flex items-center gap-4 p-4 rounded-2xl glass border border-white/10 hover:border-white/20 cursor-pointer hover:scale-[1.02] transition-all`}>
                  <div className={`w-11 h-11 rounded-xl ${domain.bg} flex items-center justify-center shrink-0`}>
                    <domain.icon className={`w-5 h-5 ${domain.accent}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{domain.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">AI roadmap + coding practice available</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─────────────────────────────────────── */}
      <section className="py-24 px-4 section-light">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-chart-5/10 text-chart-5 border-chart-5/25 font-semibold">Success Stories</Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground text-balance">
              Students Who <span className="gradient-text">Got Hired</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TESTIMONIALS.map(t => (
              <Card key={t.id} className="bg-card border-border card-hover h-full">
                <CardContent className="p-7 flex flex-col h-full">
                  <div className="flex items-center gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-chart-3 text-chart-3" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 mb-5 text-pretty leading-relaxed">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <Avatar className="w-11 h-11 shrink-0">
                      <AvatarFallback className="bg-gradient-primary text-white text-xs font-bold">{t.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Community ────────────────────────────────────────── */}
      <section id="community" className="py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-chart-1/10 text-chart-1 border-chart-1/25 font-semibold">Community</Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-5 text-balance">
            Learn Together, <span className="gradient-text">Grow Together</span>
          </h2>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-pretty leading-relaxed">
            Join thousands of learners in our active community. Participate in study groups,
            coding challenges, and peer-to-peer learning sessions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              { icon: Users,         label: 'Study Groups',      value: '500+ Active Groups',    color: 'text-primary',  bg: 'bg-primary/10'  },
              { icon: Flame,         label: 'Weekly Challenges',  value: 'Earn Bonus Credits',    color: 'text-chart-3',  bg: 'bg-chart-3/10'  },
              { icon: MessageSquare, label: 'Discussion Forums',  value: '10,000+ Threads',       color: 'text-chart-1',  bg: 'bg-chart-1/10'  },
            ].map(item => (
              <Card key={item.label} className="bg-card border-border card-hover">
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center mx-auto mb-4`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <div className="font-bold text-foreground mb-1">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Link to="/signup">
            <Button size="lg"
              className="bg-gradient-primary text-white hover:opacity-90 glow-blue px-10 font-semibold shadow-lg">
              Join the Community <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/12 rounded-full blur-[100px]" />
          <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-chart-4/15 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <Badge className="mb-6 glass border border-white/15 text-white/90 text-sm font-semibold px-4 py-1.5">
            <Medal className="w-3.5 h-3.5 mr-1.5 text-chart-3" />Join 50,000+ learners today
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 text-balance">
            Ready to <span className="gradient-text">Transform</span><br />Your Career?
          </h2>
          <p className="text-slate-300 mb-10 text-lg text-pretty leading-relaxed">
            Start for free — no credit card required. Your AI-powered learning journey begins now.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg"
                className="bg-gradient-primary text-white hover:opacity-90 glow-blue px-10 h-14 text-base font-bold shadow-xl">
                Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost"
                className="border border-white/25 text-white hover:bg-white/10 px-10 h-14 text-base font-medium">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="bg-card border-t border-border py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg gradient-text">LearnLoom</span>
              </div>
              <p className="text-xs text-muted-foreground text-pretty leading-relaxed">
                AI-powered personalized learning platform for the next generation of tech professionals.
              </p>
            </div>
            {[
              { title: 'Platform',  links: ['Courses', 'AI Mentor', 'Roadmap', 'Coding Practice'] },
              { title: 'Community', links: ['Forums', 'Study Groups', 'Leaderboard', 'Challenges'] },
              { title: 'Company',   links: ['About', 'Blog', 'Careers', 'Privacy Policy'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-bold text-foreground text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} LearnLoom. All rights reserved.</p>
            <div className="flex items-center gap-5">
              {['Twitter', 'LinkedIn', 'GitHub', 'Discord'].map(s => (
                <a key={s} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
