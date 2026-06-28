import { useOnboarding } from '../OnboardingContext';
import { PERSONAS, LEARNING_GOALS, DAILY_TIME_SLOTS } from '@/data/onboardingOptions';

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">{icon}</span>
      <span className="font-label-md text-label-md text-on-surface-variant w-32 shrink-0">{label}</span>
      <span className="font-body-md text-body-md text-on-surface flex-1 break-words">{value}</span>
    </div>
  );
}

export default function ReviewStep() {
  const { form, isStudent } = useOnboarding();
  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🎉</div>
        <p className="font-headline-sm text-headline-sm text-on-surface">Your personalized learning profile is ready.</p>
      </div>
      <div className="space-y-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 p-5">
        <SummaryRow icon="person" label="Name" value={form.full_name || '—'} />
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
  );
}
