import type { Occurrence } from '@buzzprep/shared';
import type { ClientTimeContext } from '@/features/profile/hooks/useTimeContext';
import { OccurrenceRow } from './OccurrenceRow';

export function DayList({
  items,
  t,
  now,
  onOpen,
}: {
  items: Occurrence[];
  t: ClientTimeContext;
  now: number;
  onOpen: (o: Occurrence) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-[14px] border bg-card px-4 py-8 text-center text-[14px] text-muted-foreground">
        Nothing planned.
      </p>
    );
  }
  return (
    <ul className="divide-y overflow-hidden rounded-[14px] border bg-card">
      {items.map((o) => (
        <OccurrenceRow
          key={o.key}
          occurrence={o}
          now={now}
          graceMinutes={t.graceMinutes}
          hour12={t.hour12}
          onOpen={onOpen}
        />
      ))}
    </ul>
  );
}
