import type { FC } from 'react';
import type { UsernameStatus } from '@/hooks/useUsernameAvailability';

/**
 * The full editable shape of the onboarding form. Mirrors the `profiles`
 * columns added in migration 20260628120000. Adding a future section (projects,
 * certifications, …) means adding a field here + a step component + a registry
 * entry — no other wiring required.
 */
export interface OnboardingForm {
  full_name: string;
  username: string;
  avatar_url: string;
  user_type: string;
  college_name: string;
  course: string;
  degree: string;
  branch: string;
  year: string;
  semester: string;
  graduation_year: string;
  mobile_number: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  language_preference: string;
  bio: string;
  dream_roles: string[];
  dream_companies: string[];
  interests: string[];
  learning_goal: string;
  daily_learning_time: string;
}

export const EMPTY_FORM: OnboardingForm = {
  full_name: '', username: '', avatar_url: '', user_type: '',
  college_name: '', course: '', degree: '', branch: '',
  year: '', semester: '', graduation_year: '',
  mobile_number: '', country: '', state: '', city: '', pincode: '',
  language_preference: 'English', bio: '',
  dream_roles: [], dream_companies: [], interests: [],
  learning_goal: '', daily_learning_time: '',
};

export type ArrayField = 'dream_roles' | 'dream_companies' | 'interests';

/** Everything a step component receives from the wizard shell. */
export interface OnboardingContextValue {
  form: OnboardingForm;
  /** The signed-in user's email (read-only, from Google). */
  email: string;
  set: <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) => void;
  toggle: (key: ArrayField, value: string) => void;
  username: { status: UsernameStatus; isValidFormat: boolean };
  isStudent: boolean;
  uploading: boolean;
  onAvatarFile: (file: File | undefined) => void;
}

/**
 * A self-contained wizard step. The registry (steps/index.ts) is the single
 * source of truth for order, copy, validation and rendering.
 */
export interface StepDef {
  id: string;
  title: string;
  subtitle?: string;
  Component: FC;
  /** Gate the "Continue" button. Pure function of the current context. */
  isValid: (ctx: OnboardingContextValue) => boolean;
}
