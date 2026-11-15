import type { LoginInput, RegisterInput } from '@buzzprep/shared';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import type { MeResponse, MetaResponse } from '@/api/types';

/** What signing in or registering returns. */
export type AuthResult = Pick<MeResponse, 'user' | 'onboardingCompleted'>;

/** Public server settings (registration mode, first-run setup…); no sign-in needed. */
export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: () => api<MetaResponse>('/meta'),
    staleTime: 5 * 60_000,
  });
}

/** The signed-in user, or `null` when signed out. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api<MeResponse>('/v1/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function login(body: LoginInput) {
  return api<AuthResult>('/v1/auth/login', { method: 'POST', body });
}

export function register(body: RegisterInput) {
  return api<AuthResult>('/v1/auth/register', { method: 'POST', body });
}

export function logout() {
  return api('/v1/auth/logout', { method: 'POST' });
}
