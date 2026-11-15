import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { clearLocalData } from '@/api/query-client';
import type { MeResponse } from '@/api/types';
import { browserTimeZone } from '@/lib/format';

/** After signing in or registering: drop the previous account's cache, then route onward. */
export function useAfterAuth() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  return async (res: { user: MeResponse['user']; onboardingCompleted: boolean }) => {
    // A different account may have used this device: never show its cached data.
    await clearLocalData();
    qc.setQueryData<MeResponse>(['me'], {
      user: res.user,
      onboardingCompleted: res.onboardingCompleted,
      timezone: browserTimeZone(),
      theme: 'system',
    });
    void qc.invalidateQueries({ queryKey: ['me'] });
    const from = (location.state as { from?: string } | null)?.from;
    navigate(res.onboardingCompleted ? (from ?? '/') : '/onboarding', { replace: true });
  };
}
