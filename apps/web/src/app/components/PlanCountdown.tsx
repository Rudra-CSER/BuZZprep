import { Link } from 'react-router';
import { ProgressBar } from '@/components/ui/progress-bar';
import { countdownParts, usePlanCountdown } from '../hooks/usePlanCountdown';

/** The plan's title and progress, kept in view at the foot of the sidebar. */
export function PlanCountdown() {
  const countdown = usePlanCountdown();
  if (!countdown) return null;
  const [where, next] = countdownParts(countdown);

  return (
    <Link
      to="/profile/plan"
      className="grid min-w-0 gap-2 rounded-[14px] border bg-white/[0.04] px-3 py-3 transition-colors hover:bg-white/[0.07]"
    >
      <span className="line-clamp-2 break-words text-[14px] font-medium leading-snug">
        {countdown.plan.title}
      </span>
      <ProgressBar
        value={countdown.progress.percent}
        label="Preparation progress"
        className="h-1 bg-white/[0.12]"
      />
      <span className="flex min-w-0 items-baseline justify-between gap-2 text-[12px] text-chrome-muted tabular">
        <span className="truncate">{where}</span>
        <span className="shrink-0">{next}</span>
      </span>
    </Link>
  );
}
