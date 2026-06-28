import { createContext, useContext } from 'react';
import type { OnboardingContextValue } from './types';

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider = OnboardingContext.Provider;

/** Access the shared onboarding state from any step component. */
export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
