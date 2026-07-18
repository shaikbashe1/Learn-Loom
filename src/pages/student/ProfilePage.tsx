import React, { useState, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Briefcase, 
  Target, 
  Code, 
  Award, 
  Flame, 
  Star, 
  Search, 
  CheckCircle2, 
  ChevronRight, 
  Edit3, 
  Save, 
  X, 
  Link as LinkIcon, 
  Github, 
  Linkedin, 
  FileText, 
  LayoutDashboard,
  Camera,
  Compass,
  Code2,
  Terminal,
  Zap,
  Activity
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileFormData {
  full_name: string;
  username: string;
  bio: string;
  mobile_number: string;
  college_name: string;
  degree: string;
  branch: string;
  year: string;
  semester: string;
  graduation_year: string;
  company: string;
  designation: string;
  dream_roles: string;
  dream_companies: string;
  learning_goal: string;
  daily_learning_time: string;
  interests: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
  resume_url: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileFormData>({
    full_name: '', username: '', bio: '', mobile_number: '',
    college_name: '', degree: '', branch: '', year: '', semester: '', graduation_year: '',
    company: '', designation: '', dream_roles: '', dream_companies: '',
    learning_goal: '', daily_learning_time: '', interests: '',
    github_url: '', linkedin_url: '', portfolio_url: '', resume_url: '',
    country: '', state: '', city: '', pincode: ''
  });

  const [codingProgress, setCodingProgress] = useState<any>(null);
  const [codingStats, setCodingStats] = useState<any>(null);
  const [codingStreaks, setCodingStreaks] = useState<any>(null);

  React.useEffect(() => {
    const fetchCodingData = async () => {
      if (!user) return;
      try {
        const { data: prog } = await supabase.from('coding_progress').select('*').eq('user_id', user.id).single();
        if (prog) setCodingProgress(prog);

        const { data: stat } = await supabase.from('coding_statistics').select('*').eq('user_id', user.id).single();
        if (stat) setCodingStats(stat);

        const { data: strk } = await supabase.from('coding_streaks').select('*').eq('user_id', user.id).single();
        if (strk) setCodingStreaks(strk);
      } catch (e) {
        console.error("Error fetching coding stats:", e);
      }
    };
    fetchCodingData();
  }, [user]);

  const calculateCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.full_name, profile.username, profile.bio, profile.avatar_url,
      profile.mobile_number, profile.country, profile.interests?.length,
      profile.dream_roles?.length, profile.learning_goal, profile.daily_learning_time
    ];
    const filled = fields.filter(f => f && (Array.isArray(f) ? f.length > 0 : String(f).trim() !== '')).length;
    return Math.round((filled / fields.length) * 100);
  };

  const handleEdit = () => {
    if (!profile) return;
    const exts = (profile.extensions as Record<string, string>) || {};
    setForm({
      full_name: profile.full_name || '',
      username: profile.username || '',
      bio: profile.bio || '',
      mobile_number: profile.mobile_number || '',
      college_name: profile.college_name || '',
      degree: profile.degree || '',
      branch: profile.branch || '',
      year: profile.year?.toString() || '',
      semester: profile.semester?.toString() || '',
      graduation_year: profile.graduation_year?.toString() || '',
      company: exts.company || '',
      designation: exts.designation || '',
      dream_roles: profile.dream_roles?.join(', ') || '',
      dream_companies: profile.dream_companies?.join(', ') || '',
      learning_goal: profile.learning_goal || '',
      daily_learning_time: profile.daily_learning_time || '',
      interests: profile.interests?.join(', ') || '',
      github_url: profile.github_url || '',
      linkedin_url: profile.linkedin_url || '',
      portfolio_url: profile.portfolio_url || '',
      resume_url: profile.resume_url || '',
      country: profile.country || '',
      state: profile.state || '',
      city: profile.city || '',
      pincode: profile.pincode || ''
    });
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async () => {
    if (!user) return;
    const trimmedName = form.full_name.trim();
    if (!trimmedName) { toast.error('Full Name is required'); return; }

    setSaving(true);
    const parseList = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);
    
    const extensions = {
      ...(profile?.extensions as Record<string, unknown> || {}),
      company: form.company.trim(),
      designation: form.designation.trim()
    };

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: trimmedName,
        username: form.username.trim() || null,
        bio: form.bio.trim() || null,
        mobile_number: form.mobile_number.trim() || null,
        college_name: form.college_name.trim() || null,
        degree: form.degree.trim() || null,
        branch: form.branch.trim() || null,
        year: form.year ? parseInt(form.year) : null,
        semester: form.semester ? parseInt(form.semester) : null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
        dream_roles: parseList(form.dream_roles),
        dream_companies: parseList(form.dream_companies),
        learning_goal: form.learning_goal.trim() || null,
        daily_learning_time: form.daily_learning_time.trim() || null,
        interests: parseList(form.interests),
        github_url: form.github_url.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        portfolio_url: form.portfolio_url.trim() || null,
        resume_url: form.resume_url.trim() || null,
        country: form.country.trim() || null,
        state: form.state.trim() || null,
        city: form.city.trim() || null,
        pincode: form.pincode.trim() || null,
        extensions
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Save failed: ' + error.message);
    } else {
      await refreshProfile();
      toast.success('Profile updated successfully');
      setEditing(false);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB');
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      toast.error('Failed to update avatar');
    } else {
      await refreshProfile();
      toast.success('Avatar updated');
    }
    setUploadingAvatar(false);
    e.target.value = '';
  };

  if (!profile) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto w-full px-4 py-8 space-y-6 select-none">
          <Loading variant="skeleton" className="h-64 rounded-2xl" />
          <Loading variant="skeleton" className="h-96 rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  const completionPercent = calculateCompletion();
  const exts = (profile.extensions as Record<string, string>) || {};
  const isStudent = profile.user_type === 'student';

  // Coding Statistics Computations
  const totalProblems = 1000;
  const solvedCount = codingProgress?.problems_solved || 0;
  const attemptedCount = codingProgress?.problems_attempted || 0;
  const completionPercentage = Math.round((solvedCount / totalProblems) * 100);
  
  const easyCount = codingProgress?.easy_solved || 0;
  const mediumCount = codingProgress?.medium_solved || 0;
  const hardCount = codingProgress?.hard_solved || 0;
  
  const accRate = codingStats?.acceptance_rate || 0;
  const totalSubs = codingStats?.total_submissions || 0;
  const favLang = codingStats?.favorite_language || 'Unknown';
  
  const today = new Date();
  const heatmapDays = Array.from({ length: 60 }).map((_, i) => {
    const date = subDays(today, 59 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const isActive = codingStreaks && codingStreaks.current_streak > 0 && i >= (60 - codingStreaks.current_streak);
    return { date: dateStr, active: isActive };
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 space-y-8 animate-fade-in select-none">
        
        {/* HEADER SECTION (LinkedIn Style) */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm relative">
          {/* Banner */}
          <div className="h-40 sm:h-56 bg-gradient-to-r from-primary/15 via-chart-4/10 to-secondary/15 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15 mix-blend-overlay" />
            <button 
              className="absolute top-4 right-4 bg-card/85 backdrop-blur-sm p-2.5 rounded-full border border-border hover:bg-card text-muted-foreground hover:text-primary transition-all duration-200"
              onClick={handleEdit}
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
          
          <div className="px-6 sm:px-10 pb-8 relative">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end -mt-16 sm:-mt-20 mb-6">
              {/* Avatar Box */}
              <div className="relative group shrink-0">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-card bg-muted overflow-hidden shadow-md relative flex items-center justify-center">
                  <UserAvatar src={profile.avatar_url} name={profile.full_name || ''} size="2xl" />
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {uploadingAvatar ? <Loading variant="spinner" size="sm" className="text-white" /> : <Camera className="text-white w-8 h-8" />}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => void handleAvatarUpload(e)} />
              </div>
              
              {/* Basic Info */}
              <div className="flex-1 text-center sm:text-left pb-2 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{profile.full_name}</h1>
                <p className="text-sm text-muted-foreground font-medium flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-primary font-semibold">{profile.username ? `@${profile.username}` : 'No username'}</span>
                  <span className="text-border-base/50">•</span>
                  <span className="text-xs uppercase bg-muted px-2 py-0.5 rounded-md font-bold">{profile.user_type || 'Member'}</span>
                </p>
                <p className="text-foreground mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed">
                  {profile.bio || 'This user prefers to keep an air of mystery. Add a bio to let people know about you!'}
                </p>
              </div>
            </div>

            {/* Completion Bar */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-inner">
              <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>Profile Strength: {completionPercent < 50 ? 'Beginner' : completionPercent < 90 ? 'Intermediate' : 'All-Star'}</span>
                  <span className="text-primary">{completionPercent}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
              {completionPercent < 100 && !editing && (
                <Button onClick={handleEdit} variant="outline" className="shrink-0 w-full sm:w-auto font-bold text-xs border-primary/20 hover:bg-primary/5 text-primary">
                  Complete Profile
                </Button>
              )}
            </div>
          </div>
        </section>

        {editing ? (
          /* EDIT MODE VIEW */
          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="text-muted-foreground hover:text-destructive rounded-xl"><X /></Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Core Information */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-primary flex items-center gap-2 border-b border-border/40 pb-1">
                  <User className="w-4 h-4" /> Personal Information
                </h3>
                <div className="space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="bg-muted/40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Username</Label>
                  <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-muted/40" placeholder="e.g. johndoe123" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mobile Number</Label>
                  <Input value={form.mobile_number} onChange={e => setForm({...form, mobile_number: e.target.value})} className="bg-muted/40" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Country</Label>
                    <Input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="bg-muted/40" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="bg-muted/40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="bg-muted/40" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pincode</Label>
                    <Input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} className="bg-muted/40" />
                  </div>
                </div>
                <div className="space-y-1 pt-2">
                  <Label className="text-xs">Bio</Label>
                  <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-muted/40 resize-none" rows={3} />
                </div>
              </div>

              {/* Education / Career (Contextual based on user type) */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-secondary flex items-center gap-2 border-b border-border/40 pb-1">
                  {isStudent ? <GraduationCap className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />} 
                  {isStudent ? 'Education' : 'Career Details'}
                </h3>
                
                {isStudent ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">College / University</Label>
                      <Input value={form.college_name} onChange={e => setForm({...form, college_name: e.target.value})} className="bg-muted/40" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Degree</Label>
                        <Input value={form.degree} onChange={e => setForm({...form, degree: e.target.value})} className="bg-muted/40" placeholder="B.Tech" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Branch</Label>
                        <Input value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} className="bg-muted/40" placeholder="CSE" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Graduation Year</Label>
                        <Input type="number" value={form.graduation_year} onChange={e => setForm({...form, graduation_year: e.target.value})} className="bg-muted/40" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Current Semester</Label>
                        <Input type="number" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} className="bg-muted/40" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Company Name</Label>
                      <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="bg-muted/40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Designation / Role</Label>
                      <Input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} className="bg-muted/40" />
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-border mt-4 space-y-4">
                  <h3 className="font-bold text-sm text-chart-4 flex items-center gap-2 border-b border-border/40 pb-1">
                    <Target className="w-4 h-4" /> Goals
                  </h3>
                  <div className="space-y-1">
                    <Label className="text-xs">Dream Roles (Comma separated)</Label>
                    <Input value={form.dream_roles} onChange={e => setForm({...form, dream_roles: e.target.value})} className="bg-muted/40" placeholder="e.g. SDE I, Data Scientist" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dream Companies (Comma separated)</Label>
                    <Input value={form.dream_companies} onChange={e => setForm({...form, dream_companies: e.target.value})} className="bg-muted/40" placeholder="e.g. Google, Microsoft" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Daily Learning Goal</Label>
                    <Input value={form.daily_learning_time} onChange={e => setForm({...form, daily_learning_time: e.target.value})} className="bg-muted/40" placeholder="e.g. 2 hours" />
                  </div>
                </div>
              </div>

              {/* Skills & Social Links */}
              <div className="space-y-4 md:col-span-2 border-t border-border pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-primary flex items-center gap-2 border-b border-border/40 pb-1">
                      <Code className="w-4 h-4" /> Skills
                    </h3>
                    <div className="space-y-1">
                      <Label className="text-xs">Skills & Interests (Comma separated)</Label>
                      <Textarea value={form.interests} onChange={e => setForm({...form, interests: e.target.value})} className="bg-muted/40 resize-none" placeholder="e.g. React, Java, UI/UX" rows={4} />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-1">
                      <LinkIcon className="w-4 h-4" /> Links
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="relative">
                        <Github className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input value={form.github_url} onChange={e => setForm({...form, github_url: e.target.value})} className="pl-9 bg-muted/40" placeholder="GitHub URL" />
                      </div>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url: e.target.value})} className="pl-9 bg-muted/40" placeholder="LinkedIn URL" />
                      </div>
                      <div className="relative">
                        <LayoutDashboard className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input value={form.portfolio_url} onChange={e => setForm({...form, portfolio_url: e.target.value})} className="pl-9 bg-muted/40" placeholder="Portfolio URL" />
                      </div>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input value={form.resume_url} onChange={e => setForm({...form, resume_url: e.target.value})} className="pl-9 bg-muted/40" placeholder="Resume Link (GDrive, etc)" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border sticky bottom-0 bg-card p-4 -mx-6 sm:-mx-8 shadow-sm sm:static sm:p-0 sm:mx-0 sm:bg-transparent sm:shadow-none select-none">
              <Button variant="outline" onClick={handleCancel} className="font-bold text-xs">Cancel</Button>
              <Button onClick={() => void handleSave()} disabled={saving} className="font-bold text-xs bg-primary text-primary-foreground gap-2">
                {saving ? <Loading variant="spinner" size="sm" className="text-primary-foreground" /> : <Save className="w-4 h-4" />} Save Profile
              </Button>
            </div>
          </section>
        ) : (
          /* READ-ONLY DASHBOARD VIEW */
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN */}
            <div className="xl:col-span-1 space-y-8">
              
              {/* Personal Info Card */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Personal Info</h3>
                <div className="space-y-4">
                  {profile.full_name && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <User className="w-4 h-4 shrink-0" /> <span className="text-xs font-semibold text-foreground">{profile.full_name}</span>
                    </div>
                  )}
                  {profile.username && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="w-4 h-4 font-bold text-xs leading-none flex items-center justify-center shrink-0">@</div> 
                      <span className="text-xs font-semibold text-foreground">{profile.username}</span>
                    </div>
                  )}
                  {profile.mobile_number && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" /> <span className="text-xs font-semibold text-foreground">{profile.mobile_number}</span>
                    </div>
                  )}
                  {user?.email && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0" /> <span className="text-xs font-semibold text-foreground">{user.email}</span>
                    </div>
                  )}
                  {(profile.city || profile.state || profile.country || profile.pincode) && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" /> 
                      <span className="text-xs font-semibold text-foreground leading-normal">
                        {[profile.city, profile.state, profile.country, profile.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Education or Career */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                  {isStudent ? <GraduationCap className="w-4 h-4 text-primary" /> : <Briefcase className="w-4 h-4 text-primary" />} 
                  {isStudent ? 'Education' : 'Experience'}
                </h3>
                {isStudent ? (
                  profile.college_name ? (
                    <div className="space-y-3">
                      <p className="font-bold text-xs text-foreground leading-normal">{profile.college_name}</p>
                      {(profile.degree || profile.branch) && (
                        <p className="text-[11px] text-muted-foreground font-semibold">
                          {profile.degree} {profile.branch ? `in ${profile.branch}` : ''}
                        </p>
                      )}
                      <div className="flex gap-4">
                        {profile.year && <p className="text-[10px] text-muted-foreground font-medium">Year {profile.year}</p>}
                        {profile.semester && <p className="text-[10px] text-muted-foreground font-medium">Sem {profile.semester}</p>}
                        {profile.graduation_year && <p className="text-[10px] text-muted-foreground font-medium">Class of {profile.graduation_year}</p>}
                      </div>
                    </div>
                  ) : <p className="text-xs text-muted-foreground italic">No education details added yet.</p>
                ) : (
                  exts.company ? (
                    <div className="space-y-2">
                      <p className="font-bold text-xs text-foreground leading-normal">{exts.designation || 'Professional'}</p>
                      <p className="text-xs text-muted-foreground font-medium">at {exts.company}</p>
                    </div>
                  ) : <p className="text-xs text-muted-foreground italic">No work experience added yet.</p>
                )}
              </div>

              {/* Social Links */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-muted-foreground" /> Links</h3>
                <div className="space-y-3">
                  <a href={profile.github_url || '#'} target={profile.github_url ? "_blank" : undefined} rel="noreferrer" className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200",
                    profile.github_url ? 'bg-muted/30 border-border hover:border-primary/40 text-foreground' : 'bg-card border-dashed border-border text-muted-foreground opacity-70'
                  )}>
                    <Github className="w-4.5 h-4.5 shrink-0" /> 
                    <span className="text-xs font-bold flex-1">GitHub</span>
                    {!profile.github_url && <span className="text-[10px]">Not added</span>}
                  </a>
                  <a href={profile.linkedin_url || '#'} target={profile.linkedin_url ? "_blank" : undefined} rel="noreferrer" className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200",
                    profile.linkedin_url ? 'bg-muted/30 border-border hover:border-primary/40 text-foreground' : 'bg-card border-dashed border-border text-muted-foreground opacity-70'
                  )}>
                    <Linkedin className="w-4.5 h-4.5 shrink-0" /> 
                    <span className="text-xs font-bold flex-1">LinkedIn</span>
                    {!profile.linkedin_url && <span className="text-[10px]">Not added</span>}
                  </a>
                  <a href={profile.portfolio_url || '#'} target={profile.portfolio_url ? "_blank" : undefined} rel="noreferrer" className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200",
                    profile.portfolio_url ? 'bg-muted/30 border-border hover:border-primary/40 text-foreground' : 'bg-card border-dashed border-border text-muted-foreground opacity-70'
                  )}>
                    <LayoutDashboard className="w-4.5 h-4.5 shrink-0" /> 
                    <span className="text-xs font-bold flex-1">Portfolio</span>
                    {!profile.portfolio_url && <span className="text-[10px]">Not added</span>}
                  </a>
                  <a href={profile.resume_url || '#'} target={profile.resume_url ? "_blank" : undefined} rel="noreferrer" className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200",
                    profile.resume_url ? 'bg-muted/30 border-border hover:border-primary/40 text-foreground' : 'bg-card border-dashed border-border text-muted-foreground opacity-70'
                  )}>
                    <FileText className="w-4.5 h-4.5 shrink-0" /> 
                    <span className="text-xs font-bold flex-1">Resume</span>
                    {!profile.resume_url && <span className="text-[10px]">Not added</span>}
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="xl:col-span-2 space-y-8">
              
              {/* Profile Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center card-lift">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xl font-extrabold text-foreground">{profile.credits?.toLocaleString() || 0}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">XP Points</span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center card-lift">
                  <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center mb-2">
                    <Flame className="w-5 h-5 text-chart-3" />
                  </div>
                  <span className="text-xl font-extrabold text-foreground">{profile.streak_days || 0}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Day Streak</span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center card-lift">
                  <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5 text-chart-4" />
                  </div>
                  <span className="text-xl font-extrabold text-foreground">{profile.courses_completed || 0}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Courses</span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center card-lift">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-2">
                    <Award className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="text-xl font-extrabold text-foreground">{profile.certificates_earned || 0}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Certificates</span>
                </div>
              </div>

              {/* Skills & Interests */}
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2"><Code className="w-4 h-4 text-primary" /> Skills & Interests</h3>
                {profile.interests && profile.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((skill, idx) => (
                      <span key={idx} className="bg-muted border border-border text-foreground text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-sm hover:border-primary hover:text-primary transition-colors cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No skills added yet.</p>
                )}
              </div>

              {/* Career Goals */}
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                <h3 className="font-bold text-sm text-foreground mb-6 flex items-center gap-2"><Target className="w-4 h-4 text-chart-4" /> Career Goals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dream Roles</p>
                    {profile.dream_roles && profile.dream_roles.length > 0 ? (
                      <ul className="space-y-2">
                        {profile.dream_roles.map((role, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-chart-4" /> {role}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-xs text-muted-foreground italic">Not specified</p>}
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Companies</p>
                    {profile.dream_companies && profile.dream_companies.length > 0 ? (
                      <ul className="space-y-2">
                        {profile.dream_companies.map((company, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> {company}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-xs text-muted-foreground italic">Not specified</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1 pt-4 border-t border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Daily Learning Goal</p>
                    <p className="text-xs font-semibold text-foreground">{profile.daily_learning_time ? `${profile.daily_learning_time} per day` : <span className="italic text-muted-foreground font-normal">Not specified</span>}</p>
                  </div>
                  
                  <div className="sm:col-span-2 space-y-1 pt-4 border-t border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Primary Objective</p>
                    <p className="text-xs font-semibold text-foreground leading-relaxed">{profile.learning_goal || <span className="italic text-muted-foreground font-normal">Not specified</span>}</p>
                  </div>
                </div>
              </div>

              {/* 📊 Coding Statistics Section */}
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2 border-b border-border/40 pb-4">
                  <Terminal className="w-5 h-5 text-primary" /> Coding Statistics
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Circular Progress */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-36 h-36 flex items-center justify-center mb-2">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                        <circle 
                          cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                          className="text-primary transition-all duration-1000 ease-out"
                          strokeDasharray="283"
                          strokeDashoffset={283 - (283 * completionPercentage) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black font-mono text-foreground">{completionPercentage}%</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Completed</span>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">{solvedCount} / {totalProblems} Solved</p>
                  </div>

                  {/* Metrics Grid */}
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Attempted</span>
                      <span className="text-xl font-black text-foreground">{attemptedCount}</span>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Submissions</span>
                      <span className="text-xl font-black text-foreground">{totalSubs}</span>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Acceptance Rate</span>
                      <span className="text-xl font-black text-foreground">{accRate.toFixed(1)}%</span>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Top Language</span>
                      <span className="text-xl font-black text-foreground">{favLang}</span>
                    </div>
                  </div>
                </div>

                {/* Difficulty Breakdown */}
                <div className="pt-4 border-t border-border/40 space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="w-16 text-xs font-bold text-green-500">Easy</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (easyCount / 300) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-xs font-mono font-semibold text-right">{easyCount}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 text-xs font-bold text-yellow-500">Medium</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, (mediumCount / 500) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-xs font-mono font-semibold text-right">{mediumCount}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 text-xs font-bold text-red-500">Hard</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (hardCount / 200) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-xs font-mono font-semibold text-right">{hardCount}</span>
                  </div>
                </div>

                {/* Heatmap Calendar */}
                <div className="pt-6 border-t border-border/40">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Activity Map (Last 60 Days)
                  </h4>
                  <div className="flex flex-wrap gap-1.5 justify-start">
                    {heatmapDays.map((day, idx) => (
                      <div 
                        key={idx} 
                        title={day.date}
                        className={cn(
                          "w-4 h-4 rounded-sm transition-colors",
                          day.active ? "bg-primary hover:bg-primary/80" : "bg-muted/50 hover:bg-muted"
                        )} 
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground font-semibold">
                    <span>{format(subDays(today, 59), 'MMM d')}</span>
                    <div className="flex items-center gap-1.5">
                      <span>Less</span>
                      <div className="w-3 h-3 rounded-[2px] bg-muted/50" />
                      <div className="w-3 h-3 rounded-[2px] bg-primary/40" />
                      <div className="w-3 h-3 rounded-[2px] bg-primary/70" />
                      <div className="w-3 h-3 rounded-[2px] bg-primary" />
                      <span>More</span>
                    </div>
                    <span>Today</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
