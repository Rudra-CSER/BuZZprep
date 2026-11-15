import {
  addDays,
  eachDate,
  startOfWeek,
  summarizeCompletion,
  type Occurrence,
} from '@buzzprep/shared';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import type { AgendaResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import type { ClientTimeContext } from '@/features/profile/hooks/useTimeContext';
import { relativeDay, timeLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DayList } from './DayList';

export function WeekView({
  data,
  date,
  t,
  now,
  onOpen,
  onPickDay,
}: {
  data: AgendaResponse;
  date: string;
  t: ClientTimeContext;
  now: number;
  onOpen: (o: Occurrence) => void;
  onPickDay: (d: string) => void;
}) {
  const days = eachDate(startOfWeek(date), addDays(startOfWeek(date), 6));
  const [picked, setPicked] = useState(days.includes(t.today) ? t.today : days[0]!);
  const byDay = useMemo(
    () =>
      Object.fromEntries(
        days.map((d) => [
          d,
          data.occurrences.filter((o) => o.displayDate === d && o.modeAction !== 'skip'),
        ]),
      ),
    [data, days],
  );

  return (
    <>
      {/* Phones: day picker + list (not a shrunken grid) */}
      <div className="grid gap-4 lg:hidden">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const s = summarizeCompletion(byDay[d] ?? [], now, t.graceMinutes);
            const ratio = s.planned - s.skipped > 0 ? s.completed / (s.planned - s.skipped) : 0;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setPicked(d)}
                className={cn(
                  'grid justify-items-center gap-1 rounded-[12px] py-2 transition-colors',
                  picked === d ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'text-[11px]',
                    picked === d ? 'opacity-85' : 'text-muted-foreground',
                  )}
                >
                  {DateTime.fromISO(d).toFormat('ccc')}
                </span>
                <span
                  className={cn(
                    'text-[17px] font-semibold tabular',
                    d === t.today && picked !== d && 'text-primary',
                  )}
                >
                  {DateTime.fromISO(d).day}
                </span>
                <span
                  className={cn(
                    'h-1 w-6 overflow-hidden rounded-full',
                    picked === d ? 'bg-primary-foreground/30' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      picked === d ? 'bg-primary-foreground' : 'bg-primary',
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
        <DayList items={byDay[picked] ?? []} t={t} now={now} onOpen={onOpen} />
        <Button variant="ghost" onClick={() => onPickDay(picked)}>
          Open {relativeDay(picked, t.today).toLowerCase()} on the timeline
        </Button>
      </div>

      {/* Desktop: seven columns */}
      <div className="hidden grid-cols-[repeat(7,minmax(0,1fr))] gap-2 lg:grid">
        {days.map((d) => (
          <div
            key={d}
            className={cn(
              'grid min-w-0 content-start gap-2 rounded-[14px] border bg-card p-2',
              d === t.today && 'border-primary/50',
            )}
          >
            <button
              type="button"
              onClick={() => onPickDay(d)}
              className="flex min-w-0 items-baseline justify-between px-1 text-left"
            >
              <span className="text-[13px] text-muted-foreground">
                {DateTime.fromISO(d).toFormat('ccc')}
              </span>
              <span
                className={cn('text-[17px] font-semibold tabular', d === t.today && 'text-primary')}
              >
                {DateTime.fromISO(d).day}
              </span>
            </button>
            {(byDay[d] ?? [])
              .filter((o) => o.category !== 'sleep')
              .map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => onOpen(o)}
                  style={{ ['--cat' as string]: `var(--cat-${o.category})` }}
                  className={cn(
                    'min-w-0 rounded-[8px] border-l-[3px] cat-edge px-2 py-1.5 text-left',
                    o.blocking ? 'cat-tint' : 'hatch',
                    o.status === 'completed' && 'opacity-60',
                  )}
                >
                  <span className="block truncate text-[12.5px] font-semibold">{o.title}</span>
                  <span className="block text-[11px] text-muted-foreground narrow tabular">
                    {timeLabel(o.startTime, t.hour12)}
                  </span>
                </button>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
