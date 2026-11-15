import {
  CATEGORY_META,
  formatTimeLabel,
  logicalDayEnd,
  logicalDayStart,
  occurrenceTimeState,
  type Occurrence,
  type TimeContext,
} from '@buzzprep/shared';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { occurrenceRange } from '@/lib/format';
import { catVar, cn } from '@/lib/utils';

const HOUR = 54; // px per hour
const MIN_BLOCK = 22;

interface Placed {
  o: Occurrence;
  top: number;
  height: number;
  col: number;
  cols: number;
}

/** Greedy column layout for overlapping blocking items. */
function layout(items: Occurrence[], start: number, end: number): Placed[] {
  const pxPerMs = HOUR / 3_600_000;
  const sorted = [...items].sort(
    (a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end),
  );
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1));
    for (const p of cluster) p.cols = cols;
    placed.push(...cluster);
    cluster = [];
  };
  for (const o of sorted) {
    const s = Math.max(Date.parse(o.start), start);
    const e = Math.min(Math.max(Date.parse(o.end), s + 15 * 60_000), end);
    if (s >= clusterEnd) flush();
    const used = new Set(
      cluster.filter((p) => p.top + p.height > (s - start) * pxPerMs + 1).map((p) => p.col),
    );
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({
      o,
      top: (s - start) * pxPerMs,
      height: Math.max(MIN_BLOCK, (e - s) * pxPerMs - 2),
      col,
      cols: 1,
    });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return placed;
}

export function DayTimeline({
  date,
  occurrences,
  ctx,
  now,
  hour12,
  graceMinutes,
  onOpen,
}: {
  date: string;
  occurrences: Occurrence[];
  ctx: TimeContext;
  now: number;
  hour12: boolean;
  graceMinutes: number;
  onOpen: (o: Occurrence) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const start = logicalDayStart(date, ctx).toMillis();
  const end = logicalDayEnd(date, ctx).toMillis();
  const hours = Math.round((end - start) / 3_600_000);
  const height = hours * HOUR;
  const inDay = occurrences.filter((o) => Date.parse(o.end) > start && Date.parse(o.start) < end);
  const flexible = inDay.filter((o) => !o.blocking && o.modeAction !== 'skip');
  const blocks = useMemo(
    () =>
      layout(
        inDay.filter((o) => o.blocking || o.modeAction === 'skip'),
        start,
        end,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occurrences, start, end],
  );
  const nowTop = now >= start && now < end ? ((now - start) / 3_600_000) * HOUR : null;

  useEffect(() => {
    // Scroll to "now" on today, otherwise to the first non-sleep block.
    const firstAwake = blocks.find((b) => b.o.category !== 'sleep');
    const target = nowTop ?? firstAwake?.top ?? 0;
    window.scrollTo({
      top: Math.max(0, (scroller.current?.offsetTop ?? 0) + target - 160),
      behavior: 'instant' as ScrollBehavior,
    });
    // Only on date change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div ref={scroller} className="relative" style={{ height }}>
      {/* Hour grid */}
      {Array.from({ length: hours + 1 }, (_, i) => (
        <div key={i} className="absolute inset-x-0 flex items-start" style={{ top: i * HOUR }}>
          <span className="w-12 shrink-0 -translate-y-2 pr-2 text-right text-[11px] text-muted-foreground narrow tabular">
            {i < hours
              ? formatTimeLabel(ctx.dayBoundaryMinutes + i * 60, hour12).replace(':00', '')
              : ''}
          </span>
          <span className="h-px flex-1 bg-border/70" />
        </div>
      ))}

      <div className="absolute inset-y-0 left-12 right-0">
        {/* Flexible time: hatched background bands */}
        {flexible.map((o) => {
          const s = Math.max(Date.parse(o.start), start);
          const e = Math.min(Date.parse(o.end), end);
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onOpen(o)}
              style={{
                ...catVar(o.category),
                top: ((s - start) / 3_600_000) * HOUR,
                height: ((e - s) / 3_600_000) * HOUR,
              }}
              className="absolute inset-x-1 rounded-[10px] hatch px-2.5 py-1.5 text-left"
            >
              <span className="text-[12px] font-medium text-muted-foreground">{o.title}</span>
            </button>
          );
        })}

        {blocks.map(({ o, top, height: h, col, cols }) => {
          const state = occurrenceTimeState(o, now, graceMinutes);
          const done = o.status === 'completed';
          const dim = state === 'skipped' || state === 'paused';
          const compact = h < 44;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onOpen(o)}
              style={{
                ...catVar(o.category),
                top: top + 1,
                height: h,
                left: `calc(${(col / cols) * 100}% + 4px)`,
                width: `calc(${100 / cols}% - 8px)`,
              }}
              className={cn(
                'absolute overflow-hidden rounded-[9px] border-l-[3px] cat-edge px-2.5 text-left transition-shadow hover:shadow-md',
                CATEGORY_META[o.category].trackable
                  ? 'cat-tint'
                  : 'bg-[color-mix(in_oklch,var(--cat)_8%,var(--card))]',
                compact ? 'flex items-center gap-2 py-0' : 'py-1.5',
                dim && 'opacity-50',
                state === 'needs_review' && 'ring-1 ring-warning',
                state === 'in_progress' && 'ring-2 ring-primary/60',
              )}
            >
              <span
                className={cn(
                  'flex items-center gap-1.5 truncate text-[13.5px] font-semibold leading-tight',
                  dim && 'line-through',
                )}
              >
                {done ? (
                  <Check className="size-3.5 shrink-0 text-[var(--cat)]" strokeWidth={3} />
                ) : null}
                <span className="truncate">{o.title}</span>
              </span>
              <span
                className={cn(
                  'block truncate text-[12px] text-muted-foreground narrow tabular',
                  compact && 'shrink-0',
                )}
              >
                {occurrenceRange(o, hour12)}
              </span>
            </button>
          );
        })}

        {nowTop !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
            style={{ top: nowTop }}
            aria-hidden
          >
            <span className="-ml-1.5 size-3 rounded-full border-2 border-card bg-primary" />
            <span className="h-[2px] flex-1 bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
