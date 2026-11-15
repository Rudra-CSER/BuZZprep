import type {
  JournalEntryInput,
  JournalPrefsPatch,
  JournalType,
  LocalDate,
} from '@buzzprep/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, download } from '@/api/client';
import { invalidateJournal, type JournalSaveVars } from '@/api/query-client';
import type {
  JournalEntry,
  JournalEntrySummary,
  JournalSettingsResponse,
  SearchResult,
  TonightResponse,
  WeekResponse,
} from './types';

/** The private journal: tonight's session, entries, weeks and settings. */

const POLL_MS = 3000;

/** Something is still being transcribed or written, so the entry will change by itself. */
export function isProcessing(entry: JournalEntry | null | undefined): boolean {
  if (!entry) return false;
  return (
    entry.clips.some((c) => c.status === 'uploaded' || c.status === 'transcribing') ||
    entry.notesStatus === 'queued' ||
    entry.notesStatus === 'running'
  );
}

export function useTonight(date?: LocalDate) {
  return useQuery({
    queryKey: ['journal', 'tonight', date ?? 'today'],
    queryFn: () => api<TonightResponse>('/v1/journal/tonight', { query: { date } }),
    refetchInterval: (q) => (isProcessing(q.state.data?.entry) ? POLL_MS : false),
  });
}

export function useJournalEntry(type: JournalType, date: LocalDate | undefined) {
  return useQuery({
    queryKey: ['journal', 'entry', type, date],
    queryFn: () => api<{ entry: JournalEntry | null }>(`/v1/journal/entries/${type}/${date}`),
    enabled: Boolean(date),
    refetchInterval: (q) => (isProcessing(q.state.data?.entry) ? POLL_MS : false),
  });
}

export function useJournalEntries(from: LocalDate | undefined, to: LocalDate | undefined) {
  return useQuery({
    queryKey: ['journal', 'entries', from, to],
    queryFn: () =>
      api<{ entries: JournalEntrySummary[] }>('/v1/journal/entries', { query: { from, to } }),
    enabled: Boolean(from && to),
  });
}

export function useJournalSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ['journal', 'search', term],
    queryFn: () => api<{ results: SearchResult[] }>('/v1/journal/search', { query: { q: term } }),
    enabled: term.length >= 2,
    staleTime: 10_000,
  });
}

export function useJournalWeek(date: LocalDate | undefined) {
  return useQuery({
    queryKey: ['journal', 'week', date],
    queryFn: () => api<WeekResponse>(`/v1/journal/weeks/${date}`),
    enabled: Boolean(date),
    refetchInterval: (q) => {
      const s = q.state.data?.summaryStatus;
      return s === 'queued' || s === 'running' ? POLL_MS : false;
    },
  });
}

export function useJournalSettings() {
  return useQuery({
    queryKey: ['journal', 'settings'],
    queryFn: () => api<JournalSettingsResponse>('/v1/journal/settings'),
  });
}

export function useUpdateJournalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: JournalPrefsPatch) =>
      api<Pick<JournalSettingsResponse, 'prefs'>>('/v1/journal/settings', {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: ({ prefs }) => {
      qc.setQueryData<JournalSettingsResponse>(['journal', 'settings'], (old) =>
        old ? { ...old, prefs } : old,
      );
      void qc.invalidateQueries({ queryKey: ['journal', 'tonight'] });
      void qc.invalidateQueries({ queryKey: ['notifications-upcoming'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Save (part of) an entry. Offline saves wait and are sent later (see query-client). */
export function useSaveEntry() {
  return useMutation<unknown, Error, JournalSaveVars>({ mutationKey: ['journal', 'save'] });
}

export function saveEntry(type: JournalType, date: LocalDate, body: JournalEntryInput) {
  return api<{ entry: JournalEntry }>(`/v1/journal/entries/${type}/${date}`, {
    method: 'PUT',
    body,
  });
}

export async function deleteEntry(type: JournalType, date: LocalDate) {
  await api(`/v1/journal/entries/${type}/${date}`, { method: 'DELETE' });
  await invalidateJournal();
}

export async function deleteClip(date: LocalDate, clipId: string) {
  await api(`/v1/journal/entries/evening/${date}/clips/${clipId}`, { method: 'DELETE' });
  await invalidateJournal();
}

/** Transcribe a failed recording again (its audio is kept until it succeeds). */
export async function retryTranscription(date: LocalDate, clipId: string) {
  await api(`/v1/journal/entries/evening/${date}/clips/${clipId}/retry`, { method: 'POST' });
  await invalidateJournal();
}

export async function requestNotes(date: LocalDate) {
  await api(`/v1/journal/entries/evening/${date}/notes`, { method: 'POST' });
  await invalidateJournal();
}

export async function requestWeeklySummary(date: LocalDate) {
  await api(`/v1/journal/weeks/${date}/summary`, { method: 'POST' });
  await invalidateJournal();
}

export function clipAudioUrl(date: LocalDate, clipId: string) {
  return `/api/v1/journal/entries/evening/${date}/clips/${clipId}/audio`;
}

export function exportJournal() {
  return download('/v1/journal/export?format=markdown', 'buzzprep-journal.md');
}

export function exportWeek(date: LocalDate) {
  return download(`/v1/journal/weeks/${date}/export`, `buzzprep-week-${date}.md`);
}
