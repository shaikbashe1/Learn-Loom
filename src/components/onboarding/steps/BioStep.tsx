import { useOnboarding } from '../OnboardingContext';
import { FieldLabel } from '../OnboardingUI';
import { BIO_LIMIT } from '../validation';

export default function BioStep() {
  const { form, set } = useOnboarding();
  return (
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
  );
}
