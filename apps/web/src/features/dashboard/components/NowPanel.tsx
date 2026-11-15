import { CATEGORY_META, isActive, occurrenceTimeState, type Occurrence } from '@buzzprep/shared';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { DashboardResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import { useUpdateOccurrence } from '@/features/schedule/api';
import { DayStrip } from '@/features/schedule/components/DayStrip';
import {
  formatDuration,
  minutesUntil,
  occurrenceRange,
  relativeDay,
  relativeMinutes,
} from '@/lib/format';

export function NowPanel({
  data,
  agenda,
  now,
  onOpen,
}: {
  data: DashboardResponse;
  agenda: Occurrence[];
  now: number;
  onOpen: (o: Occurrence) => void;
}) {
  const t = useTimeContext(now);
  const navigate = useNavigate();
  const update = useUpdateOccurrence();
  const current = agenda.find(
    (o) =>
      CATEGORY_META[o.category].trackable &&
      isActive(o) &&
      occurrenceTimeState(o, now, t.graceMinutes) === 'in_progress' &&
      o.status === 'pending',
  );
  const next = data.nextSession;
  const focus = current ?? next;

  return (
    <section className="rounded-[20px] border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] sm:p-5">
      <DayStrip date={data.today} occurrences={agenda} ctx={t} now={now} hour12={t.hour12} />
      <div className="mt-5">
        {focus ? (
          <div className="grid gap-4">
            <button type="button" onClick={() => onOpen(focus)} className="grid gap-1 text-left">
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                {current ? (
                  <>
                    <span className="size-2 rounded-full bg-primary animate-pulse-dot" />
                    <span className="text-primary">Now</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Next{' '}
                    {focus.displayDate === data.today
                      ? ''
                      : relativeDay(focus.displayDate, data.today).toLowerCase()}{' '}
                    {relativeMinutes(minutesUntil(focus.start, now))}
                  </span>
                )}
              </span>
              <span className="text-[22px] font-semibold leading-snug tracking-[-0.015em]">
                {focus.title}
              </span>
              <span className="text-[15px] text-muted-foreground">
                <span className="narrow tabular">{occurrenceRange(focus, t.hour12)}</span>
                {current ? (
                  <span className="ml-2 tabular">
                    {formatDuration(Math.max(0, minutesUntil(current.end, now)))} left
                  </span>
                ) : null}
              </span>
            </button>
            <div className="flex gap-2">
              <Button
                size="lg"
                className="flex-1"
                onClick={() => navigate(`/focus/${focus.activityId}/${focus.date}`)}
              >
                <Play className="fill-current" /> {current ? 'Start session' : 'Start early'}
              </Button>
              {current && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    update.mutate({
                      activityId: current.activityId,
                      date: current.date,
                      body: { status: 'completed', actualMinutes: current.durationMinutes },
                    })
                  }
                >
                  Mark done
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-1">
            <p className="text-[17px] font-semibold">
              {data.completion.planned > 0 ? 'That’s the last session for today' : 'A free day'}
            </p>
            <p className="text-[14px] text-muted-foreground">
              {data.completion.planned > 0
                ? `${data.completion.completed} of ${data.completion.planned - data.completion.skipped} sessions done. Rest well.`
                : 'No study sessions planned. Recovery counts too.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
