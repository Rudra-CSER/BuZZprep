import {
  addDays,
  endOfMonth,
  startOfMonth,
  startOfWeek,
  type Occurrence,
  type ScheduleMode,
} from '@buzzprep/shared';
import { ChevronLeft, ChevronRight, ListChecks, Plus, Settings2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import { useNow } from '@/lib/clock';
import { relativeDay } from '@/lib/format';
import { useAgenda } from './api';
import { DayView } from './components/DayView';
import { ModeChip } from './components/ModeChip';
import { ModeSheet } from './components/ModeSheet';
import { MonthView } from './components/MonthView';
import { OccurrenceSheet } from './components/OccurrenceSheet';
import { WeekView } from './components/WeekView';

type View = 'day' | 'week' | 'month';

function rangeFor(view: View, date: string) {
  if (view === 'day') return { from: addDays(date, -1), to: date };
  if (view === 'week') {
    const s = startOfWeek(date);
    return { from: addDays(s, -1), to: addDays(s, 6) };
  }
  return { from: startOfMonth(date), to: endOfMonth(date) };
}

export function SchedulePage() {
  const now = useNow();
  const t = useTimeContext(now);
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'day';
  const date = params.get('date') || t.today;
  const { from, to } = rangeFor(view, date);
  const { data, isPending } = useAgenda(from, to);
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [modeOpen, setModeOpen] = useState(false);

  const go = (next: Partial<{ view: View; date: string }>) => {
    const p = new URLSearchParams(params);
    if (next.view) p.set('view', next.view);
    if (next.date) {
      if (next.date === t.today) p.delete('date');
      else p.set('date', next.date);
    }
    setParams(p, { replace: true });
  };
  const step = view === 'day' ? 1 : view === 'week' ? 7 : 0;
  const shift = (dir: 1 | -1) =>
    go({
      date:
        view === 'month'
          ? DateTime.fromISO(date).plus({ months: dir }).startOf('month').toISODate()!
          : addDays(date, dir * step),
    });

  const mode = (data?.dayModes[date] ?? 'normal') as ScheduleMode;
  const title =
    view === 'month'
      ? DateTime.fromISO(date).toFormat('LLLL yyyy')
      : view === 'week'
        ? `Week of ${DateTime.fromISO(startOfWeek(date)).toFormat('d LLL')}`
        : relativeDay(date, t.today);

  return (
    <Page
      wide
      title="Schedule"
      actions={
        <>
          <Button asChild variant="ghost" size="icon" aria-label="Sessions that need a decision">
            <Link to="/schedule/review">
              <ListChecks />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Manage routine">
            <Link to="/schedule/routine">
              <Settings2 />
            </Link>
          </Button>
          <Button asChild variant="tinted" size="icon" aria-label="Add activity">
            <Link to="/schedule/routine?new=1">
              <Plus />
            </Link>
          </Button>
        </>
      }
    >
      <div className="sticky top-0 z-20 -mx-4 mb-4 grid gap-3 bg-background/90 px-4 pb-3 pt-1 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <Segmented
          ariaLabel="Calendar view"
          value={view}
          onValueChange={(v) => go({ view: v })}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          className="w-full md:w-80"
        />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight />
          </Button>
          <h2 className="ml-1 min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</h2>
          {date !== t.today && (
            <Button size="sm" variant="secondary" onClick={() => go({ date: t.today })}>
              Today
            </Button>
          )}
          {view === 'day' && <ModeChip mode={mode} onClick={() => setModeOpen(true)} />}
        </div>
      </div>

      {isPending || !data ? (
        <Skeleton className="h-[60vh] w-full rounded-[14px]" />
      ) : view === 'day' ? (
        <DayView data={data} date={date} t={t} now={now} onOpen={setSelected} />
      ) : view === 'week' ? (
        <WeekView
          data={data}
          date={date}
          t={t}
          now={now}
          onOpen={setSelected}
          onPickDay={(d) => go({ view: 'day', date: d })}
        />
      ) : (
        <MonthView
          data={data}
          date={date}
          t={t}
          now={now}
          onPickDay={(d) => go({ view: 'day', date: d })}
        />
      )}

      <OccurrenceSheet
        occurrence={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        now={now}
      />
      <ModeSheet open={modeOpen} onOpenChange={setModeOpen} date={date} current={mode} />
    </Page>
  );
}
