import { useOnboarding } from '../OnboardingContext';
import { OptionCard } from '../OnboardingUI';
import { LEARNING_GOALS } from '@/data/onboardingOptions';

export default function LearningGoalStep() {
  const { form, set } = useOnboarding();
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {LEARNING_GOALS.map((g) => (
        <OptionCard key={g.value} label={g.label} icon={g.icon}
          selected={form.learning_goal === g.value} onClick={() => set('learning_goal', g.value)} />
      ))}
    </div>
  );
}
