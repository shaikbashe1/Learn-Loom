import { useOnboarding } from '../OnboardingContext';
import { FieldLabel, TextField } from '../OnboardingUI';

export default function ProfileStep() {
  const { form, set, email, username, uploading, onAvatarFile } = useOnboarding();

  return (
    <div className="space-y-6">
      {/* Avatar (prefilled from Google, changeable) */}
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

      {email && (
        <div>
          <FieldLabel hint="from Google">Email</FieldLabel>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">mail</span>
            <input value={email} readOnly disabled
              className="w-full bg-surface-container/60 border border-outline-variant text-on-surface-variant rounded-full py-md pl-[3rem] pr-5 font-body-md text-body-md cursor-not-allowed" />
          </div>
        </div>
      )}

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
  );
}
