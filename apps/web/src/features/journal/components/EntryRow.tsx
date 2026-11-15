import { MOOD_LABEL, type LocalDate } from '@buzzprep/shared';
import { ChevronRight, Mic } from 'lucide-react';
import { Link } from 'react-router';
import { relativeDay } from '@/lib/format';
import type { JournalEntrySummary } from '../types';

/** One night in a list: when, what it was about, and how it felt. */
export function EntryRow({
  entry,
  today,
  match,
}: {
  entry: JournalEntrySummary;
  today: LocalDate;
  match?: string | null;
}) {
  const meta = [
    entry.mood ? MOOD_LABEL[entry.mood] : null,
    entry.clipCount > 0 ? `${entry.clipCount} recording${entry.clipCount > 1 ? 's' : ''}` : null,
    !entry.completed ? 'Not finished' : null,
  ].filter(Boolean);
  return (
    <Link
      to={`/journal/${entry.date}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium">{relativeDay(entry.date, today)}</span>
          {meta.length ? (
            <span className="flex shrink-0 items-center gap-1 text-[13px] text-muted-foreground">
              {entry.clipCount > 0 ? <Mic className="size-3.5" aria-hidden /> : null}
              {meta.join(' · ')}
            </span>
          ) : null}
        </p>
        {match ? (
          <p className="mt-0.5 line-clamp-2 text-[14px] text-muted-foreground">{match}</p>
        ) : entry.summary ? (
          <p className="mt-0.5 line-clamp-2 text-[14px] text-muted-foreground">{entry.summary}</p>
        ) : null}
        {entry.topics.length > 0 ? (
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {entry.topics.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[12.5px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
    </Link>
  );
}
