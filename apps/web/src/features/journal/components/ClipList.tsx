import type { LocalDate } from '@buzzprep/shared';
import { AlertCircle, CloudOff, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clipAudioUrl, deleteClip, retryTranscription } from '../api';
import { discardClip, retryClip, type PendingClip } from '../clip-queue';
import { clipLength } from '../format';
import type { JournalClip } from '../types';

const STATUS: Record<JournalClip['status'], string> = {
  uploaded: 'Waiting to be transcribed…',
  transcribing: 'Transcribing…',
  transcribed: '',
  failed: 'Couldn’t transcribe',
};

/** Recordings of one night: those still on this device, then those on the server. */
export function ClipList({
  date,
  clips,
  pending,
  showTranscripts = true,
  allowAudio = false,
}: {
  date: LocalDate;
  clips: JournalClip[];
  pending: PendingClip[];
  showTranscripts?: boolean;
  allowAudio?: boolean;
}) {
  if (clips.length === 0 && pending.length === 0) return null;
  return (
    <ol className="grid gap-2" aria-label="Recordings">
      {clips.map((c, i) => (
        <ClipRow
          key={c.id}
          date={date}
          clip={c}
          index={i}
          showTranscript={showTranscripts}
          allowAudio={allowAudio}
        />
      ))}
      {pending.map((p, i) => (
        <li key={p.id} className="flex items-start gap-3 rounded-[14px] border px-4 py-3">
          <CloudOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[15px]">
              Recording {clips.length + i + 1}{' '}
              <span className="text-muted-foreground tabular-nums">
                · {clipLength(p.durationSeconds)}
              </span>
            </p>
            <p
              className={cn(
                'text-[13px]',
                p.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {p.status === 'failed'
                ? p.error
                : p.status === 'uploading'
                  ? 'Uploading…'
                  : 'Saved on this device. It uploads when you’re online.'}
            </p>
            {p.status === 'failed' ? (
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => void retryClip(p.id)}>
                  Try again
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void discardClip(p.id)}>
                  Discard
                </Button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ClipRow({
  date,
  clip,
  index,
  showTranscript,
  allowAudio,
}: {
  date: LocalDate;
  clip: JournalClip;
  index: number;
  showTranscript: boolean;
  allowAudio: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await retryTranscription(date, clip.id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRetrying(false);
    }
  };
  const remove = async () => {
    if (!window.confirm('Delete this recording and its transcript?')) return;
    setDeleting(true);
    try {
      await deleteClip(date, clip.id);
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };
  const transcript = clip.transcript?.trim();
  return (
    <li className="rounded-[14px] border px-4 py-3">
      <div className="flex items-start gap-3">
        {clip.status === 'failed' ? (
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[15px]">
            Recording {index + 1}{' '}
            <span className="text-muted-foreground tabular-nums">
              · {clipLength(clip.durationSeconds)}
            </span>
          </p>
          {clip.status !== 'transcribed' ? (
            <p
              className={cn(
                'text-[13px]',
                clip.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {clip.status === 'failed' ? (clip.error ?? STATUS.failed) : STATUS[clip.status]}
            </p>
          ) : showTranscript && transcript ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className={cn(
                'mt-0.5 block text-left text-[14px] leading-relaxed text-muted-foreground',
                !open && 'line-clamp-2',
              )}
              aria-expanded={open}
            >
              {transcript}
            </button>
          ) : clip.error ? (
            <p className="text-[13px] text-muted-foreground">{clip.error}</p>
          ) : null}
          {clip.status === 'failed' && clip.hasAudio ? (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => void retry()}
              disabled={retrying}
            >
              <RotateCcw /> {retrying ? 'Trying again…' : 'Try again'}
            </Button>
          ) : null}
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => void remove()}
          disabled={deleting}
          aria-label={`Delete recording ${index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>
      {allowAudio && clip.hasAudio ? (
        <audio
          controls
          preload="none"
          src={clipAudioUrl(date, clip.id)}
          className="mt-2 h-9 w-full"
        />
      ) : null}
    </li>
  );
}
