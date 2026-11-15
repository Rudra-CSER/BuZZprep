import { addDays, logicalDayStart, summarizeCompletion, type Occurrence } from '@buzzprep/shared';
import type { AgendaResponse } from '@/api/types';
import type { ClientTimeContext } from '@/features/profile/hooks/useTimeContext';
import { DayTimeline } from './DayTimeline';

function dayItems(data: AgendaResponse, date: string, t: ClientTimeContext) {
  const start = logicalDayStart(date, t).toMillis();
  return data.occurrences.filter(
    (o) =>
      o.displayDate === date || (o.displayDate === addDays(date, -1) && Date.parse(o.end) > start),
  );
}

export function DayView({
  data,
  date,
  t,
  now,
  onOpen,
}: {
  data: AgendaResponse;
  date: string;
  t: ClientTimeContext;
  now: number;
  onOpen: (o: Occurrence) => void;
}) {
  const items = dayItems(data, date, t);
  const summary = summarizeCompletion(
    items.filter((o) => o.displayDate === date),
    now,
    t.graceMinutes,
  );
  return (
    <div className="grid gap-3">
      {summary.planned > 0 && (
        <p className="text-[14px] text-muted-foreground tabular">
          {summary.completed} of {summary.planned - summary.skipped} sessions done
          {summary.needsReview > 0 ? `, ${summary.needsReview} need a decision` : ''}
        </p>
      )}
      <div className="rounded-[16px] border bg-card py-3 pr-2">
        <DayTimeline
          date={date}
          occurrences={items}
          ctx={t}
          now={now}
          hour12={t.hour12}
          graceMinutes={t.graceMinutes}
          onOpen={onOpen}
        />
      </div>
    </div>
  );
}
