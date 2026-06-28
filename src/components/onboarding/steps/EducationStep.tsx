import { useOnboarding } from '../OnboardingContext';
import { FieldLabel, TextField, OptionCard } from '../OnboardingUI';
import { PERSONAS, DEGREES } from '@/data/onboardingOptions';

export default function EducationStep() {
  const { form, set, isStudent } = useOnboarding();

  return (
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
  );
}
