import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileFormData {
  full_name: string;
  bio: string;
  github_url: string;
  linkedin_url: string;
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [heatmap, setHeatmap] = useState<Map<string, number>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.id) {
      supabase.rpc('get_user_activity_heatmap', { p_user_id: user.id })
        .then(({ data, error }) => {
          if (!error && data) {
            const map = new Map<string, number>();
            (data as { activity_date: string; activity_count: number }[]).forEach(row => {
              map.set(row.activity_date, row.activity_count);
            });
            setHeatmap(map);
          }
        });
    }
  }, [user?.id]);

  const [form, setForm] = useState<ProfileFormData>({
    full_name:    profile?.full_name    ?? '',
    bio:          profile?.bio          ?? '',
    github_url:   profile?.github_url   ?? '',
    linkedin_url: profile?.linkedin_url ?? '',
  });

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url as string | undefined;

  const handleEdit = () => {
    setForm({
      full_name:    profile?.full_name    ?? '',
      bio:          profile?.bio          ?? '',
      github_url:   profile?.github_url   ?? '',
      linkedin_url: profile?.linkedin_url ?? '',
    });
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = form.full_name.trim();
    if (!trimmed) { toast.error('Name is required'); return; }
    if (trimmed.length > 150) { toast.error('Name must be 150 characters or fewer'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:    trimmed,
        bio:          form.bio.trim() || null,
        github_url:   form.github_url.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
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

    if (file.size > 1024 * 1024) {
      toast.error('Image must be smaller than 1 MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
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
        <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-stack-md space-y-6">
          <Skeleton className="h-48 rounded-2xl bg-surface border border-border-base" />
          <Skeleton className="h-64 rounded-2xl bg-surface border border-border-base" />
        </div>
      </AppLayout>
    );
  }

  const xp = profile.credits ?? 0;
  const level = Math.floor(xp / 1000) + 1;

  return (
    <AppLayout title="Profile">
      <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-stack-md flex flex-col gap-8 pb-24">
        
        {/* Profile Header Section */}
        <section className="relative rounded-2xl overflow-hidden glass-panel border border-border-base shadow-sm">
          {/* Banner Image */}
          <div className="h-48 md:h-64 w-full bg-surface-container-highest relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-tertiary/20"></div>
            <div className="absolute top-0 left-0 w-full h-full opacity-30 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent/10"></div>
          </div>
          
          {/* Profile Info Container */}
          <div className="relative px-6 pb-8 md:px-10 -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-surface overflow-hidden bg-surface-container shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary font-bold text-[48px]">
                    {initials}
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute top-2 -right-2 w-10 h-10 rounded-full bg-primary text-white border-2 border-surface flex items-center justify-center shadow-md hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-50"
              >
                {uploadingAvatar
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <span className="material-symbols-outlined text-[20px]">photo_camera</span>}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => void handleAvatarUpload(e)}
              />
              
              {/* Level Badge */}
              <div className="absolute bottom-2 right-2 bg-tertiary-container text-on-tertiary-container font-label-sm text-[12px] font-bold px-3 py-1 rounded-full border-2 border-surface shadow-sm">
                 Lvl {level}
              </div>
            </div>
            
            {/* Text Info */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary leading-tight">{displayName}</h2>
                {profile.role === 'admin' && <span className="bg-error/10 text-error font-label-sm text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-error/20">Admin</span>}
              </div>
              <p className="font-body-lg text-[16px] text-text-secondary mb-4 max-w-2xl">
                {profile.bio || "No bio added yet. Tell the community about yourself!"}
              </p>
              
              {/* Stats/XP */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-lg border border-border-base shadow-sm">
                  <span className="material-symbols-outlined text-warning text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-md text-[14px] font-bold text-text-primary">{xp.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-lg border border-border-base shadow-sm">
                  <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  <span className="font-label-md text-[14px] font-bold text-text-primary">{profile.streak_days ?? 0} Day Streak</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-lg border border-border-base shadow-sm">
                  <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  <span className="font-label-md text-[14px] font-bold text-text-primary">{profile.courses_completed ?? 0} Courses</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="pb-2 flex gap-3 w-full sm:w-auto mt-4 sm:mt-0">
              {!editing ? (
                <button onClick={handleEdit} className="flex-1 sm:flex-none bg-primary text-white font-label-md text-[14px] font-bold px-6 py-2.5 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2 shadow-sm card-lift">
                  <span className="material-symbols-outlined text-[18px]">edit</span> Edit Profile
                </button>
              ) : (
                <button onClick={handleCancel} className="flex-1 sm:flex-none bg-surface text-text-primary font-label-md text-[14px] font-bold px-6 py-2.5 rounded-lg hover:bg-surface-container transition-all flex items-center justify-center gap-2 border border-border-base shadow-sm card-lift">
                  Cancel
                </button>
              )}
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <div className="px-6 md:px-10 border-t border-border-base bg-surface-bright/50 flex overflow-x-auto custom-scrollbar">
            <button className="font-label-md text-[14px] font-bold text-primary border-b-2 border-primary py-4 px-2 mr-6 whitespace-nowrap">Overview</button>
            <button className="font-label-md text-[14px] font-medium text-text-secondary hover:text-text-primary py-4 px-2 mr-6 whitespace-nowrap transition-colors">Courses</button>
            <button className="font-label-md text-[14px] font-medium text-text-secondary hover:text-text-primary py-4 px-2 mr-6 whitespace-nowrap transition-colors">Skills</button>
            <button className="font-label-md text-[14px] font-medium text-text-secondary hover:text-text-primary py-4 px-2 mr-6 whitespace-nowrap transition-colors">Certificates</button>
            <button className="font-label-md text-[14px] font-medium text-text-secondary hover:text-text-primary py-4 px-2 whitespace-nowrap transition-colors">Activity</button>
          </div>
        </section>

        {/* Edit Form */}
        {editing && (
          <div className="glass-panel border border-border-base rounded-2xl p-6 md:p-8 shadow-sm card-lift animate-in fade-in slide-in-from-top-4">
            <h3 className="font-headline-md text-[24px] font-bold text-text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">edit_note</span> Edit Your Details
            </h3>
            <div className="space-y-5 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-[14px] font-bold text-text-primary">Full Name *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  maxLength={150}
                  className="bg-surface border-border-base text-[15px] focus:ring-primary/50 focus:border-primary shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-[14px] font-bold text-text-primary">Bio</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={4}
                  className="bg-surface border-border-base text-[15px] focus:ring-primary/50 focus:border-primary shadow-sm resize-y"
                  placeholder="Tell us about your learning goals..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="github_url" className="text-[14px] font-bold text-text-primary">GitHub URL</Label>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary material-symbols-outlined text-[18px]">code</span>
                     <Input
                       id="github_url"
                       value={form.github_url}
                       onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))}
                       className="bg-surface border-border-base text-[15px] focus:ring-primary/50 focus:border-primary shadow-sm pl-10"
                       placeholder="https://github.com/..."
                     />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url" className="text-[14px] font-bold text-text-primary">LinkedIn URL</Label>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary material-symbols-outlined text-[18px]">work</span>
                     <Input
                       id="linkedin_url"
                       value={form.linkedin_url}
                       onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                       className="bg-surface border-border-base text-[15px] focus:ring-primary/50 focus:border-primary shadow-sm pl-10"
                       placeholder="https://linkedin.com/in/..."
                     />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-end gap-3 border-t border-border-base mt-2">
                <Button onClick={handleCancel} variant="outline" className="font-bold border-border-base text-text-primary">Cancel</Button>
                <Button onClick={() => void handleSave()} disabled={saving} className="bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-bold shadow-sm">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Col: Social & Skill Matrix */}
          <div className="md:col-span-4 flex flex-col gap-8">
            
            {/* Social Links */}
            {(profile.github_url || profile.linkedin_url) && (
              <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm">
                <h3 className="font-label-sm text-[12px] font-bold text-text-secondary uppercase tracking-widest mb-4">Connected Profiles</h3>
                <div className="flex flex-col gap-3">
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-border-base bg-surface hover:border-primary/50 hover:shadow-md transition-all group card-lift">
                      <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[24px]">code</span>
                      </div>
                      <span className="font-label-md text-[14px] font-bold text-text-primary group-hover:text-primary transition-colors">GitHub Profile</span>
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-border-base bg-surface hover:border-primary/50 hover:shadow-md transition-all group card-lift">
                      <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[24px]">work</span>
                      </div>
                      <span className="font-label-md text-[14px] font-bold text-text-primary group-hover:text-primary transition-colors">LinkedIn Profile</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Skill Matrix */}
            <div className="glass-panel border border-border-base rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">psychology</span> Skill Matrix
              </h3>
              <div className="space-y-6">
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-label-md text-[14px] font-bold text-text-primary group-hover:text-primary transition-colors">Frontend Dev</span>
                    <span className="text-[10px] font-label-sm font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Expert</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden border border-border-base shadow-inner">
                    <div className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full relative w-[85%] shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
                  </div>
                </div>
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-label-md text-[14px] font-bold text-text-primary group-hover:text-secondary transition-colors">Backend Dev</span>
                    <span className="text-[10px] font-label-sm font-bold text-secondary font-mono bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">Advanced</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden border border-border-base shadow-inner">
                    <div className="h-full bg-gradient-to-r from-secondary/80 to-secondary rounded-full relative w-[65%] shadow-[0_0_10px_rgba(0,104,122,0.4)]"></div>
                  </div>
                </div>
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-label-md text-[14px] font-bold text-text-primary group-hover:text-tertiary transition-colors">System Design</span>
                    <span className="text-[10px] font-label-sm font-bold text-tertiary font-mono bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">Proficient</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden border border-border-base shadow-inner">
                    <div className="h-full bg-gradient-to-r from-tertiary/80 to-tertiary rounded-full relative w-[50%] shadow-[0_0_10px_rgba(99,46,205,0.4)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Heatmap & Achievements */}
          <div className="md:col-span-8 flex flex-col gap-8">
            
            {/* Learning Momentum (Heatmap) */}
            <div className="glass-panel border border-border-base rounded-2xl p-6 md:p-8 shadow-sm overflow-x-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">timeline</span> Learning Momentum
                </h3>
                <span className="font-label-sm text-[11px] font-bold text-text-secondary bg-surface-container px-3 py-1.5 rounded-full border border-border-base shadow-sm">Last 6 Months</span>
              </div>
              
              {/* Heatmap Grid */}
              <div className="flex gap-2 min-w-[600px] pb-2">
                <div className="flex flex-col gap-2 font-label-sm text-[12px] text-text-secondary font-medium w-8 pr-2 items-end pt-[20px]">
                  <span>Mon</span><span>Wed</span><span>Fri</span>
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: 26 }).map((_, c) => (
                    <div key={c} className="flex flex-col gap-2 pt-[20px] relative">
                      {c % 4 === 0 && <span className="absolute -mt-[24px] text-[11px] font-label-sm text-text-secondary font-medium">{
                        new Date(new Date().setDate(new Date().getDate() - (181 - (c * 7)))).toLocaleString('default', { month: 'short' })
                      }</span>}
                      {Array.from({ length: 7 }).map((_, r) => {
                        const cellIndex = c * 7 + r;
                        const daysAgo = 181 - cellIndex;
                        const date = new Date();
                        date.setDate(date.getDate() - daysAgo);
                        const dateStr = date.toISOString().split('T')[0];
                        const count = heatmap.get(dateStr) || 0;
                        
                        let intensityClass = 'bg-surface-container border border-border-base shadow-inner';
                        if (count >= 5) intensityClass = 'bg-primary border border-primary/50 shadow-[0_0_8px_rgba(37,99,235,0.5)]';
                        else if (count >= 3) intensityClass = 'bg-primary/80 border border-primary/40 shadow-sm';
                        else if (count >= 2) intensityClass = 'bg-primary/50 border border-primary/30';
                        else if (count >= 1) intensityClass = 'bg-primary/30 border border-primary/20';
                        
                        return <div key={r} title={`${count} activities on ${dateStr}`} className={`w-3.5 h-3.5 rounded-[3px] ${intensityClass} hover:scale-125 hover:z-10 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer`}></div>;
                      })}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end items-center gap-2 mt-6 font-label-sm text-[11px] font-medium text-text-secondary">
                <span>Less</span>
                <div className="w-3.5 h-3.5 rounded-[3px] bg-surface-container border border-border-base shadow-inner"></div>
                <div className="w-3.5 h-3.5 rounded-[3px] bg-primary/30 border border-primary/20"></div>
                <div className="w-3.5 h-3.5 rounded-[3px] bg-primary/50 border border-primary/30"></div>
                <div className="w-3.5 h-3.5 rounded-[3px] bg-primary/80 border border-primary/40 shadow-sm"></div>
                <div className="w-3.5 h-3.5 rounded-[3px] bg-primary border border-primary/50 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                <span>More</span>
              </div>
            </div>

            {/* Achievements Showcase */}
            <div className="glass-panel border border-border-base rounded-2xl p-6 md:p-8 shadow-sm flex-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> Achievements
                </h3>
                <a href="#" className="font-label-sm text-[12px] font-bold text-primary hover:text-primary-container transition-colors uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">View All</a>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border-base bg-surface hover:border-primary/50 hover:shadow-md transition-all group card-lift">
                  <div className="w-12 h-12 rounded-lg bg-tertiary-container/20 flex items-center justify-center shrink-0 border border-tertiary/20 shadow-inner group-hover:scale-105 transition-transform text-tertiary">
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-[14px] font-bold text-text-primary mb-1 leading-tight">{profile.streak_days ?? 0} Day Streak</h4>
                    <p className="font-body-sm text-[11px] text-text-secondary leading-tight">Consistent learning champion.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border-base bg-surface hover:border-primary/50 hover:shadow-md transition-all group card-lift">
                  <div className="w-12 h-12 rounded-lg bg-secondary-container/20 flex items-center justify-center shrink-0 border border-secondary/20 shadow-inner group-hover:scale-105 transition-transform text-secondary">
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>science</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-[14px] font-bold text-text-primary mb-1 leading-tight">Early Adopter</h4>
                    <p className="font-body-sm text-[11px] text-text-secondary leading-tight">Joined in the early days.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-border-base bg-surface hover:border-primary/50 hover:shadow-md transition-all group card-lift">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner group-hover:scale-105 transition-transform text-primary">
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-[14px] font-bold text-text-primary mb-1 leading-tight">{profile.courses_completed ?? 0} Courses</h4>
                    <p className="font-body-sm text-[11px] text-text-secondary leading-tight">Course milestones.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}
