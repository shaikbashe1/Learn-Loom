import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { User, MapPin, GraduationCap, Briefcase, Target, Code, Award, Flame, Star, Search, CheckCircle2, Link as LinkIcon, Github, Linkedin, FileText, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          console.error("Failed to fetch profile:", error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Profile">
        <div className="max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
          <Skeleton className="h-64 rounded-2xl bg-surface border border-border-base" />
          <Skeleton className="h-96 rounded-2xl bg-surface border border-border-base" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title="Profile Not Found">
        <div className="max-w-6xl mx-auto w-full px-4 py-20 text-center">
          <div className="bg-surface rounded-2xl border border-border-base p-12 shadow-sm inline-block max-w-lg">
            <span className="material-symbols-outlined text-6xl text-text-secondary opacity-50 mb-4">person_off</span>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Profile Not Found</h2>
            <p className="text-text-secondary">This user hasn't completed their profile yet or the profile does not exist.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const exts = (profile.extensions as Record<string, string>) || {};
  const isStudent = profile.user_type === 'student';
  const completionPercent = 100; // public view doesn't need to show their completion to others

  return (
    <AppLayout title={`${profile.full_name || 'User'}'s Profile`}>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER SECTION (LinkedIn Style) */}
        <section className="bg-surface border border-border-base rounded-2xl overflow-hidden shadow-sm relative">
          {/* Banner */}
          <div className="h-40 sm:h-56 bg-gradient-to-r from-primary/20 via-secondary/10 to-tertiary/20 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
          </div>
          
          <div className="px-6 sm:px-10 pb-8 relative">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end -mt-16 sm:-mt-20 mb-4">
              {/* Avatar Box */}
              <div className="relative group shrink-0">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-surface bg-surface-container overflow-hidden shadow-lg relative">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary bg-primary/5">
                      {(profile.full_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Basic Info */}
              <div className="flex-1 text-center sm:text-left pb-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">{profile.full_name}</h1>
                <p className="text-lg text-text-secondary font-medium mt-1 flex items-center justify-center sm:justify-start gap-2">
                  {profile.username && <span className="text-primary font-bold">@{profile.username}</span>}
                  {profile.username && <span className="text-border-base">•</span>}
                  <span>{profile.user_type ? profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1) : 'Member'}</span>
                </p>
                <p className="text-text-primary mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
                  {profile.bio || 'This user prefers to keep an air of mystery.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PROFILE CONTENT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="xl:col-span-1 space-y-8">
            
            {/* Personal Info Card */}
            <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-text-primary mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Info</h3>
              <div className="space-y-4">
                {(profile.city || profile.state || profile.country) && (
                  <div className="flex items-center gap-3 text-text-secondary">
                    <MapPin className="w-4 h-4" /> <span className="text-sm font-medium">{[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {!profile.city && !profile.state && !profile.country && (
                   <p className="text-sm text-text-secondary italic">Location not specified.</p>
                )}
              </div>
            </div>

            {/* Education or Career */}
            <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
                {isStudent ? <GraduationCap className="w-5 h-5 text-secondary" /> : <Briefcase className="w-5 h-5 text-secondary" />} 
                {isStudent ? 'Education' : 'Experience'}
              </h3>
              {isStudent ? (
                profile.college_name ? (
                  <div className="space-y-3">
                    <p className="font-bold text-text-primary">{profile.college_name}</p>
                    {(profile.degree || profile.branch) && <p className="text-sm text-text-secondary font-medium">{profile.degree} {profile.branch ? `in ${profile.branch}` : ''}</p>}
                    <div className="flex gap-4">
                      {profile.year && <p className="text-xs text-text-secondary">Year {profile.year}</p>}
                      {profile.semester && <p className="text-xs text-text-secondary">Sem {profile.semester}</p>}
                      {profile.graduation_year && <p className="text-xs text-text-secondary">Class of {profile.graduation_year}</p>}
                    </div>
                  </div>
                ) : <p className="text-sm text-text-secondary italic">No education details visible.</p>
              ) : (
                exts.company ? (
                  <div className="space-y-2">
                    <p className="font-bold text-text-primary">{exts.designation || 'Professional'}</p>
                    <p className="text-sm text-text-secondary font-medium">at {exts.company}</p>
                  </div>
                ) : <p className="text-sm text-text-secondary italic">No work experience visible.</p>
              )}
            </div>

            {/* Social Links */}
            <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-text-primary mb-4 flex items-center gap-2"><LinkIcon className="w-5 h-5 text-text-secondary" /> Links</h3>
              <div className="space-y-3">
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" className="flex items-center gap-3 p-3 rounded-lg border bg-surface-container-low border-border-base hover:border-primary/50 text-text-primary transition-colors">
                    <Github className="w-5 h-5" /> 
                    <span className="text-sm font-bold flex-1">GitHub</span>
                  </a>
                )}
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" className="flex items-center gap-3 p-3 rounded-lg border bg-surface-container-low border-border-base hover:border-primary/50 text-text-primary transition-colors">
                    <Linkedin className="w-5 h-5" /> 
                    <span className="text-sm font-bold flex-1">LinkedIn</span>
                  </a>
                )}
                {profile.portfolio_url && (
                  <a href={profile.portfolio_url} target="_blank" className="flex items-center gap-3 p-3 rounded-lg border bg-surface-container-low border-border-base hover:border-primary/50 text-text-primary transition-colors">
                    <LayoutDashboard className="w-5 h-5" /> 
                    <span className="text-sm font-bold flex-1">Portfolio</span>
                  </a>
                )}
                {!profile.github_url && !profile.linkedin_url && !profile.portfolio_url && (
                  <p className="text-sm text-text-secondary italic">No social links added.</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Profile Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-border-base rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center card-lift">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <span className="text-2xl font-black text-text-primary">{profile.credits?.toLocaleString() || 0}</span>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">XP Points</span>
              </div>
              <div className="bg-surface border border-border-base rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center card-lift">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center mb-2">
                  <Flame className="w-5 h-5 text-warning" />
                </div>
                <span className="text-2xl font-black text-text-primary">{profile.streak_days || 0}</span>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Day Streak</span>
              </div>
              <div className="bg-surface border border-border-base rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center card-lift">
                <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-tertiary" />
                </div>
                <span className="text-2xl font-black text-text-primary">{profile.courses_completed || 0}</span>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Courses</span>
              </div>
              <div className="bg-surface border border-border-base rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center card-lift">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
                  <Award className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-2xl font-black text-text-primary">{profile.certificates_earned || 0}</span>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Certificates</span>
              </div>
            </div>

            {/* Skills & Interests */}
            <div className="bg-surface border border-border-base rounded-2xl p-6 sm:p-8 shadow-sm">
              <h3 className="font-bold text-lg text-text-primary mb-4 flex items-center gap-2"><Code className="w-5 h-5 text-primary" /> Skills & Interests</h3>
              {profile.interests && profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((skill: string, idx: number) => (
                    <span key={idx} className="bg-surface-container-low border border-border-base text-text-primary text-sm font-bold px-4 py-2 rounded-full shadow-sm hover:border-primary hover:text-primary transition-colors cursor-default">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">No skills added yet.</p>
              )}
            </div>
            
            {/* Future Expansion Slots */}
            <div className="border-2 border-dashed border-border-base rounded-2xl p-8 text-center bg-surface/50">
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-3 text-text-secondary">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-text-primary mb-1">More sections coming soon!</h4>
              <p className="text-sm text-text-secondary">Projects, Badges, GitHub Contributions, and Community Activity will appear here.</p>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
