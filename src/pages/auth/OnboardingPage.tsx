import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import {
  PERSONAS, DREAM_ROLES, DREAM_COMPANIES, SKILL_CATEGORIES,
  LEARNING_GOALS, DAILY_TIME_SLOTS, LANGUAGES, DEGREES,
} from '@/data/onboardingOptions';
import { Chip, OptionCard, FieldLabel, TextField } from '@/components/onboarding/OnboardingUI';

const TOTAL_STEPS = 10;
const BIO_LIMIT = 300;
const STEP_KEY = 'll_onboarding_step';

interface OnboardingForm {
  full_name: string;
  username: string;
  avatar_url: string;
  user_type: string;
  college_name: string;
  course: string;
  degree: string;
  branch: string;
  year: string;
  semester: string;
  graduation_year: string;
  mobile_number: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  language_preference: string;
  bio: string;
  dream_roles: string[];
  dream_companies: string[];
  interests: string[];
  learning_goal: string;
  daily_learning_time: string;
}

const EMPTY: OnboardingForm = {
  full_name: '', username: '', avatar_url: '', user_type: '',
  college_name: '', course: '', degree: '', branch: '',
  year: '', semester: '', graduation_year: '',
  mobile_number: '', country: '', state: '', city: '', pincode: '',
  language_preference: 'English', bio: '',
  dream_roles: [], dream_companies: [], interests: [],
  learning_goal: '', daily_learning_time: '',
};

