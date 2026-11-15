import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@buzzprep/shared';
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
    // One quick retry when the server is down or unreachable, so a visitor isn't kept waiting.
    retry: (count, err) =>
      !(err instanceof ApiError && err.status > 0 && err.status < 500) && count < 1,
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

/** Ask for a reset link. The server answers the same whether or not the address has an account. */
export function forgotPassword(body: ForgotPasswordInput) {
  return api('/v1/auth/password/forgot', { method: 'POST', body });
}

/** Set a new password with a reset link's token; signs in on this device. */
export function resetPassword(body: ResetPasswordInput) {
  return api<AuthResult>('/v1/auth/password', { method: 'PATCH', body });
}
