import { useOnboarding } from '../OnboardingContext';
import { DAILY_TIME_SLOTS } from '@/data/onboardingOptions';

export default function DailyTimeStep() {
  const { form, set } = useOnboarding();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {DAILY_TIME_SLOTS.map((t) => {
        const selected = form.daily_learning_time === t.value;
        return (
          <button key={t.value} type="button" onClick={() => set('daily_learning_time', t.value)}
            className={`flex flex-col items-center gap-2 py-6 rounded-2xl border transition-all ${
              selected
                ? 'bg-primary/15 border-primary/60 shadow-[0_0_12px_rgba(0,74,198,0.18)]'
                : 'bg-surface-container border-outline-variant/50 hover:border-outline-variant'
            }`}>
            <span className={`material-symbols-outlined text-[28px] ${selected ? 'text-primary' : 'text-on-surface-variant'}`}>{t.icon}</span>
            <span className={`font-label-lg text-label-lg ${selected ? 'text-primary' : 'text-on-surface'}`}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
