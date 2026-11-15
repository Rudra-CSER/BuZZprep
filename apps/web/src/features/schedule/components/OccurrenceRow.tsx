import { CATEGORY_META, MODE_META, occurrenceTimeState, type Occurrence } from '@buzzprep/shared';
import { CompleteCircle } from '@/components/ui/complete-circle';
import { occurrenceRange } from '@/lib/format';
import { catVar, cn } from '@/lib/utils';
import { useUpdateOccurrence } from '../api';
import { StatusTag } from './StatusTag';

export function OccurrenceRow({
  occurrence: o,
  now,
  graceMinutes,
  hour12,
  onOpen,
  showDate,
}: {
  occurrence: Occurrence;
  now: number;
  graceMinutes: number;
  hour12: boolean;
  onOpen: (o: Occurrence) => void;
  showDate?: string;
}) {
  const update = useUpdateOccurrence();
  const state = occurrenceTimeState(o, now, graceMinutes);
  const trackable = CATEGORY_META[o.category].trackable;
  const done = o.status === 'completed';
  const dim = state === 'skipped' || state === 'paused';
  const modeNote =
    o.modeAction === 'shorten'
      ? `${o.durationMinutes} of ${o.plannedDurationMinutes} min (${MODE_META[o.mode].label.toLowerCase()})`
      : null;

  return (
    <li
      style={catVar(o.category)}
      className={cn(
        'relative flex min-h-[58px] items-center gap-3 px-4 py-2',
        state === 'in_progress' && 'bg-accent/45',
      )}
    >
      {trackable ? (
        <CompleteCircle
          checked={done}
          label={done ? `Mark ${o.title} as not done` : `Mark ${o.title} as done`}
          onToggle={() =>
            update.mutate({
              activityId: o.activityId,
              date: o.date,
              body: { status: done ? 'pending' : 'completed' },
            })
          }
        />
      ) : (
        <span className="grid size-[22px] shrink-0 place-items-center" aria-hidden>
          <span className="size-2 rounded-full cat-dot opacity-80" />
        </span>
      )}
      <button type="button" onClick={() => onOpen(o)} className="min-w-0 flex-1 py-1 text-left">
        <span
          className={cn(
            'block truncate text-[15px] font-medium',
            (done || dim) && 'text-muted-foreground',
            dim && 'line-through decoration-muted-foreground/50',
            !trackable && !done && 'font-normal',
          )}
        >
          {o.title}
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {showDate ? <span>{showDate}</span> : null}
          <span className="narrow tabular">{occurrenceRange(o, hour12)}</span>
          {modeNote ? <span className="truncate">{modeNote}</span> : null}
        </span>
      </button>
      <StatusTag state={state} occurrence={o} />
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-[3px] rounded-r-full cat-dot opacity-70"
      />
    </li>
  );
}
