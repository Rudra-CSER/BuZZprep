import {
  addDays,
  diffDays,
  eachDate,
  endOfMonth,
  isActive,
  startOfMonth,
  startOfWeek,
  summarizeCompletion,
} from '@buzzprep/shared';
import { DateTime } from 'luxon';
import type { AgendaResponse } from '@/api/types';
import type { ClientTimeContext } from '@/features/profile/hooks/useTimeContext';
import { cn } from '@/lib/utils';

export function MonthView({
  data,
  date,
  t,
  now,
  onPickDay,
}: {
  data: AgendaResponse;
  date: string;
  t: ClientTimeContext;
  now: number;
  onPickDay: (d: string) => void;
}) {
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first);
  const weeks = Math.ceil((diffDays(gridStart, endOfMonth(date)) + 1) / 7);
  const cells = eachDate(gridStart, addDays(gridStart, weeks * 7 - 1));
  const month = first.slice(0, 7);

  return (
    <div className="rounded-[16px] border bg-card p-2 sm:p-3">
      <div className="grid grid-cols-7 pb-1 text-center text-[12px] text-muted-foreground">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.startsWith(month);
          const items = data.occurrences.filter((o) => o.displayDate === d && isActive(o));
          const s = summarizeCompletion(items, now, t.graceMinutes);
          const denom = s.planned - s.skipped;
          const past = d < t.today;
          const cats = [
            ...new Set(
              items
                .filter((o) => o.blocking && o.category !== 'sleep' && o.category !== 'job')
                .map((o) => o.category),
            ),
          ].slice(0, 4);
          return (
            <button
              key={d}
              type="button"
              disabled={!inMonth}
              onClick={() => onPickDay(d)}
              className={cn(
                'grid min-h-16 content-between rounded-[10px] p-1.5 text-left transition-colors sm:min-h-20 sm:p-2',
                inMonth ? 'hover:bg-muted' : 'opacity-30',
                d === t.today && 'bg-accent',
              )}
            >
              <span
                className={cn('text-[13px] font-semibold tabular', d === t.today && 'text-primary')}
              >
                {DateTime.fromISO(d).day}
              </span>
              <span className="flex flex-wrap gap-0.5">
                {cats.map((c) => (
                  <span
                    key={c}
                    className="size-1.5 rounded-full"
                    style={{ background: `var(--cat-${c})` }}
                  />
                ))}
              </span>
              {inMonth && denom > 0 && (past || d === t.today) ? (
                <span className="text-[11px] text-muted-foreground tabular">
                  {s.completed}/{denom}
                </span>
              ) : (
                <span className="text-[11px]">&nbsp;</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
