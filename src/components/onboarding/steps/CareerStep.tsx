import { useState } from 'react';
import { useOnboarding } from '../OnboardingContext';
import { FieldLabel, Chip } from '../OnboardingUI';
import { DREAM_ROLES, DREAM_COMPANIES } from '@/data/onboardingOptions';

export default function CareerStep() {
  const { form, set, toggle } = useOnboarding();
  const [customCompany, setCustomCompany] = useState('');

  const addCustomCompany = () => {
    const v = customCompany.trim();
    if (!v) return;
    if (!form.dream_companies.includes(v)) set('dream_companies', [...form.dream_companies, v]);
    setCustomCompany('');
  };

  return (
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
  );
}
