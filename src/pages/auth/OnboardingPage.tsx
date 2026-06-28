import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import { OnboardingProvider } from '@/components/onboarding/OnboardingContext';
import { STEPS } from '@/components/onboarding/steps';
import type { OnboardingForm, ArrayField, OnboardingContextValue } from '@/components/onboarding/types';
import { EMPTY_FORM } from '@/components/onboarding/types';

const TOTAL_STEPS = STEPS.length;
const STEP_KEY = 'll_onboarding_step';

function toInt(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingForm>(EMPTY_FORM);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Prefill from existing profile (resume) + Google OAuth metadata, and restore
  // the furthest step reached (server value wins, falls back to localStorage).
  useEffect(() => {
    if (hydrated || !(profile || user)) return;
    const meta = (user?.user_metadata ?? {}) as Record<string, string>;
    setForm((prev) => ({
      ...prev,
      full_name: profile?.full_name || meta.full_name || meta.name || '',
      username: profile?.username || '',
      avatar_url: profile?.avatar_url || meta.avatar_url || meta.picture || '',
      user_type: profile?.user_type || '',
      college_name: profile?.college_name || '',
      course: profile?.course || '',
      degree: profile?.degree || '',
      branch: profile?.branch || '',
      year: profile?.year != null ? String(profile.year) : '',
      semester: profile?.semester != null ? String(profile.semester) : '',
      graduation_year: profile?.graduation_year != null ? String(profile.graduation_year) : '',
      mobile_number: profile?.mobile_number || '',
      country: profile?.country || '',
      state: profile?.state || '',
      city: profile?.city || '',
      pincode: profile?.pincode || '',
      language_preference: profile?.language_preference || 'English',
      bio: profile?.bio || '',
      dream_roles: profile?.dream_roles || [],
      dream_companies: profile?.dream_companies || [],
      interests: profile?.interests || [],
      learning_goal: profile?.learning_goal || '',
      daily_learning_time: profile?.daily_learning_time || '',
    }));

    const local = Number(localStorage.getItem(STEP_KEY));
    const server = profile?.onboarding_step ?? 0;
    const resume = Math.max(Number.isFinite(local) ? local : 0, server);
    setStep(Math.min(Math.max(resume, 0), TOTAL_STEPS - 1));
    setHydrated(true);
  }, [profile, user, hydrated]);

  // Never show the wizard once it's done.
  useEffect(() => {
    if (profile?.onboarding_completed) {
      localStorage.removeItem(STEP_KEY);
      navigate('/dashboard', { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  const set = <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: ArrayField, value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }));

  const username = useUsernameAvailability(form.username, profile?.username || undefined);
  const isStudent = form.user_type === 'student';

  // Avatar upload → avatars bucket, folder = user.id (per-user RLS).
  const onAvatarFile = async (file: File | undefined) => {
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large', { description: 'Please pick an image under 5 MB.' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      set('avatar_url', data.publicUrl);
      toast.success('Photo updated');
    } catch (e) {
      toast.error('Upload failed', { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const ctx: OnboardingContextValue = {
    form, set, toggle, username, isStudent, uploading, onAvatarFile,
    email: user?.email ?? '',
  };

  const current = STEPS[step];
  const stepValid = current.isValid(ctx);

  // Map the form to profile columns (autosave after each step → resume anywhere).
  const persist = async (nextStep: number, extra?: Record<string, unknown>) => {
    if (!user) return false;
    const payload: Record<string, unknown> = {
      full_name: form.full_name.trim() || null,
      username: form.username.trim() || null,
      avatar_url: form.avatar_url || null,
      user_type: form.user_type || null,
      college_name: isStudent ? form.college_name.trim() || null : null,
      course: isStudent ? form.course.trim() || null : null,
      degree: isStudent ? form.degree || null : null,
      branch: isStudent ? form.branch.trim() || null : null,
      year: isStudent ? toInt(form.year) : null,
      semester: isStudent ? toInt(form.semester) : null,
      graduation_year: isStudent ? toInt(form.graduation_year) : null,
      mobile_number: form.mobile_number.trim() || null,
      country: form.country.trim() || null,
      state: form.state.trim() || null,
      city: form.city.trim() || null,
      pincode: form.pincode.trim() || null,
      language_preference: form.language_preference || null,
      bio: form.bio.trim() || null,
      dream_roles: form.dream_roles,
      dream_companies: form.dream_companies,
      interests: form.interests,
      learning_goal: form.learning_goal || null,
      daily_learning_time: form.daily_learning_time || null,
      onboarding_step: nextStep,
      updated_at: new Date().toISOString(),
      ...extra,
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if (error) {
      const msg = /duplicate|unique/i.test(error.message)
        ? 'That username was just taken. Please pick another.'
        : error.message;
      toast.error('Could not save your progress', { description: msg });
      return false;
    }
    return true;
  };

  const goNext = async () => {
    if (!stepValid || saving) return;
    const next = Math.min(step + 1, TOTAL_STEPS - 1);
    setSaving(true);
    const ok = await persist(next);
    setSaving(false);
    if (!ok) return;
    setStep(next);
    localStorage.setItem(STEP_KEY, String(next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    localStorage.setItem(STEP_KEY, String(prev));
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const ok = await persist(step, { onboarding_completed: true });
    setSaving(false);
    if (!ok) return;
    localStorage.removeItem(STEP_KEY);
    await refreshProfile();
    toast.success('Welcome to LearnLoom! 🎉', { description: 'Your personalized profile is ready.' });
    navigate('/dashboard', { replace: true });
  };

  const progressPct = useMemo(() => ((step + 1) / TOTAL_STEPS) * 100, [step]);
  const isLast = step === TOTAL_STEPS - 1;
  const StepComponent = current.Component;

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      {/* Ambient background, consistent with auth pages */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary-container/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-[pulse_10s_ease-in-out_infinite_alternate]" />
        <div className="absolute top-[40%] right-[10%] w-80 h-80 bg-secondary-container/30 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-[pulse_12s_ease-in-out_infinite_alternate_reverse]" />
        <div className="absolute bottom-[10%] left-[30%] w-[30rem] h-[30rem] bg-tertiary-container/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
      </div>

      <main className="relative z-10 w-full max-w-2xl px-margin-mobile md:px-0 py-2xl">
        {/* Progress header */}
        <div className="mb-xl">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-headline-lg text-primary tracking-tight">LearnLoom</h1>
            <span className="font-label-md text-label-md text-on-surface-variant">
              Step {step + 1} of {TOTAL_STEPS}
            </span>
          </div>
          {/* Segmented multi-step progress bar */}
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="h-2 flex-1 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: i <= step ? '100%' : '0%' }}
                />
              </div>
            ))}
          </div>
          <p className="sr-only">{Math.round(progressPct)}% complete</p>
        </div>

        <div className="glass-panel rounded-[24px] p-stack-xl flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="mb-stack-lg">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">{current.title}</h2>
            {current.subtitle && (
              <p className="font-body-md text-body-md text-on-surface-variant">{current.subtitle}</p>
            )}
          </div>

          {/* Animated step body */}
          <div key={current.id} className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-[260px]">
            <OnboardingProvider value={ctx}>
              <StepComponent />
            </OnboardingProvider>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-stack-lg pt-5 border-t border-outline-variant/30">
            {step > 0 && (
              <button type="button" onClick={goBack}
                className="flex items-center gap-1 px-5 py-md rounded-full text-on-surface-variant hover:text-on-surface font-label-lg text-label-lg transition">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back
              </button>
            )}
            <div className="flex-1" />
            {!isLast ? (
              <button type="button" onClick={goNext} disabled={!stepValid || saving}
                className="flex items-center gap-2 bg-primary text-on-primary font-label-lg text-label-lg rounded-full px-7 py-md hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                {saving ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : null}
                {step === 0 ? 'Get started' : 'Continue'}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            ) : (
              <button type="button" onClick={finish} disabled={saving}
                className="flex items-center gap-2 bg-primary text-on-primary font-label-lg text-label-lg rounded-full px-7 py-md hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-[0.98] disabled:opacity-60">
                {saving ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : <span className="material-symbols-outlined text-[20px]">rocket_launch</span>}
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
