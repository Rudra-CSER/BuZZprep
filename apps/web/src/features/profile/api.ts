import type { ChangePasswordInput, ImportMode } from '@buzzprep/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, download } from '@/api/client';
import type { Milestone, Plan, Profile } from '@/api/types';

// ── Profile (time zone, routine, notification preferences…) ─────────────────

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api<{ profile: Profile }>('/v1/profile'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Profile>) =>
      api<{ profile: Profile }>('/v1/profile', { method: 'PATCH', body: patch }),
    onSuccess: (data) => {
      qc.setQueryData(['profile'], data);
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['agenda'] });
      void qc.invalidateQueries({ queryKey: ['notifications-upcoming'] });
    },
  });
}

// ── Preparation plan and milestones ──────────────────────────────────────────

export function useActivePlan() {
  return useQuery({
    queryKey: ['plan'],
    queryFn: () => api<{ plan: Plan | null }>('/v1/plans/active'),
  });
}

export function updatePlan(planId: string, patch: Partial<Plan>) {
  return api(`/v1/plans/${planId}`, { method: 'PATCH', body: patch });
}

export function addMilestone(planId: string, body: Pick<Milestone, 'title' | 'dueDate'>) {
  return api(`/v1/plans/${planId}/milestones`, { method: 'POST', body });
}

export function updateMilestone(
  planId: string,
  milestoneId: string,
  patch: Partial<Pick<Milestone, 'title' | 'dueDate' | 'completed' | 'note'>>,
) {
  return api(`/v1/plans/${planId}/milestones/${milestoneId}`, { method: 'PATCH', body: patch });
}

export function deleteMilestone(planId: string, milestoneId: string) {
  return api(`/v1/plans/${planId}/milestones/${milestoneId}`, { method: 'DELETE' });
}

// ── Account and data ─────────────────────────────────────────────────────────

/** Changes the password and signs out every other device. */
export function changePassword(body: ChangePasswordInput) {
  return api('/v1/account/password', { method: 'POST', body });
}

/** Permanently deletes the account and all its data. `confirm` must be "DELETE". */
export function deleteAccount(body: { password: string; confirm: string }) {
  return api('/v1/account', { method: 'DELETE', body });
}

/** Imports a configuration bundle; `replace` makes its schedule and plan the active ones. */
export function importConfig(bundle: unknown, mode: ImportMode) {
  return api<{ summary: Record<string, number | boolean> }>('/v1/config/import', {
    method: 'POST',
    body: { bundle, mode },
  });
}

/** Downloads the portable configuration: settings, plan, schedule, reminders (no journals or history). */
export function exportConfig() {
  return download('/v1/config/export', 'buzzprep-config.json');
}

/** Downloads everything stored for the account. */
export function exportAccountData() {
  return download('/v1/account/export', 'buzzprep-export.json');
}
