import type {
  ActivityCreateInput,
  ActivityUpdateInput,
  LocalDate,
  ScheduleMode,
  SlotSuggestion,
} from '@buzzprep/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { invalidateSchedule, queryClient, type OccurrenceUpdateVars } from '@/api/query-client';
import type {
  Activity,
  AgendaResponse,
  DashboardResponse,
  Occurrence,
  ScheduleTemplate,
} from '@/api/types';

// ── Agenda and occurrences ───────────────────────────────────────────────────

export function useAgenda(from: LocalDate, to: LocalDate) {
  return useQuery({
    queryKey: ['agenda', from, to],
    queryFn: () => api<AgendaResponse>('/v1/agenda', { query: { from, to } }),
  });
}

export function useReview() {
  return useQuery({
    queryKey: ['review'],
    queryFn: () => api<{ today: LocalDate; occurrences: Occurrence[] }>('/v1/occurrences/review'),
  });
}

export function useOccurrence(activityId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['occurrence', activityId, date],
    queryFn: () =>
      api<{ occurrence: Occurrence; activity: Activity; today: LocalDate }>(
        `/v1/occurrences/${activityId}/${date}`,
      ),
    enabled: !!activityId && !!date,
  });
}

export function useSuggestions(
  activityId: string | undefined,
  date: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['suggestions', activityId, date],
    queryFn: () =>
      api<{ suggestions: SlotSuggestion[] }>(`/v1/occurrences/${activityId}/${date}/suggestions`),
    enabled: enabled && !!activityId && !!date,
    staleTime: 10_000,
    networkMode: 'online',
  });
}

/** Complete / skip / annotate an occurrence. Optimistic, and queued while offline. */
export function useUpdateOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    // Same key as the defaults in query-client.ts, so a queued update can resume after a restart.
    mutationKey: ['occurrence', 'update'],
    mutationFn: ({ activityId, date, body }: OccurrenceUpdateVars) =>
      api<{ occurrence: Occurrence }>(`/v1/occurrences/${activityId}/${date}`, {
        method: 'PATCH',
        body,
      }),
    onMutate: async ({ activityId, date, body }) => {
      await qc.cancelQueries({ queryKey: ['agenda'] });
      const patch = (o: Occurrence) =>
        o.activityId === activityId && o.date === date
          ? { ...o, ...body, status: body.status ?? o.status }
          : o;
      qc.setQueriesData<AgendaResponse>({ queryKey: ['agenda'] }, (old) =>
        old ? { ...old, occurrences: old.occurrences.map(patch) } : old,
      );
      qc.setQueryData<DashboardResponse>(['dashboard'], (old) =>
        old
          ? {
              ...old,
              todayAgenda: {
                ...old.todayAgenda,
                occurrences: old.todayAgenda.occurrences.map(patch),
              },
            }
          : old,
      );
    },
    onSettled: () => invalidateSchedule(),
  });
}

export function useReschedule() {
  return useMutation({
    mutationFn: (v: {
      activityId: string;
      date: string;
      target: { date: string; startTime: string; durationMinutes?: number };
    }) =>
      api<{ occurrence: Occurrence | null; conflicts: Occurrence[] }>(
        `/v1/occurrences/${v.activityId}/${v.date}/reschedule`,
        { method: 'POST', body: v.target },
      ),
    onSettled: () => invalidateSchedule(),
  });
}

export function usePostpone() {
  return useMutation({
    mutationFn: (v: { activityId: string; date: string; minutes: number }) =>
      api<{ occurrence: Occurrence | null; conflicts: Occurrence[] }>(
        `/v1/occurrences/${v.activityId}/${v.date}/postpone`,
        {
          method: 'POST',
          body: { minutes: v.minutes },
        },
      ),
    onSettled: () => invalidateSchedule(),
  });
}

export function useClearOverride() {
  return useMutation({
    mutationFn: (v: { activityId: string; date: string }) =>
      api(`/v1/occurrences/${v.activityId}/${v.date}/override`, { method: 'DELETE' }),
    onSettled: () => invalidateSchedule(),
  });
}

export function useSetDayMode() {
  return useMutation({
    mutationFn: (v: { date: LocalDate; mode: ScheduleMode; until?: LocalDate }) =>
      api(`/v1/day-modes/${v.date}`, { method: 'PUT', body: { mode: v.mode, until: v.until } }),
    onSettled: () => invalidateSchedule(),
  });
}

// ── Routine: schedules and their activities ──────────────────────────────────

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: () => api<{ schedules: ScheduleTemplate[] }>('/v1/schedules'),
  });
}

export function useActivities(scheduleId?: string) {
  return useQuery({
    queryKey: ['activities', scheduleId ?? 'active'],
    queryFn: () => api<{ activities: Activity[] }>('/v1/activities', { query: { scheduleId } }),
  });
}

/** Refetches everything that depends on the routine: activities, schedules and the agenda. */
export function invalidateRoutine() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['activities'] }),
    queryClient.invalidateQueries({ queryKey: ['schedules'] }),
    invalidateSchedule(),
  ]);
}

export function activateSchedule(scheduleId: string) {
  return api(`/v1/schedules/${scheduleId}/activate`, { method: 'POST' });
}

export function duplicateSchedule(scheduleId: string) {
  return api(`/v1/schedules/${scheduleId}/duplicate`, { method: 'POST' });
}

export function deleteSchedule(scheduleId: string) {
  return api(`/v1/schedules/${scheduleId}`, { method: 'DELETE' });
}

/** Builds a fresh schedule from the saved setup answers; the current one is kept, inactive. */
export function resetSchedule() {
  return api('/v1/schedules/reset', { method: 'POST' });
}

export function createActivity(body: ActivityCreateInput) {
  return api('/v1/activities', { method: 'POST', body });
}

export function updateActivity(activityId: string, body: ActivityUpdateInput) {
  return api(`/v1/activities/${activityId}`, { method: 'PATCH', body });
}

/** Removes an activity from the routine; its past check-ins are kept. */
export function archiveActivity(activityId: string) {
  return api(`/v1/activities/${activityId}`, { method: 'DELETE' });
}
