import type { Occurrence, OccurrenceTimeState } from '@buzzprep/shared';

export function StatusTag({
  state,
  occurrence,
}: {
  state: OccurrenceTimeState;
  occurrence: Occurrence;
}) {
  if (state === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
        <span className="size-1.5 rounded-full bg-primary animate-pulse-dot" />
        Now
      </span>
    );
  }
  if (state === 'needs_review') {
    return (
      <span className="rounded-full bg-warning/18 px-2 py-0.5 text-[12px] font-medium text-[color-mix(in_oklch,var(--warning)_60%,var(--foreground))]">
        Needs a decision
      </span>
    );
  }
  if (state === 'skipped')
    return <span className="text-[12.5px] text-muted-foreground">Skipped</span>;
  if (state === 'paused')
    return <span className="text-[12.5px] text-muted-foreground">Paused</span>;
  if (occurrence.rescheduled && state !== 'completed')
    return <span className="text-[12.5px] text-muted-foreground">Moved</span>;
  if (occurrence.modeAction === 'optional' && state === 'upcoming')
    return <span className="text-[12.5px] text-muted-foreground">Optional</span>;
  return null;
}
