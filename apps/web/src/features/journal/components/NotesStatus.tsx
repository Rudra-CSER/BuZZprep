import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { requestNotes } from '../api';
import type { JournalEntry } from '../types';

/** What is happening to a night's notes, in one line, with the action that fits. */
export function NotesStatus({
  entry,
  aiNotes,
  className,
}: {
  entry: JournalEntry;
  /** The server can write notes and the user allows it. */
  aiNotes: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const transcribing = entry.clips.some(
    (c) => c.status === 'uploaded' || c.status === 'transcribing',
  );
  const hasLog = Boolean(entry.body?.trim()) || entry.clips.some((c) => c.transcript?.trim());
  const ask = async () => {
    setBusy(true);
    try {
      await requestNotes(entry.date);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  let text: string | null = null;
  let action: { label: string; run: () => void } | null = null;
  let tone: 'quiet' | 'busy' | 'error' = 'quiet';
  if (transcribing) {
    text = 'Transcribing your recording…';
    tone = 'busy';
  } else if (entry.notesStatus === 'queued' || entry.notesStatus === 'running') {
    text = 'Writing your notes…';
    tone = 'busy';
  } else if (entry.notesStatus === 'failed') {
    text = entry.notesError ?? 'The notes couldn’t be written.';
    tone = 'error';
    if (aiNotes && hasLog) action = { label: 'Try again', run: () => void ask() };
  } else if (!entry.notes && hasLog) {
    if (aiNotes) {
      text = entry.completedAt ? 'No notes yet.' : 'Notes are written when you finish the night.';
      action = { label: 'Write notes now', run: () => void ask() };
    } else {
      text = 'AI notes are off, so your log below is the record of this night.';
    }
  }
  if (!text) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] border px-4 py-3 text-[14px]',
        tone === 'error' && 'border-destructive/40 text-destructive',
        tone !== 'error' && 'text-muted-foreground',
        className,
      )}
      role="status"
    >
      {tone === 'busy' ? (
        <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-primary" />
      ) : null}
      <span className="min-w-0 flex-1">{text}</span>
      {action ? (
        <Button size="sm" variant="secondary" onClick={action.run} disabled={busy}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
