import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { del, get, set } from 'idb-keyval';
import type { JournalEntryInput, JournalType } from '@buzzprep/shared';
import { api, ApiError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 7 * 24 * 3_600_000,
      // Show cached data offline instead of failing; refetch when the app comes back.
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: true,
      retry: (count, err) => {
        if (err instanceof ApiError && err.status > 0 && err.status < 500) return false;
        return count < 2;
      },
    },
    mutations: { networkMode: 'online' },
  },
});

/** Cache persisted to IndexedDB so the dashboard and schedule open instantly and offline. */
export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: 'buzzprep-cache',
  throttleTime: 1500,
});

export const PERSIST_MAX_AGE = 7 * 24 * 3_600_000;
export const CACHE_BUSTER = 'v1';

export interface OccurrenceUpdateVars {
  activityId: string;
  date: string;
  body: {
    status?: 'pending' | 'completed' | 'skipped';
    note?: string | null;
    actualMinutes?: number | null;
  };
}

// Defaults let paused (offline) occurrence updates survive an app restart and resume later.
queryClient.setMutationDefaults(['occurrence', 'update'], {
  mutationFn: ({ activityId, date, body }: OccurrenceUpdateVars) =>
    api(`/v1/occurrences/${activityId}/${date}`, { method: 'PATCH', body }),
  onSettled: () => invalidateSchedule(),
});

export interface JournalSaveVars {
  type: JournalType;
  date: string;
  body: JournalEntryInput;
}

// Journal saves made offline wait and are sent when the app is back online (even after a restart).
queryClient.setMutationDefaults(['journal', 'save'], {
  mutationFn: ({ type, date, body }: JournalSaveVars) =>
    api(`/v1/journal/entries/${type}/${date}`, { method: 'PUT', body }),
  onSettled: () => invalidateJournal(),
});

export function invalidateJournal() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['journal'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}

export function invalidateSchedule() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['agenda'] }),
    queryClient.invalidateQueries({ queryKey: ['review'] }),
    queryClient.invalidateQueries({ queryKey: ['occurrence'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications-upcoming'] }),
  ]);
}

export async function clearLocalData() {
  queryClient.clear();
  await persister.removeClient();
}
