import { cn } from '@/lib/utils';

import { type Clock, dayPos } from '../sample-day';

const LABELS: [Clock, string][] = [
  [[4, 0], '4a'],
  [[8, 0], '8a'],
  [[12, 0], '12p'],
  [[16, 0], '4p'],
  [[20, 0], '8p'],
  [[0, 0], '12a'],
];

/** Hour labels under a strip, each centred on its time, like the app's day bar. */
export function DayLabels({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative text-muted-foreground', className)}>
      {LABELS.map(([time, label], i) => (
        <span
          key={label}
          style={{ left: `${dayPos(time)}%` }}
          className={cn('absolute top-0', i > 0 && '-translate-x-1/2')}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
