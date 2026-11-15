import type { Occurrence, ScheduleMode } from '@buzzprep/shared';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSection } from '@/components/ui/list-section';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import { ModeChip } from '@/features/schedule/components/ModeChip';
import { ModeSheet } from '@/features/schedule/components/ModeSheet';
import { OccurrenceRow } from '@/features/schedule/components/OccurrenceRow';
import { OccurrenceSheet } from '@/features/schedule/components/OccurrenceSheet';
import { useNow } from '@/lib/clock';
import { longDate } from '@/lib/format';
import { pluralize } from '@/lib/utils';
import { useDashboard } from './api';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { JournalSection } from './components/JournalSection';
import { Journey } from './components/Journey';
import { MilestonesSection } from './components/MilestonesSection';
import { NowPanel } from './components/NowPanel';
import { ProgressSection } from './components/ProgressSection';
import { RemindersSection } from './components/RemindersSection';
import { WeekSection } from './components/WeekSection';

export function DashboardPage() {
  const now = useNow();
  const { data, isPending, error } = useDashboard();
  const t = useTimeContext(now);
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [modeOpen, setModeOpen] = useState(false);

  if (isPending) return <DashboardSkeleton />;
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 safe-top">
        <EmptyState title="Couldn’t load your day">
          {error?.message ?? 'Try again in a moment.'}
        </EmptyState>
      </div>
    );
  }

  const agenda = [...data.todayAgenda.spillover, ...data.todayAgenda.occurrences];
  const visible = data.todayAgenda.occurrences.filter((o) => o.modeAction !== 'skip');
  const paused = data.todayAgenda.occurrences.length - visible.length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 safe-top sm:px-6 md:pt-[calc(var(--app-top)+2rem)]">
      <header className="mb-5 grid gap-3 pt-2">
        <div className="grid gap-0.5">
          <p className="text-[14px] text-muted-foreground">{longDate(data.today)}</p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.022em] md:text-[30px]">
            {data.greeting}, {data.displayName.split(' ')[0]}
          </h1>
        </div>
        {data.plan ? <Journey plan={data.plan} /> : null}
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:items-start">
        <div className="grid gap-6">
          <NowPanel data={data} agenda={agenda} now={now} onOpen={setSelected} />

          {data.needsReview > 0 && (
            <Link
              to="/schedule/review"
              className="flex items-center gap-3 rounded-[14px] border border-warning/40 bg-warning/10 px-4 py-3"
            >
              <span className="grid size-8 place-items-center rounded-full bg-warning/25 text-[14px] font-semibold tabular">
                {data.needsReview}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">
                  {data.needsReview === 1
                    ? 'A session needs a decision'
                    : 'Sessions need a decision'}
                </span>
                <span className="block text-[13px] text-muted-foreground">
                  Done, skipped, or move to a free slot?
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          )}

          <ListSection
            title="Today"
            action={
              <div className="flex items-center gap-2">
                {data.completion.planned > 0 && (
                  <span className="text-[13px] text-muted-foreground tabular">
                    {data.completion.completed} of{' '}
                    {data.completion.planned - data.completion.skipped} done
                  </span>
                )}
                <ModeChip mode={data.mode} onClick={() => setModeOpen(true)} />
              </div>
            }
            footer={
              paused > 0 ? `${pluralize(paused, 'session')} paused by today’s mode.` : undefined
            }
          >
            {visible.length === 0 ? (
              <div className="px-4 py-8 text-center text-[14px] text-muted-foreground">
                Nothing scheduled today.{' '}
                <Link to="/schedule/routine" className="font-medium text-primary">
                  Add to your routine
                </Link>
              </div>
            ) : (
              <ul className="divide-y">
                {visible.map((o) => (
                  <OccurrenceRow
                    key={o.key}
                    occurrence={o}
                    now={now}
                    graceMinutes={t.graceMinutes}
                    hour12={t.hour12}
                    onOpen={setSelected}
                  />
                ))}
              </ul>
            )}
          </ListSection>
        </div>

        <div className="grid gap-6">
          <WeekSection data={data} />
          <ProgressSection data={data} />
          <RemindersSection data={data} zone={data.timezone} hour12={t.hour12} today={data.today} />
          <MilestonesSection data={data} />
          <JournalSection data={data} />
        </div>
      </div>

      <OccurrenceSheet
        occurrence={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        now={now}
      />
      <ModeSheet
        open={modeOpen}
        onOpenChange={setModeOpen}
        date={data.today}
        current={data.mode as ScheduleMode}
      />
    </div>
  );
}
