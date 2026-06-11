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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="max-w-[1440px] mx-auto w-full p-4 space-y-6">
          <Skeleton className="h-48 rounded-xl bg-surface border border-outline-variant/30" />
          <Skeleton className="h-64 rounded-xl bg-surface border border-outline-variant/30" />
        </div>
      </AppLayout>
    );
  }

  const roleLabel =
    profile.role === 'admin' ? 'Admin' :
    profile.role === 'instructor' ? 'Instructor' : 'Pro Member';

  const xp = profile.credits ?? 0;
  const level = Math.floor(xp / 1000) + 1;

  return (
    <AppLayout title="Profile">
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        
        {/* Hero / Header Section */}
        <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-xl flex flex-col md:flex-row items-start md:items-center gap-xl relative overflow-hidden group hover:border-outline-variant transition-colors">
          {/* Abstract BG Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 shrink-0">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-surface shadow-sm object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-surface shadow-sm ring-2 ring-primary/20 bg-surface-container-highest flex items-center justify-center text-primary font-bold text-4xl">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-surface border border-outline-variant/60 rounded-full p-1.5 flex flex-col items-center justify-center w-10 h-10 ring-4 ring-surface-container">
                <span className="text-label-sm font-label-sm font-bold text-primary text-[10px]">Lvl</span>
                <span className="text-label-md font-label-md text-on-surface leading-none">{level}</span>
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute top-0 -right-2 w-8 h-8 rounded-full bg-surface-container border border-outline-variant/50 flex items-center justify-center shadow-md hover:bg-surface-container-high transition-colors disabled:opacity-50 text-on-surface"
              >
                {uploadingAvatar
                  ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  : <span className="material-symbols-outlined text-[16px]">photo_camera</span>}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => void handleAvatarUpload(e)}
              />
            </div>
          </div>
          
          <div className="relative z-10 flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
              <div>
                <div className="flex items-center gap-sm mb-1">
                  <h2 className="text-headline-lg font-headline-lg text-on-surface">{displayName}</h2>
                  <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider">{roleLabel}</span>
                </div>
                <p className="text-body-lg font-body-lg text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">terminal</span>
                  Student Engineer
                </p>
                <p className="text-body-sm font-body-sm text-outline mt-2 max-w-2xl">
                  {profile.bio || "No bio added yet. Tell the community about yourself!"}
                </p>
                
                <div className="flex gap-3 mt-4">
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">code</span> GitHub
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">work</span> LinkedIn
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex gap-sm">
                {!editing ? (
                  <button onClick={handleEdit} className="px-md py-sm rounded bg-primary text-background hover:bg-primary-fixed transition-all text-label-md font-label-md flex items-center gap-2 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[18px]">edit</span> Edit Profile
                  </button>
                ) : (
                  <button onClick={handleCancel} className="px-md py-sm rounded border border-outline-variant/60 text-on-surface hover:border-outline hover:bg-surface-container-high transition-all text-label-md font-label-md flex items-center gap-2 whitespace-nowrap">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-xl">
            <h3 className="text-headline-md font-headline-md text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">edit_note</span> Edit Your Details
            </h3>
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-sm font-normal text-on-surface">Full Name *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  maxLength={150}
                  className="bg-surface border-outline-variant/50 text-on-surface"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-sm font-normal text-on-surface">Bio</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="bg-surface border-outline-variant/50 text-on-surface resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="github_url" className="text-sm font-normal text-on-surface">GitHub URL</Label>
                  <Input
                    id="github_url"
                    value={form.github_url}
                    onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))}
                    className="bg-surface border-outline-variant/50 text-on-surface"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin_url" className="text-sm font-normal text-on-surface">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    value={form.linkedin_url}
                    onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                    className="bg-surface border-outline-variant/50 text-on-surface"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button onClick={() => void handleSave()} disabled={saving} className="bg-primary text-background hover:bg-primary/90">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-xl">
          
          {/* Left Col: Stats & Skills */}
          <div className="md:col-span-4 flex flex-col gap-xl">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-sm">
              <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-md hover:border-outline transition-colors flex flex-col">
                <span className="text-label-sm font-label-sm text-on-surface-variant mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">stars</span> Total XP
                </span>
                <span className="text-headline-md font-headline-md text-primary">{xp.toLocaleString()}</span>
              </div>
              <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-md hover:border-outline transition-colors flex flex-col">
                <span className="text-label-sm font-label-sm text-on-surface-variant mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">library_books</span> Courses
                </span>
                <span className="text-headline-md font-headline-md text-on-surface">{profile.courses_completed ?? 0}</span>
              </div>
              <div className="col-span-2 bg-surface-container border border-outline-variant/60 rounded-xl p-md hover:border-outline transition-colors flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-on-surface-variant mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">local_fire_department</span> Day Streak
                  </span>
                  <span className="text-headline-md font-headline-md text-secondary">{profile.streak_days ?? 0}</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                  <span className="material-symbols-outlined text-secondary">workspace_premium</span>
                </div>
              </div>
            </div>

            {/* Skill Matrix */}
            <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-lg flex flex-col gap-md">
              <h3 className="text-body-lg font-body-lg text-on-surface font-semibold flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">psychology</span> Skill Matrix
              </h3>
              <div className="space-y-6">
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex flex-col">
                      <span className="text-label-md font-label-md text-on-surface group-hover:text-primary transition-colors">Frontend Dev</span>
                    </div>
                    <span className="text-[10px] font-label-sm text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">Expert</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/30">
                    <div className="h-full bg-primary rounded-full relative w-[85%] shadow-[0_0_12px_rgba(192,193,255,0.4)]"></div>
                  </div>
                </div>
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex flex-col">
                      <span className="text-label-md font-label-md text-on-surface group-hover:text-secondary transition-colors">Backend Dev</span>
                    </div>
                    <span className="text-[10px] font-label-sm text-secondary font-mono bg-secondary/10 px-2 py-0.5 rounded">Advanced</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/30">
                    <div className="h-full bg-secondary rounded-full relative w-[65%] shadow-[0_0_12px_rgba(221,183,255,0.3)]"></div>
                  </div>
                </div>
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex flex-col">
                      <span className="text-label-md font-label-md text-on-surface group-hover:text-tertiary transition-colors">System Design</span>
                    </div>
                    <span className="text-[10px] font-label-sm text-tertiary font-mono bg-tertiary/10 px-2 py-0.5 rounded">Proficient</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/30">
                    <div className="h-full bg-tertiary rounded-full relative w-[50%] shadow-[0_0_12px_rgba(255,183,131,0.3)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Heatmap & Achievements */}
          <div className="md:col-span-8 flex flex-col gap-xl">
            
            {/* Learning Momentum (Heatmap) */}
            <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-lg overflow-x-auto">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="text-body-lg font-body-lg text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined">timeline</span> Learning Momentum
                </h3>
                <span className="text-label-sm font-label-sm text-on-surface-variant bg-surface-container-highest px-2 py-1 rounded">Last 6 Months</span>
              </div>
              
              {/* Heatmap Grid Simulation (Static Mock for visual parity) */}
              <div className="flex gap-1.5 min-w-[600px] pb-2">
                <div className="flex flex-col gap-1.5 text-label-sm font-label-sm text-outline w-8 pr-2 items-end pt-[18px]">
                  <span>Mon</span><span>Wed</span><span>Fri</span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: 26 }).map((_, c) => (
                    <div key={c} className="flex flex-col gap-1.5 pt-[18px] relative">
                      {c % 4 === 0 && <span className="absolute -mt-[22px] text-[10px] font-mono text-outline">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][(Math.floor(c/4)) % 6]}</span>}
                      {Array.from({ length: 7 }).map((_, r) => {
                        const rand = Math.random();
                        let intensityClass = 'bg-surface-container-highest border border-outline-variant/20';
                        if (rand > 0.9) intensityClass = 'bg-primary border border-primary-fixed shadow-[0_0_8px_rgba(192,193,255,0.4)]';
                        else if (rand > 0.8) intensityClass = 'bg-primary/80 border border-primary/40';
                        else if (rand > 0.6) intensityClass = 'bg-primary/50 border border-primary/20';
                        else if (rand > 0.4) intensityClass = 'bg-primary/20 border border-primary/10';
                        
                        return <div key={r} className={`w-3 h-3 rounded-sm ${intensityClass} hover:scale-125 transition-transform cursor-pointer`}></div>;
                      })}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end items-center gap-2 mt-4 text-[10px] font-mono text-outline">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-surface-container-highest"></div>
                <div className="w-3 h-3 rounded-sm bg-primary/20"></div>
                <div className="w-3 h-3 rounded-sm bg-primary/50"></div>
                <div className="w-3 h-3 rounded-sm bg-primary/80"></div>
                <div className="w-3 h-3 rounded-sm bg-primary shadow-[0_0_8px_rgba(192,193,255,0.4)]"></div>
                <span>More</span>
              </div>
            </div>

            {/* Achievements Showcase */}
            <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-lg flex-1">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="text-body-lg font-body-lg text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined">military_tech</span> Achievements
                </h3>
                <a href="#" className="text-label-sm font-label-sm text-primary hover:text-primary-fixed transition-colors">View All</a>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
                <div className="flex items-start gap-md p-md rounded-lg border border-outline-variant/40 bg-surface/50 hover:bg-surface hover:border-outline-variant transition-colors group">
                  <div className="w-12 h-12 rounded bg-tertiary-container/20 flex items-center justify-center shrink-0 border border-tertiary/20 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-tertiary text-[24px]">local_fire_department</span>
                  </div>
                  <div>
                    <h4 className="text-label-md font-label-md text-on-surface mb-0.5">{profile.streak_days} Day Streak</h4>
                    <p className="text-[11px] font-label-sm text-on-surface-variant leading-tight">Consistent learning champion.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-md p-md rounded-lg border border-outline-variant/40 bg-surface/50 hover:bg-surface hover:border-outline-variant transition-colors group">
                  <div className="w-12 h-12 rounded bg-secondary-container/20 flex items-center justify-center shrink-0 border border-secondary/20 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-secondary text-[24px]">science</span>
                  </div>
                  <div>
                    <h4 className="text-label-md font-label-md text-on-surface mb-0.5">Early Adopter</h4>
                    <p className="text-[11px] font-label-sm text-on-surface-variant leading-tight">Joined the platform in its early days.</p>
                  </div>
                </div>

                <div className="flex items-start gap-md p-md rounded-lg border border-outline-variant/40 bg-surface/50 hover:bg-surface hover:border-outline-variant transition-colors group">
                  <div className="w-12 h-12 rounded bg-primary-container/20 flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-primary text-[24px]">workspace_premium</span>
                  </div>
                  <div>
                    <h4 className="text-label-md font-label-md text-on-surface mb-0.5">{profile.courses_completed} Courses</h4>
                    <p className="text-[11px] font-label-sm text-on-surface-variant leading-tight">Course completion milestones.</p>
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
