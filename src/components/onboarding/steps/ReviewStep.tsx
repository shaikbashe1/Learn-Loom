import { useOnboarding } from '../OnboardingContext';
import { PERSONAS, LEARNING_GOALS, DAILY_TIME_SLOTS } from '@/data/onboardingOptions';
import { 
  User, 
  AtSign, 
  GraduationCap, 
  Building2, 
  Rocket, 
  Building, 
  Code, 
  Flag, 
  Clock 
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  person: User,
  alternate_email: AtSign,
  school: GraduationCap,
  account_balance: Building2,
  rocket_launch: Rocket,
  apartment: Building,
  code: Code,
  flag: Flag,
  schedule: Clock,
};

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const IconComponent = iconMap[icon] || User;
  return (
    <div className="flex items-start gap-3 py-1">
      <IconComponent className="h-4 w-4 text-primary shrink-0 mt-1" />
      <span className="text-xs font-bold text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground flex-1 break-words">{value}</span>
    </div>
  );
}

export default function ReviewStep() {
  const { form, isStudent } = useOnboarding();
  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-sm font-bold text-foreground">Your personalized learning profile is ready.</p>
      </div>
      <div className="space-y-2 rounded-2xl bg-muted/30 border border-border p-5">
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
