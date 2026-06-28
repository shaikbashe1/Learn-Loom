import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/types';

interface Section {
  key: string;
  label: string;
  weight: number;
  done: (p: Profile) => boolean;
  fixLabel: string;
}

// Weights mirror the spec's profile-completion score.
const SECTIONS: Section[] = [
  { key: 'basic', label: 'Basic info', weight: 20, fixLabel: 'Add your name & username',
    done: (p) => !!p.full_name && !!p.username },
  { key: 'education', label: 'Education / role', weight: 20, fixLabel: 'Tell us what you do',
    done: (p) => !!p.user_type && (p.user_type !== 'student' || !!p.college_name) },
  { key: 'skills', label: 'Skills', weight: 20, fixLabel: 'Pick your skills',
    done: (p) => (p.interests?.length ?? 0) > 0 },
  { key: 'career', label: 'Career goals', weight: 15, fixLabel: 'Choose dream roles',
    done: (p) => (p.dream_roles?.length ?? 0) > 0 },
  { key: 'bio', label: 'Bio', weight: 10, fixLabel: 'Write a short bio',
    done: (p) => !!p.bio && p.bio.trim().length > 0 },
  { key: 'photo', label: 'Profile photo', weight: 10, fixLabel: 'Upload a photo',
    done: (p) => !!p.avatar_url },
  { key: 'mobile', label: 'Mobile verification', weight: 5, fixLabel: 'Verify your mobile',
    done: (p) => !!p.mobile_verified },
];

export function ProfileStrength({ className = '' }: { className?: string }) {
  const { profile } = useAuth();

  const { score, missing } = useMemo(() => {
    if (!profile) return { score: 0, missing: [] as Section[] };
    let total = 0;
    const gaps: Section[] = [];
    for (const s of SECTIONS) {
      if (s.done(profile)) total += s.weight;
      else gaps.push(s);
    }
    return { score: total, missing: gaps };
  }, [profile]);

  if (!profile) return null;

  const tone =
    score >= 85 ? 'text-green-500' : score >= 50 ? 'text-primary' : 'text-amber-500';

  return (
    <div className={`glass-panel rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-label-lg text-label-lg text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">verified_user</span>
          Profile Strength
        </h3>
        <span className={`font-headline-sm text-headline-sm ${tone}`}>{score}%</span>
      </div>

      <div className="h-2.5 w-full rounded-full bg-surface-container-high overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--chart-4))] transition-all duration-700 ease-out"
          style={{ width: `${score}%` }}
        />
      </div>

      {missing.length > 0 ? (
        <>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
            Complete your profile to improve recommendations & recruiter matches:
          </p>
          <ul className="space-y-1.5 mb-3">
            {missing.slice(0, 3).map((s) => (
              <li key={s.key} className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">radio_button_unchecked</span>
                {s.fixLabel}
                <span className="ml-auto text-on-surface-variant">+{s.weight}%</span>
              </li>
            ))}
          </ul>
          <Link to="/onboarding"
            className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline">
            Finish your profile
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </>
      ) : (
        <p className="flex items-center gap-2 font-body-sm text-body-sm text-green-500">
          <span className="material-symbols-outlined text-[18px]">task_alt</span>
          Your profile is complete. Nice work!
        </p>
      )}
    </div>
  );
}
