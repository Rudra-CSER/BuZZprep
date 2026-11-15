import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNow } from '@/lib/clock';
import { instantTime, minutesUntil } from '@/lib/format';
import { isProcessing } from '../api';
import type { TonightResponse } from '../types';

/** A small window into the night screen, on the Journal tab. */
export function TonightCard({ data }: { data: TonightResponse | undefined }) {
  const now = useNow();
  if (!data) return <Skeleton className="h-44 w-full rounded-[20px]" />;

  const { entry, bedtime, opensAt, windDownMinutes, timezone, hour12 } = data;
  const bed = bedtime ? instantTime(bedtime, timezone, hour12) : null;
  const opens = opensAt ? instantTime(opensAt, timezone, hour12) : null;
  const toBed = bedtime ? minutesUntil(bedtime, now) : null;
  const open = opensAt ? Date.parse(opensAt) <= now : false;
  const done = Boolean(entry?.completedAt);
  const started = Boolean(entry) && !done;

  const title = done
    ? 'Done for today.'
    : started
      ? 'Pick up where you left off.'
      : open
        ? 'Time to wind down.'
        : 'Tonight’s journal';

  let detail: string;
  if (done) {
    detail = isProcessing(entry)
      ? 'Your notes are being written. They’ll be here in the morning.'
      : entry?.notes
        ? 'Your notes for today are ready.'
        : 'Your log for today is saved.';
  } else if (bed && toBed !== null && toBed > 0 && open) {
    detail = `Bed at ${bed}, in ${toBed} min. Talk through what you studied, then put the phone down.`;
  } else if (opens && !open) {
    detail = `Opens at ${opens}, ${windDownMinutes} min before bed. Spend them on today’s notes, not scrolling.`;
  } else {
    detail = 'A few minutes before sleep: talk through what you studied today.';
  }

  return (
    <section
      aria-label="Tonight"
      className="night relative overflow-hidden rounded-[20px] px-5 pb-5 pt-4 ring-1 ring-inset ring-night-line"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-night-glow/10 blur-2xl"
      />
      <p className="text-[13px] text-muted-foreground">Tonight{bed ? ` · bed at ${bed}` : ''}</p>
      <h2 className="mt-1 font-serif text-[26px] leading-tight tracking-[-0.01em]">{title}</h2>
      <p className="mt-1.5 max-w-prose text-[14.5px] leading-snug text-muted-foreground">
        {detail}
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild>
          <Link to={done && entry ? `/journal/${entry.date}` : `/journal/tonight`}>
            {done ? 'See today’s notes' : started ? 'Continue' : 'Start'}
          </Link>
        </Button>
        {done ? (
          <Button asChild variant="ghost">
            <Link to="/journal/tonight">Open again</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
