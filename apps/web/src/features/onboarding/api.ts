import type { OnboardingAnswersInput } from '@buzzprep/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

/** Answers saved by an earlier run of setup, so re-running it starts from them. */
export function useSavedAnswers() {
  return useQuery({
    queryKey: ['onboarding-answers'],
    queryFn: () => api<{ answers: OnboardingAnswersInput | null }>('/v1/onboarding/answers'),
    staleTime: Infinity,
  });
}

/** Saves the answers and generates the plan, schedule and reminders from them. */
export function completeOnboarding(answers: OnboardingAnswersInput) {
  return api('/v1/onboarding/complete', { method: 'POST', body: { answers } });
}
