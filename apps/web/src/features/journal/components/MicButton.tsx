import { Mic, Square } from 'lucide-react';
import type { CSSProperties, Ref } from 'react';
import { cn } from '@/lib/utils';
import { clipLength } from '../format';
import type { RecorderStatus } from '../hooks/useRecorder';

/**
 * The one bold element of the night screen: a candle-coloured button whose halo breathes with
 * your voice while recording (driven by the --level variable the recorder sets).
 */
export function MicButton({
  status,
  seconds,
  maxSeconds,
  levelRef,
  onStart,
  onStop,
}: {
  status: RecorderStatus;
  seconds: number;
  maxSeconds: number;
  levelRef: Ref<HTMLDivElement>;
  onStart: () => void;
  onStop: () => void;
}) {
  const recording = status === 'recording';
  const busy = status === 'starting';
  const halo = (amount: number): CSSProperties => ({
    transform: `scale(calc(1 + var(--level, 0) * ${amount}))`,
  });
  const nearLimit = recording && maxSeconds - seconds <= 60;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={levelRef}
        className="relative grid size-36 place-items-center"
        style={{ '--level': 0 } as CSSProperties}
      >
        {recording ? (
          <>
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-night-glow/10 transition-transform duration-75 motion-reduce:hidden"
              style={halo(0.5)}
            />
            <span
              aria-hidden
              className="absolute inset-4 rounded-full border border-night-glow/40 transition-transform duration-75 motion-reduce:hidden"
              style={halo(0.28)}
            />
          </>
        ) : (
          <span aria-hidden className="absolute inset-6 rounded-full bg-night-glow/[0.07]" />
        )}
        <button
          type="button"
          onClick={recording ? onStop : onStart}
          disabled={busy}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
          className={cn(
            'relative grid size-24 place-items-center rounded-full bg-night-glow text-night shadow-[0_0_40px_-6px_var(--night-glow)] transition-transform active:scale-95 disabled:opacity-60',
            'focus-visible:outline-offset-4',
          )}
        >
          {recording ? (
            <Square className="size-7 fill-current" strokeWidth={0} />
          ) : (
            <Mic className="size-9" strokeWidth={1.75} />
          )}
        </button>
      </div>
      <p
        className={cn(
          'min-h-6 text-[15px] tabular-nums',
          recording ? 'text-foreground' : 'text-muted-foreground',
          nearLimit && 'text-night-glow',
        )}
        aria-live="polite"
      >
        {busy
          ? 'Allow the microphone…'
          : recording
            ? `${clipLength(seconds)}${nearLimit ? ` · stops at ${clipLength(maxSeconds)}` : ''}`
            : 'Tap to talk'}
      </p>
    </div>
  );
}
