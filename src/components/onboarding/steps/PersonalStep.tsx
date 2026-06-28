import { useOnboarding } from '../OnboardingContext';
import { FieldLabel, TextField } from '../OnboardingUI';
import { isValidMobile, isPincodeValid } from '../validation';
import { LANGUAGES } from '@/data/onboardingOptions';

export default function PersonalStep() {
  const { form, set } = useOnboarding();
  const mobileError = !isValidMobile(form.mobile_number);
  const pincodeError = !isPincodeValid(form.pincode);

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel hint="optional">Mobile number</FieldLabel>
        <TextField icon="call" value={form.mobile_number} inputMode="tel"
          onChange={(v) => set('mobile_number', v.replace(/[^\d+\-\s]/g, ''))} placeholder="+91 98765 43210" />
        <p className="mt-1 font-body-sm text-body-sm h-5">
          {mobileError
            ? <span className="text-red-500">Enter a valid number (8–15 digits, optional +country code).</span>
            : <span className="text-on-surface-variant">We’ll add OTP verification soon — no SMS sent for now.</span>}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><FieldLabel>Country</FieldLabel><TextField icon="public" value={form.country} onChange={(v) => set('country', v)} placeholder="India" /></div>
        <div><FieldLabel>State</FieldLabel><TextField value={form.state} onChange={(v) => set('state', v)} placeholder="Telangana" /></div>
        <div><FieldLabel>City</FieldLabel><TextField value={form.city} onChange={(v) => set('city', v)} placeholder="Hyderabad" /></div>
        <div>
          <FieldLabel>Pincode</FieldLabel>
          <TextField value={form.pincode} inputMode="numeric"
            onChange={(v) => set('pincode', v.replace(/\D/g, '').slice(0, 10))} placeholder="500001" />
          {pincodeError && <p className="mt-1 font-body-sm text-body-sm text-red-500">Enter a valid pincode.</p>}
        </div>
      </div>
      <div>
        <FieldLabel>Preferred language</FieldLabel>
        <select value={form.language_preference} onChange={(e) => set('language_preference', e.target.value)}
          className="w-full bg-surface-container border border-outline-variant text-on-surface rounded-full py-md px-5 font-body-md text-body-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
    </div>
  );
}
