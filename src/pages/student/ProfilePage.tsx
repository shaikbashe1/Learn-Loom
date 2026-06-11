import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  User, Mail, Github, Linkedin, Edit3, Save, X,
  Camera, Zap, Flame, Trophy, BookOpen, Award, Loader2,
} from 'lucide-react';
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
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-48 rounded-xl bg-muted" />
          <Skeleton className="h-64 rounded-xl bg-muted" />
        </div>
      </AppLayout>
    );
  }

  const roleLabel =
    profile.role === 'admin' ? 'Admin' :
    profile.role === 'instructor' ? 'Instructor' : 'Student';

  return (
    <AppLayout title="Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="w-24 h-24 ring-4 ring-primary/20">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label="Change avatar"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploadingAvatar
                    ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Camera className="w-3.5 h-3.5 text-white" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => void handleAvatarUpload(e)}
                  aria-label="Select avatar file"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-foreground text-balance">{displayName}</h1>
                  <Badge className="bg-primary/10 text-primary border-0 self-center md:self-auto">
                    {roleLabel}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center md:justify-start">
                  <Mail className="w-3.5 h-3.5" />{user?.email}
                </p>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mt-2 text-pretty">{profile.bio}</p>
                )}
                <div className="flex items-center gap-3 mt-3 justify-center md:justify-start">
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Github className="w-3.5 h-3.5" />GitHub
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Linkedin className="w-3.5 h-3.5" />LinkedIn
                    </a>
                  )}
                </div>
              </div>

              {!editing && (
                <Button variant="outline" size="sm" onClick={handleEdit} className="shrink-0">
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />Edit Profile
                </Button>
              )}
            </div>

            {/* Stats Row */}
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-lg font-bold text-foreground">{profile.credits}</span>
                </div>
                <p className="text-xs text-muted-foreground">Credits</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-lg font-bold text-foreground">{profile.streak_days}</span>
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-lg font-bold text-foreground">
                    {new Date(profile.created_at).getFullYear()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Joined</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        {editing && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-sm font-normal">Full Name *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  maxLength={150}
                  placeholder="Your full name"
                  className="px-3"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-sm font-normal">Bio</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="px-3 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="github_url" className="text-sm font-normal flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5" />GitHub URL
                  </Label>
                  <Input
                    id="github_url"
                    value={form.github_url}
                    onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))}
                    placeholder="https://github.com/username"
                    className="px-3"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin_url" className="text-sm font-normal flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5" />LinkedIn URL
                  </Label>
                  <Input
                    id="linkedin_url"
                    value={form.linkedin_url}
                    onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/username"
                    className="px-3"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="w-4 h-4 mr-1.5" />Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border h-full">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-2">
              <BookOpen className="w-8 h-8 text-primary/60" />
              <p className="text-xs text-muted-foreground">Enrolled Courses</p>
              <a href="/courses" className="text-xs text-primary hover:underline">Browse Courses →</a>
            </CardContent>
          </Card>
          <Card className="border-border h-full">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-2">
              <Award className="w-8 h-8 text-chart-3/60" />
              <p className="text-xs text-muted-foreground">Certificates Earned</p>
              <a href="/certificates" className="text-xs text-primary hover:underline">View Certificates →</a>
            </CardContent>
          </Card>
          <Card className="border-border h-full">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500/60" />
              <p className="text-xs text-muted-foreground">Leaderboard Rank</p>
              <a href="/leaderboard" className="text-xs text-primary hover:underline">View Rankings →</a>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
