import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, User, Mail, Phone, MapPin, GraduationCap, Briefcase, Target, Clock, Code, Award, Flame, Star, Search, CheckCircle2, ChevronRight, Edit3, Save, X, Link as LinkIcon, Github, Linkedin, FileText, LayoutDashboard } from 'lucide-react';
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
      <AppLayout title="Profile">
        <div className="max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
          <Skeleton className="h-64 rounded-2xl bg-surface border border-border-base" />
          <Skeleton className="h-96 rounded-2xl bg-surface border border-border-base" />
        </div>
      </AppLayout>
    );
  }

  const completionPercent = calculateCompletion();
  const exts = (profile.extensions as Record<string, string>) || {};
  const isStudent = profile.user_type === 'student';

  return (
    <AppLayout title="Profile">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER SECTION (LinkedIn Style) */}
        <section className="bg-surface border border-border-base rounded-2xl overflow-hidden shadow-sm relative">
          {/* Banner */}
          <div className="h-40 sm:h-56 bg-gradient-to-r from-primary/20 via-secondary/10 to-tertiary/20 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
            <button 
              className="absolute top-4 right-4 bg-surface/80 backdrop-blur-sm p-2 rounded-full border border-border-base hover:bg-surface text-text-secondary hover:text-primary transition-colors"
              onClick={handleEdit}
            >
              <Edit3 className="w-5 h-5" />
            </button>
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
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {uploadingAvatar ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <span className="material-symbols-outlined text-white text-[32px]">photo_camera</span>}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => void handleAvatarUpload(e)} />
              </div>
              
              {/* Basic Info */}
              <div className="flex-1 text-center sm:text-left pb-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">{profile.full_name}</h1>
                <p className="text-lg text-text-secondary font-medium mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-primary font-bold">{profile.username ? `@${profile.username}` : 'No username'}</span>
                  <span className="text-border-base">•</span>
                  <span>{profile.user_type ? profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1) : 'Member'}</span>
                </p>
                <p className="text-text-primary mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
                  {profile.bio || 'This user prefers to keep an air of mystery. Add a bio to let people know about you!'}
                </p>
              </div>
            </div>

            {/* Completion Bar */}
            <div className="bg-surface-container-low border border-border-base rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-inner">
              <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between text-sm font-bold text-text-primary">
                  <span>Profile Strength: {completionPercent < 50 ? 'Beginner' : completionPercent < 90 ? 'Intermediate' : 'All-Star'}</span>
                  <span className="text-primary">{completionPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${completionPercent}%` }}></div>
                </div>
              </div>
              {completionPercent < 100 && !editing && (
                <Button onClick={handleEdit} variant="outline" className="shrink-0 w-full sm:w-auto font-bold border-primary/20 hover:bg-primary/5 text-primary">
                  Complete Profile
                </Button>
              )}
            </div>
          </div>
        </section>

        {editing ? (
          /* EDIT MODE VIEW */
          <section className="bg-surface border border-border-base rounded-2xl p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between border-b border-border-base pb-4">
              <h2 className="text-2xl font-bold text-text-primary">Edit Profile</h2>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="text-text-secondary hover:text-error"><X /></Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Core Information */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-primary flex items-center gap-2"><User className="w-5 h-5"/> Personal Information</h3>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="bg-surface-container-low" />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-surface-container-low" placeholder="e.g. johndoe123" />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <Input value={form.mobile_number} onChange={e => setForm({...form, mobile_number: e.target.value})} className="bg-surface-container-low" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="bg-surface-container-low" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="bg-surface-container-low" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="bg-surface-container-low" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} className="bg-surface-container-low" />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Label>Bio</Label>
                  <Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="bg-surface-container-low resize-y" rows={3} />
                </div>
              </div>

              {/* Education / Career (Contextual based on user type) */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-secondary flex items-center gap-2">
                  {isStudent ? <GraduationCap className="w-5 h-5"/> : <Briefcase className="w-5 h-5" />} 
                  {isStudent ? 'Education' : 'Career Details'}
                </h3>
                
                {isStudent ? (
                  <>
                    <div className="space-y-2">
                      <Label>College / University</Label>
                      <Input value={form.college_name} onChange={e => setForm({...form, college_name: e.target.value})} className="bg-surface-container-low" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Degree</Label>
                        <Input value={form.degree} onChange={e => setForm({...form, degree: e.target.value})} className="bg-surface-container-low" placeholder="B.Tech" />
                      </div>
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Input value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} className="bg-surface-container-low" placeholder="CSE" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Graduation Year</Label>
                        <Input type="number" value={form.graduation_year} onChange={e => setForm({...form, graduation_year: e.target.value})} className="bg-surface-container-low" />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Semester</Label>
                        <Input type="number" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} className="bg-surface-container-low" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="bg-surface-container-low" />
                    </div>
                    <div className="space-y-2">
                      <Label>Designation / Role</Label>
                      <Input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} className="bg-surface-container-low" />
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-border-base mt-4 space-y-4">
                   <h3 className="font-bold text-lg text-tertiary flex items-center gap-2"><Target className="w-5 h-5"/> Goals</h3>
                   <div className="space-y-2">
                     <Label>Dream Roles (Comma separated)</Label>
                     <Input value={form.dream_roles} onChange={e => setForm({...form, dream_roles: e.target.value})} className="bg-surface-container-low" placeholder="e.g. SDE I, Data Scientist" />
                   </div>
                   <div className="space-y-2">
                     <Label>Dream Companies (Comma separated)</Label>
                     <Input value={form.dream_companies} onChange={e => setForm({...form, dream_companies: e.target.value})} className="bg-surface-container-low" placeholder="e.g. Google, Microsoft" />
                   </div>
                   <div className="space-y-2">
                     <Label>Daily Learning Goal</Label>
                     <Input value={form.daily_learning_time} onChange={e => setForm({...form, daily_learning_time: e.target.value})} className="bg-surface-container-low" placeholder="e.g. 2 hours" />
                   </div>
                </div>
              </div>

              {/* Skills & Social Links */}
              <div className="space-y-4 md:col-span-2 border-t border-border-base pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h3 className="font-bold text-lg text-primary flex items-center gap-2"><Code className="w-5 h-5"/> Skills</h3>
                     <div className="space-y-2">
                       <Label>Skills & Interests (Comma separated)</Label>
                       <Textarea value={form.interests} onChange={e => setForm({...form, interests: e.target.value})} className="bg-surface-container-low" placeholder="e.g. React, Java, UI/UX" rows={4} />
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-text-primary flex items-center gap-2"><LinkIcon className="w-5 h-5"/> Links</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative">
                        <Github className="absolute left-3 top-2.5 w-5 h-5 text-text-secondary" />
                        <Input value={form.github_url} onChange={e => setForm({...form, github_url: e.target.value})} className="pl-10 bg-surface-container-low" placeholder="GitHub URL" />
                      </div>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-2.5 w-5 h-5 text-text-secondary" />
                        <Input value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url: e.target.value})} className="pl-10 bg-surface-container-low" placeholder="LinkedIn URL" />
                      </div>
                      <div className="relative">
                        <LayoutDashboard className="absolute left-3 top-2.5 w-5 h-5 text-text-secondary" />
                        <Input value={form.portfolio_url} onChange={e => setForm({...form, portfolio_url: e.target.value})} className="pl-10 bg-surface-container-low" placeholder="Portfolio URL" />
                      </div>
                      <div className="relative">
                        <FileText className="absolute left-3 top-2.5 w-5 h-5 text-text-secondary" />
                        <Input value={form.resume_url} onChange={e => setForm({...form, resume_url: e.target.value})} className="pl-10 bg-surface-container-low" placeholder="Resume Link (GDrive, etc)" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border-base sticky bottom-0 bg-surface p-4 -mx-6 sm:-mx-8 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] sm:static sm:p-0 sm:mx-0 sm:bg-transparent sm:shadow-none">
              <Button variant="outline" onClick={handleCancel} className="font-bold">Cancel</Button>
              <Button onClick={() => void handleSave()} disabled={saving} className="font-bold bg-primary text-white gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
              </Button>
            </div>
          </section>
        ) : (
          /* READ-ONLY DASHBOARD VIEW */
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN */}
            <div className="xl:col-span-1 space-y-8">
              
              {/* Personal Info Card */}
              <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-text-primary mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Info</h3>
                <div className="space-y-4">
                  {profile.full_name && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <User className="w-4 h-4" /> <span className="text-sm font-medium">{profile.full_name}</span>
                    </div>
                  )}
                  {profile.username && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <div className="w-4 h-4 font-bold text-sm leading-none flex items-center justify-center">@</div> <span className="text-sm font-medium">{profile.username}</span>
                    </div>
                  )}
                  {profile.mobile_number && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <Phone className="w-4 h-4" /> <span className="text-sm font-medium">{profile.mobile_number}</span>
                    </div>
                  )}
                  {user?.email && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <Mail className="w-4 h-4" /> <span className="text-sm font-medium">{user.email}</span>
                    </div>
                  )}
                  {(profile.city || profile.state || profile.country || profile.pincode) && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <MapPin className="w-4 h-4" /> <span className="text-sm font-medium">{[profile.city, profile.state, profile.country, profile.pincode].filter(Boolean).join(', ')}</span>
                    </div>
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
                  ) : <p className="text-sm text-text-secondary italic">No education details added yet.</p>
                ) : (
                  exts.company ? (
                    <div className="space-y-2">
                      <p className="font-bold text-text-primary">{exts.designation || 'Professional'}</p>
                      <p className="text-sm text-text-secondary font-medium">at {exts.company}</p>
                    </div>
                  ) : <p className="text-sm text-text-secondary italic">No work experience added yet.</p>
                )}
              </div>

              {/* Social Links */}
              <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-text-primary mb-4 flex items-center gap-2"><LinkIcon className="w-5 h-5 text-text-secondary" /> Links</h3>
                <div className="space-y-3">
                  <a href={profile.github_url || '#'} target={profile.github_url ? "_blank" : undefined} className={`flex items-center gap-3 p-3 rounded-lg border ${profile.github_url ? 'bg-surface-container-low border-border-base hover:border-primary/50 text-text-primary' : 'bg-surface border-dashed text-text-secondary opacity-70'} transition-colors`}>
                    <Github className="w-5 h-5" /> 
                    <span className="text-sm font-bold flex-1">GitHub</span>
                    {!profile.github_url && <span className="text-xs">Not added</span>}
                  </a>
                  <a href={profile.linkedin_url || '#'} target={profile.linkedin_url ? "_blank" : undefined} className={`flex items-center gap-3 p-3 rounded-lg border ${profile.linkedin_url ? 'bg-surface-container-low border-border-base hover:border-primary/50 text-text-primary' : 'bg-surface border-dashed text-text-secondary opacity-70'} transition-colors`}>
                    <Linkedin className="w-5 h-5" /> 
                    <span className="text-sm font-bold flex-1">LinkedIn</span>
                    {!profile.linkedin_url && <span className="text-xs">Not added</span>}
                  </a>
                  <a href={profile.portfolio_url || '#'} target={profile.portfolio_url ? "_blank" : undefined} className={`flex items-center gap-3 p-3 rounded-lg border ${profile.portfolio_url ? 'bg-surface-container-low border-border-base hover:border-primary/50 text-text-primary' : 'bg-surface border-dashed text-text-secondary opacity-70'} transition-colors`}>
                    <LayoutDashboard className="w-5 h-5" /> 
                    <span className="text-sm font-bold flex-1">Portfolio</span>
                    {!profile.portfolio_url && <span className="text-xs">Not added</span>}
                  </a>
                  <a href={profile.resume_url || '#'} target={profile.resume_url ? "_blank" : undefined} className={`flex items-center gap-3 p-3 rounded-lg border ${profile.resume_url ? 'bg-surface-container-low border-border-base hover:border-primary/50 text-text-primary' : 'bg-surface border-dashed text-text-secondary opacity-70'} transition-colors`}>
                    <FileText className="w-5 h-5" /> 
                    <span className="text-sm font-bold flex-1">Resume</span>
                    {!profile.resume_url && <span className="text-xs">Not added</span>}
                  </a>
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
                    {profile.interests.map((skill, idx) => (
                      <span key={idx} className="bg-surface-container-low border border-border-base text-text-primary text-sm font-bold px-4 py-2 rounded-full shadow-sm hover:border-primary hover:text-primary transition-colors cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary italic">No skills added yet.</p>
                )}
              </div>

              {/* Career Goals */}
              <div className="bg-surface border border-border-base rounded-2xl p-6 sm:p-8 shadow-sm">
                <h3 className="font-bold text-lg text-text-primary mb-6 flex items-center gap-2"><Target className="w-5 h-5 text-tertiary" /> Career Goals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Dream Roles</p>
                    {profile.dream_roles && profile.dream_roles.length > 0 ? (
                      <ul className="space-y-2">
                        {profile.dream_roles.map((role, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm font-bold text-text-primary">
                            <span className="w-2 h-2 rounded-full bg-tertiary"></span> {role}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-text-secondary italic">Not specified</p>}
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Target Companies</p>
                    {profile.dream_companies && profile.dream_companies.length > 0 ? (
                      <ul className="space-y-2">
                        {profile.dream_companies.map((company, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm font-bold text-text-primary">
                            <span className="w-2 h-2 rounded-full bg-secondary"></span> {company}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-text-secondary italic">Not specified</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-2 pt-4 border-t border-border-base">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Daily Learning Goal</p>
                    <p className="text-sm font-medium text-text-primary">{profile.daily_learning_time ? `${profile.daily_learning_time} per day` : <span className="italic text-text-secondary">Not specified</span>}</p>
                  </div>
                  
                  <div className="sm:col-span-2 space-y-2 pt-4 border-t border-border-base">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Primary Objective</p>
                    <p className="text-sm font-medium text-text-primary">{profile.learning_goal || <span className="italic text-text-secondary">Not specified</span>}</p>
                  </div>
                </div>
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
        )}
      </div>
    </AppLayout>
  );
}
