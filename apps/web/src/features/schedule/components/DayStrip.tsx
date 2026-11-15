import {
  CATEGORY_META,
  formatTime,
  logicalDayEnd,
  logicalDayStart,
  type Occurrence,
  type TimeContext,
} from '@buzzprep/shared';
import { catVar, cn } from '@/lib/utils';

function tickLabel(minutes: number, hour12: boolean) {
  const h = Math.floor((((minutes % 1440) + 1440) % 1440) / 60);
  if (!hour12) return formatTime(h * 60).slice(0, 2);
  const suffix = h < 12 ? 'a' : 'p';
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
}

/**
 * The whole logical day (e.g. 4 AM → 4 AM) as one strip: every block in its category tint,
 * flexible time hatched, finished blocks solid, and a marker at "now".
 */
export function DayStrip({
  date,
  occurrences,
  ctx,
  now,
  hour12 = true,
  className,
}: {
  date: string;
  occurrences: Occurrence[];
  ctx: TimeContext;
  now: number;
  hour12?: boolean;
  className?: string;
}) {
  const start = logicalDayStart(date, ctx).toMillis();
  const end = logicalDayEnd(date, ctx).toMillis();
  const span = end - start;
  const pct = (ms: number) => ((Math.min(Math.max(ms, start), end) - start) / span) * 100;
  const blocks = occurrences.filter(
    (o) =>
      o.modeAction !== 'skip' &&
      o.status !== 'skipped' &&
      Date.parse(o.end) > start &&
      Date.parse(o.start) < end,
  );
  const showNow = now >= start && now < end;
  const ticks = [0, 4, 8, 12, 16, 20].map((h) => ({
    at: (h / 24) * 100,
    label: tickLabel(ctx.dayBoundaryMinutes + h * 60, hour12),
  }));

  return (
    <div className={cn('select-none', className)}>
      <div
        className="relative h-10 overflow-hidden rounded-[10px] bg-muted"
        role="img"
        aria-label={`Day overview: ${blocks.length} blocks${showNow ? ', current time marked' : ''}`}
      >
        {blocks.map((o) => {
          const left = pct(Date.parse(o.start));
          const width = Math.max(0.6, pct(Date.parse(o.end)) - left);
          const done = o.status === 'completed';
          return (
            <div
              key={o.key}
              style={{ ...catVar(o.category), left: `${left}%`, width: `${width}%` }}
              className={cn(
                'absolute inset-y-0 border-r-2 border-muted',
                !o.blocking
                  ? 'hatch'
                  : done
                    ? 'bg-[var(--cat)]'
                    : CATEGORY_META[o.category].trackable
                      ? 'bg-[color-mix(in_oklch,var(--cat)_55%,var(--card))]'
                      : 'bg-[color-mix(in_oklch,var(--cat)_28%,var(--card))]',
              )}
            />
          );
        })}
        {showNow && (
          <div className="absolute inset-y-0 w-0" style={{ left: `${pct(now)}%` }} aria-hidden>
            <div className="absolute inset-y-0 -left-px w-[2.5px] rounded-full bg-primary shadow-[0_0_0_2px_var(--card)]" />
          </div>
        )}
      </div>
      <div
        className="relative mt-1.5 h-4 text-[11px] text-muted-foreground narrow tabular"
        aria-hidden
      >
        {ticks.map((t) => (
          <span key={t.at} className="absolute -translate-x-0" style={{ left: `${t.at}%` }}>
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
