import { addDays, type LocalDate } from '@buzzprep/shared';
import { DateTime } from 'luxon';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import type { JournalEntrySummary } from '../types';

/** Seven days with a mark for each journaled night; tap a night to open it. */
export function WeekStrip({
  weekStart,
  today,
  entries,
}: {
  weekStart: LocalDate;
  today: LocalDate;
  entries: Map<LocalDate, JournalEntrySummary>;
}) {
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="This week">
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const d = DateTime.fromISO(date);
        const entry = entries.get(date);
        const future = date > today;
        const label = `${d.toFormat('cccc d LLLL')}: ${
          entry ? (entry.completed ? 'journaled' : 'started') : future ? 'upcoming' : 'no entry'
        }`;
        const cell = (
          <span
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-[12px] py-2 text-center',
              date === today && 'bg-accent',
            )}
          >
            <span className="text-[12px] text-muted-foreground">{d.toFormat('ccccc')}</span>
            <span
              className={cn(
                'text-[15px] tabular-nums',
                date === today && 'font-semibold text-accent-foreground',
                future && 'text-muted-foreground/60',
              )}
            >
              {d.toFormat('d')}
            </span>
            <span
              aria-hidden
              className={cn(
                'size-1.5 rounded-full',
                entry?.completed
                  ? 'bg-primary'
                  : entry
                    ? 'border border-primary'
                    : 'bg-transparent',
              )}
            />
          </span>
        );
        return (
          <li key={date}>
            {entry ? (
              <Link to={`/journal/${date}`} aria-label={label} className="block hover:opacity-80">
                {cell}
              </Link>
            ) : (
              <span aria-label={label} className="block">
                {cell}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
