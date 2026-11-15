import type { LocalDate } from '@buzzprep/shared';
import { del, get, set, update } from 'idb-keyval';
import { useEffect, useState } from 'react';
import { ApiError, errorMessage, uploadBlob } from '@/api/client';
import { invalidateJournal } from '@/api/query-client';

/**
 * Voice clips waiting to reach the server. A finished recording is written to IndexedDB first
 * and uploaded from there, so nothing is lost when the connection drops or the app is closed;
 * uploads resume when the journal opens again or the device comes back online.
 */

export interface PendingClip {
  id: string;
  date: LocalDate;
  mimeType: string;
  durationSeconds: number;
  bytes: number;
  createdAt: number;
  status: 'waiting' | 'uploading' | 'failed';
  error: string | null;
}

const INDEX = 'journal-clip-queue';
const blobKey = (id: string) => `journal-clip:${id}`;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export async function listPendingClips(): Promise<PendingClip[]> {
  return (await get<PendingClip[]>(INDEX)) ?? [];
}

async function edit(fn: (list: PendingClip[]) => PendingClip[]) {
  await update<PendingClip[]>(INDEX, (old) => fn(old ?? []));
  emit();
}

const newId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export async function enqueueClip(date: LocalDate, blob: Blob, durationSeconds: number) {
  const id = newId();
  await set(blobKey(id), blob);
  await edit((list) => [
    ...list,
    {
      id,
      date,
      mimeType: blob.type || 'audio/webm',
      durationSeconds: Math.round(durationSeconds),
      bytes: blob.size,
      createdAt: Date.now(),
      status: 'waiting',
      error: null,
    },
  ]);
  void flushClips();
}

export async function discardClip(id: string) {
  await del(blobKey(id));
  await edit((list) => list.filter((c) => c.id !== id));
}

export async function retryClip(id: string) {
  await edit((list) =>
    list.map((c) => (c.id === id ? { ...c, status: 'waiting', error: null } : c)),
  );
  void flushClips();
}

const temporary = (err: unknown) =>
  !(err instanceof ApiError) ||
  err.status === 0 ||
  err.status === 408 ||
  err.status === 429 ||
  err.status >= 500;

let flushing: Promise<void> | null = null;

/** Upload waiting clips in order. Stops at the first temporary failure (try again later). */
export function flushClips(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      for (const clip of await listPendingClips()) {
        if (clip.status === 'failed') continue;
        if (!navigator.onLine) break;
        const blob = await get<Blob>(blobKey(clip.id));
        if (!blob) {
          await edit((list) => list.filter((c) => c.id !== clip.id));
          continue;
        }
        await edit((list) =>
          list.map((c) => (c.id === clip.id ? { ...c, status: 'uploading' } : c)),
        );
        try {
          await uploadBlob(`/v1/journal/entries/evening/${clip.date}/clips`, blob, {
            duration: clip.durationSeconds,
          });
          await del(blobKey(clip.id));
          await edit((list) => list.filter((c) => c.id !== clip.id));
          await invalidateJournal();
        } catch (err) {
          const retryLater = temporary(err);
          await edit((list) =>
            list.map((c) =>
              c.id === clip.id
                ? {
                    ...c,
                    status: retryLater ? 'waiting' : 'failed',
                    error: retryLater ? null : errorMessage(err),
                  }
                : c,
            ),
          );
          if (retryLater) break;
        }
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** Waiting clips (optionally for one night), kept up to date; uploads start on mount. */
export function usePendingClips(date?: LocalDate): PendingClip[] {
  const [list, setList] = useState<PendingClip[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => void listPendingClips().then((l) => alive && setList(l));
    const online = () => void flushClips();
    listeners.add(load);
    window.addEventListener('online', online);
    load();
    void flushClips();
    return () => {
      alive = false;
      listeners.delete(load);
      window.removeEventListener('online', online);
    };
  }, []);
  return date ? list.filter((c) => c.date === date) : list;
}
