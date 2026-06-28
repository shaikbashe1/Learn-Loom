import { useOnboarding } from '../OnboardingContext';
import { Chip } from '../OnboardingUI';
import { SKILL_CATEGORIES } from '@/data/onboardingOptions';

export default function SkillsStep() {
  const { form, toggle } = useOnboarding();
  return (
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
  );
}
