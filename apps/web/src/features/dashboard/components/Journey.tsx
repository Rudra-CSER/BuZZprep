import { DateTime } from 'luxon';
import { Link } from 'react-router';
import type { DashboardResponse } from '@/api/types';
import { ProgressBar } from '@/components/ui/progress-bar';
import { shortDate } from '@/lib/format';
import { pluralize } from '@/lib/utils';

export function Journey({ plan }: { plan: NonNullable<DashboardResponse['plan']> }) {
  const p = plan.progress;
  const left =
    p.status === 'not_started'
      ? `Starts ${shortDate(plan.startDate)}`
      : p.status === 'deadline_passed'
        ? 'Deadline passed'
        : `${pluralize(p.daysRemaining, 'day')} to ${DateTime.fromISO(plan.deadline).toFormat('d LLL yyyy')}`;
  return (
    <Link
      to="/profile/plan"
      className="grid gap-1.5"
      aria-label={`${plan.title}: day ${p.dayNumber} of ${p.totalDays}`}
    >
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="truncate font-medium">
          {p.status === 'not_started' ? plan.title : `Day ${p.dayNumber} of ${p.totalDays}`}
        </span>
        <span className="shrink-0 text-muted-foreground tabular">{left}</span>
      </div>
      <ProgressBar value={p.percent} label="Preparation progress" className="h-1" />
    </Link>
  );
}
