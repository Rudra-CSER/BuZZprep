import { diffDays, prepProgress } from '@buzzprep/shared';
import { useActivePlan } from '@/features/profile/api';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import { shortDate } from '@/lib/format';
import { pluralize } from '@/lib/utils';

/** The active plan and how far along it is today, or null when there's no plan. */
export function usePlanCountdown() {
  const { data } = useActivePlan();
  const t = useTimeContext();
  const plan = data?.plan;
  if (!plan) return null;
  return {
    plan,
    today: t.today,
    progress: prepProgress(plan.startDate, plan.deadline, t.today),
  };
}

type Countdown = NonNullable<ReturnType<typeof usePlanCountdown>>;

/** "170 days left", "Last day", "Starts 27 Nov"… or null once the deadline has passed. */
export function countdownLabel({ plan, progress: p }: Countdown) {
  if (p.status === 'not_started') return `Starts ${shortDate(plan.startDate)}`;
  if (p.status === 'deadline_passed') return null;
  return p.daysRemaining === 0 ? 'Last day' : `${pluralize(p.daysRemaining, 'day')} left`;
}

/** The plan's status in two halves: where you are, and what comes next. */
export function countdownParts({ plan, today, progress: p }: Countdown): [string, string] {
  if (p.status === 'not_started') {
    const days = diffDays(today, plan.startDate);
    return [
      `Starts ${shortDate(plan.startDate)}`,
      days === 1 ? 'Tomorrow' : `In ${pluralize(days, 'day')}`,
    ];
  }
  if (p.status === 'deadline_passed') return ['Deadline passed', shortDate(plan.deadline)];
  return [`Day ${p.dayNumber} of ${p.totalDays}`, countdownLabel({ plan, today, progress: p })!];
}
