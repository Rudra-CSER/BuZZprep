import { MODE_META, type Occurrence } from '@buzzprep/shared';
import type { LocalDate, OccurrenceTimeState } from '@buzzprep/shared';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { relativeDay } from '@/lib/format';

/** Why this occurrence looks different today: needs a check-in, reshaped by a mode, or moved. */
export function OccurrenceNotice({
  occurrence: o,
  state,
  today,
  onUndoMove,
}: {
  occurrence: Occurrence;
  state: OccurrenceTimeState;
  today: LocalDate;
  onUndoMove: () => void;
}) {
  const modeLine =
    o.modeAction === 'shorten'
      ? `Shortened from ${o.plannedDurationMinutes} to ${o.durationMinutes} min for ${MODE_META[o.mode].label.toLowerCase()}.`
      : o.modeAction === 'optional'
        ? `Optional today (${MODE_META[o.mode].label.toLowerCase()}).`
        : o.modeAction === 'skip'
          ? `Paused by ${MODE_META[o.mode].label.toLowerCase()} mode. You can still do it.`
          : null;

  if (!(modeLine || o.rescheduled || state === 'needs_review')) return null;
  return (
    <div className="grid gap-2 rounded-[12px] bg-muted px-3.5 py-3 text-[14px]">
      {state === 'needs_review' && (
        <p>This ended without a check-in. Mark what actually happened — no judgement either way.</p>
      )}
      {modeLine && <p className="text-muted-foreground">{modeLine}</p>}
      {o.rescheduled && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground">
            Moved from its usual time on {relativeDay(o.date, today).toLowerCase()}.
          </p>
          <Button size="sm" variant="ghost" onClick={onUndoMove}>
            <RotateCcw /> Undo move
          </Button>
        </div>
      )}
    </div>
  );
}
