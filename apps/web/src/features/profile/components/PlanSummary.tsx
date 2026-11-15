import { prepProgress } from '@buzzprep/shared';
import type { LocalDate } from '@buzzprep/shared';
import { DateTime } from 'luxon';
import type { Plan } from '@/api/types';
import { ProgressBar } from '@/components/ui/progress-bar';

/** The plan’s title and how far along it is. */
export function PlanSummary({ plan, today }: { plan: Plan; today: LocalDate }) {
  const progress = prepProgress(plan.startDate, plan.deadline, today);
  return (
    <section className="grid gap-3 rounded-[18px] border bg-card p-5">
      <p className="text-[19px] font-semibold leading-snug">{plan.title}</p>
      <ProgressBar value={progress.percent} label="Plan progress" />
      <p className="text-[14px] text-muted-foreground tabular">
        {progress.status === 'not_started'
          ? `Starts ${DateTime.fromISO(plan.startDate).toFormat('d LLLL')}`
          : `Day ${progress.dayNumber} of ${progress.totalDays}, ${Math.max(0, progress.daysRemaining)} days left`}
      </p>
    </section>
  );
}