function toInt(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(() => {
    const saved = Number(localStorage.getItem(STEP_KEY));
    return Number.isFinite(saved) && saved >= 0 && saved < TOTAL_STEPS ? saved : 0;
  });
  const [form, setForm] = useState<OnboardingForm>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customCompany, setCustomCompany] = useState('');

  // Prefill from existing profile (resume) and Google OAuth metadata.
  useEffect(() => {
    if (hydrated) return;
    const meta = (user?.user_metadata ?? {}) as Record<string, string>;
    if (profile || user) {
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
      setHydrated(true);
    }
  }, [profile, user, hydrated]);

  // If onboarding is already done, never show the wizard.
  useEffect(() => {
    if (profile?.onboarding_completed) {
      localStorage.removeItem(STEP_KEY);
      navigate('/dashboard', { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  const set = <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: 'dream_roles' | 'dream_companies' | 'interests', value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }));

  const username = useUsernameAvailability(form.username, profile?.username || undefined);
  const isStudent = form.user_type === 'student';

  // ── Per-step validation ────────────────────────────────────────────────
  const stepValid = useMemo(() => {
    switch (step) {
      case 0: return true;
      case 1: return form.full_name.trim().length >= 2 && username.status === 'available';
      case 2: return form.user_type !== '' && (!isStudent || form.college_name.trim() !== '');
      case 3: return true; // personal info optional
      case 4: return form.bio.length <= BIO_LIMIT;
      case 5: return form.dream_roles.length > 0;
      case 6: return form.interests.length > 0;
      case 7: return form.learning_goal !== '';
      case 8: return form.daily_learning_time !== '';
      case 9: return true;
      default: return true;
    }
  }, [step, form, username.status, isStudent]);

  // ── Persistence (autosave after each step → resume on refresh) ──────────
  const persist = async (extra?: Partial<Record<string, unknown>>) => {
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
      updated_at: new Date().toISOString(),
      ...extra,
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if (error) {
      // Unique violation on username is the common case worth a friendly message.
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
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (!ok) return;
    const next = Math.min(step + 1, TOTAL_STEPS - 1);
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
    const ok = await persist({ onboarding_completed: true });
    setSaving(false);
    if (!ok) return;
    localStorage.removeItem(STEP_KEY);
    await refreshProfile();
    toast.success('Welcome to LearnLoom! 🎉', { description: 'Your personalized profile is ready.' });
    navigate('/dashboard', { replace: true });
  };

  // ── Avatar upload → avatars bucket, folder = user.id ────────────────────
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

  const addCustomCompany = () => {
    const v = customCompany.trim();
    if (!v) return;
    if (!form.dream_companies.includes(v)) set('dream_companies', [...form.dream_companies, v]);
    setCustomCompany('');
  };

  const stepMeta = STEPS[step];

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
          <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        <div className="glass-panel rounded-[24px] p-stack-xl flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Title */}
          <div className="mb-stack-lg">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">{stepMeta.title}</h2>
            {stepMeta.subtitle && (
              <p className="font-body-md text-body-md text-on-surface-variant">{stepMeta.subtitle}</p>
            )}
          </div>

          {/* Animated step body */}
          <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-[260px]">
            {/* STEP 1 — Welcome */}
            {step === 0 && (
              <div className="flex flex-col items-center text-center py-6">
                <div className="text-6xl mb-6">🎓</div>
                <p className="font-body-lg text-body-lg text-on-surface max-w-md">
                  A few quick questions help us tailor your roadmaps, courses, and job matches
                  to exactly what you want to achieve.
                </p>
              </div>
            )}

            {/* STEP 2 — Basic Profile */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/20 text-primary flex items-center justify-center font-display text-2xl border-2 border-primary/40">
                      {form.avatar_url
                        ? <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        : (form.full_name ? form.full_name.slice(0, 2).toUpperCase() : '??')}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-surface shadow-sm hover:scale-105 transition-transform cursor-pointer">
                      <span className="material-symbols-outlined text-[14px] text-on-primary">
                        {uploading ? 'sync' : 'photo_camera'}
                      </span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => onAvatarFile(e.target.files?.[0])} />
                    </label>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">Profile Photo</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Upload one or keep your Google photo.
                    </p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Full name</FieldLabel>
                  <TextField icon="person" value={form.full_name} onChange={(v) => set('full_name', v)}
                    placeholder="Your full name" />
                </div>

                <div>
                  <FieldLabel hint="3–30 letters, numbers or _">Username</FieldLabel>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">alternate_email</span>
                    <input
                      value={form.username}
                      onChange={(e) => set('username', e.target.value.replace(/\s/g, ''))}
                      placeholder="shaikbashe"
                      className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md pl-[3rem] pr-12 font-body-md text-body-md placeholder:text-outline transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {username.status === 'checking' && <span className="material-symbols-outlined animate-spin text-on-surface-variant text-[20px]">progress_activity</span>}
                      {username.status === 'available' && <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>}
                      {(username.status === 'taken' || username.status === 'invalid') && <span className="material-symbols-outlined text-red-500 text-[20px]">cancel</span>}
                    </span>
                  </div>
                  <p className="mt-1.5 font-body-sm text-body-sm h-5">
                    {username.status === 'taken' && <span className="text-red-500">That handle is taken.</span>}
                    {username.status === 'invalid' && <span className="text-red-500">Use 3–30 letters, numbers or underscores.</span>}
                    {username.status === 'available' && <span className="text-green-500">@{form.username} is available!</span>}
                    {username.status === 'error' && <span className="text-amber-500">Couldn’t check right now — try again.</span>}
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3 — Education / role details */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-3">
                  {PERSONAS.map((p) => (
                    <OptionCard key={p.value} label={p.label} icon={p.icon}
                      selected={form.user_type === p.value}
                      onClick={() => set('user_type', p.value)} />
                  ))}
                </div>

                {isStudent && (
                  <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                    <div>
                      <FieldLabel>College / University name</FieldLabel>
                      <TextField icon="account_balance" value={form.college_name}
                        onChange={(v) => set('college_name', v)} placeholder="e.g. IIT Bombay" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Course</FieldLabel>
                        <TextField value={form.course} onChange={(v) => set('course', v)} placeholder="e.g. Computer Science" />
                      </div>
                      <div>
                        <FieldLabel>Degree</FieldLabel>
                        <select value={form.degree} onChange={(e) => set('degree', e.target.value)}
                          className="w-full bg-surface-container border border-outline-variant text-on-surface rounded-full py-md px-5 font-body-md text-body-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                          <option value="">Select…</option>
                          {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Branch</FieldLabel>
                        <TextField value={form.branch} onChange={(v) => set('branch', v)} placeholder="e.g. CSE / ECE" />
                      </div>
                      <div>
                        <FieldLabel>Expected graduation</FieldLabel>
                        <TextField value={form.graduation_year} inputMode="numeric"
                          onChange={(v) => set('graduation_year', v.replace(/\D/g, '').slice(0, 4))} placeholder="2027" />
                      </div>
                      <div>
                        <FieldLabel>Year</FieldLabel>
                        <TextField value={form.year} inputMode="numeric"
                          onChange={(v) => set('year', v.replace(/\D/g, '').slice(0, 1))} placeholder="3" />
                      </div>
                      <div>
                        <FieldLabel>Semester</FieldLabel>
                        <TextField value={form.semester} inputMode="numeric"
                          onChange={(v) => set('semester', v.replace(/\D/g, '').slice(0, 2))} placeholder="5" />
                      </div>
                    </div>
                  </div>
                )}
                {form.user_type && !isStudent && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant pt-1">
                    Great — we’ll tailor recommendations for your goals. You can add more details on your profile anytime.
                  </p>
                )}
              </div>
            )}

            {/* STEP 4 — Personal information */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <FieldLabel hint="optional">Mobile number</FieldLabel>
                  <TextField icon="call" value={form.mobile_number} inputMode="tel"
                    onChange={(v) => set('mobile_number', v.replace(/[^\d+\-\s]/g, ''))} placeholder="+91 98765 43210" />
                  {/* OTP verification can be enabled once an SMS provider (e.g. Twilio)
                      is configured in Supabase Auth. Number is collected regardless. */}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><FieldLabel>Country</FieldLabel><TextField icon="public" value={form.country} onChange={(v) => set('country', v)} placeholder="India" /></div>
                  <div><FieldLabel>State</FieldLabel><TextField value={form.state} onChange={(v) => set('state', v)} placeholder="Telangana" /></div>
                  <div><FieldLabel>City</FieldLabel><TextField value={form.city} onChange={(v) => set('city', v)} placeholder="Hyderabad" /></div>
                  <div><FieldLabel>Pincode</FieldLabel><TextField value={form.pincode} inputMode="numeric"
                    onChange={(v) => set('pincode', v.replace(/\D/g, '').slice(0, 10))} placeholder="500001" /></div>
                </div>
                <div>
                  <FieldLabel>Preferred language</FieldLabel>
                  <select value={form.language_preference} onChange={(e) => set('language_preference', e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant text-on-surface rounded-full py-md px-5 font-body-md text-body-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* STEP 5 — Bio */}
            {step === 4 && (
              <div>
                <FieldLabel>Tell us about yourself</FieldLabel>
                <textarea
                  value={form.bio}
                  maxLength={BIO_LIMIT}
                  onChange={(e) => set('bio', e.target.value)}
                  rows={5}
                  placeholder="Passionate about AI and Full Stack Development. Interested in building impactful software products."
                  className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-2xl p-4 font-body-md text-body-md placeholder:text-outline transition-all resize-none"
                />
                <div className="flex justify-end mt-1.5">
                  <span className={`font-body-sm text-body-sm ${form.bio.length >= BIO_LIMIT ? 'text-amber-500' : 'text-on-surface-variant'}`}>
                    {form.bio.length} / {BIO_LIMIT}
                  </span>
                </div>
              </div>
            )}

            {/* STEP 6 — Career goals */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <FieldLabel hint="pick all that apply">Dream roles</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {DREAM_ROLES.map((r) => (
                      <Chip key={r} label={r} selected={form.dream_roles.includes(r)} onClick={() => toggle('dream_roles', r)} />
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel hint="optional">Dream companies</FieldLabel>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[...DREAM_COMPANIES, ...form.dream_companies.filter((c) => !DREAM_COMPANIES.includes(c))].map((c) => (
                      <Chip key={c} label={c} selected={form.dream_companies.includes(c)} onClick={() => toggle('dream_companies', c)} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCompany(); } }}
                      placeholder="Add another company…"
                      className="flex-1 bg-surface-container border border-outline-variant text-on-surface rounded-full py-2.5 px-5 font-body-sm text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button type="button" onClick={addCustomCompany}
                      className="px-4 rounded-full bg-primary/20 text-primary border border-primary/40 font-label-md text-label-md hover:bg-primary/30 transition">Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7 — Skills & interests */}
            {step === 6 && (
              <div className="space-y-5">
                {SKILL_CATEGORIES.map((cat) => (
                  <div key={cat.category}>
                    <p className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant mb-2">
                      <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>{cat.category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cat.skills.map((s) => (
                        <Chip key={s} label={s} selected={form.interests.includes(s)} onClick={() => toggle('interests', s)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 8 — Learning goal */}
            {step === 7 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {LEARNING_GOALS.map((g) => (
                  <OptionCard key={g.value} label={g.label} icon={g.icon}
                    selected={form.learning_goal === g.value} onClick={() => set('learning_goal', g.value)} />
                ))}
              </div>
            )}

            {/* STEP 9 — Daily learning goal */}
            {step === 8 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DAILY_TIME_SLOTS.map((t) => (
                  <button key={t.value} type="button" onClick={() => set('daily_learning_time', t.value)}
                    className={`flex flex-col items-center gap-2 py-6 rounded-2xl border transition-all ${
                      form.daily_learning_time === t.value
                        ? 'bg-primary/15 border-primary/60 shadow-[0_0_12px_rgba(0,74,198,0.18)]'
                        : 'bg-surface-container border-outline-variant/50 hover:border-outline-variant'
                    }`}>
                    <span className={`material-symbols-outlined text-[28px] ${form.daily_learning_time === t.value ? 'text-primary' : 'text-on-surface-variant'}`}>{t.icon}</span>
                    <span className={`font-label-lg text-label-lg ${form.daily_learning_time === t.value ? 'text-primary' : 'text-on-surface'}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* STEP 10 — Finish / summary */}
            {step === 9 && (
              <div>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">🎉</div>
                  <p className="font-headline-sm text-headline-sm text-on-surface">Your personalized learning profile is ready.</p>
                </div>
                <div className="space-y-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 p-5">
                  <SummaryRow icon="person" label="Name" value={form.full_name} />
                  <SummaryRow icon="alternate_email" label="Username" value={form.username ? `@${form.username}` : '—'} />
                  <SummaryRow icon="school" label="I am a" value={PERSONAS.find((p) => p.value === form.user_type)?.label || '—'} />
                  {isStudent && <SummaryRow icon="account_balance" label="College" value={form.college_name || '—'} />}
                  <SummaryRow icon="rocket_launch" label="Dream roles" value={form.dream_roles.join(', ') || '—'} />
                  <SummaryRow icon="apartment" label="Dream companies" value={form.dream_companies.join(', ') || '—'} />
                  <SummaryRow icon="code" label="Skills" value={form.interests.join(', ') || '—'} />
                  <SummaryRow icon="flag" label="Goal" value={LEARNING_GOALS.find((g) => g.value === form.learning_goal)?.label || '—'} />
                  <SummaryRow icon="schedule" label="Daily time" value={DAILY_TIME_SLOTS.find((t) => t.value === form.daily_learning_time)?.label || '—'} />
                </div>
              </div>
            )}
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
            {step < TOTAL_STEPS - 1 ? (
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

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">{icon}</span>
      <span className="font-label-md text-label-md text-on-surface-variant w-32 shrink-0">{label}</span>
      <span className="font-body-md text-body-md text-on-surface flex-1 break-words">{value}</span>
    </div>
  );
}

interface StepMeta { title: string; subtitle?: string }
const STEPS: StepMeta[] = [
  { title: 'Welcome to LearnLoom 🎓', subtitle: "Let's personalize your learning experience in less than 2 minutes." },
  { title: 'Set up your profile', subtitle: 'This is how other learners will see you.' },
  { title: 'Tell us what you do', subtitle: 'We use this to recommend the right content.' },
  { title: 'A few personal details', subtitle: 'All optional — it helps with local opportunities.' },
  { title: 'Write a short bio', subtitle: 'A line or two about your interests and goals.' },
  { title: 'Your career goals', subtitle: 'Where do you want this journey to take you?' },
  { title: 'Skills & interests', subtitle: 'Pick what you know or want to learn.' },
  { title: 'Your main learning goal', subtitle: 'What matters most to you right now?' },
  { title: 'Daily learning goal', subtitle: 'How much time can you invest each day?' },
  { title: 'All set!', subtitle: 'Review your profile and jump in.' },
];
