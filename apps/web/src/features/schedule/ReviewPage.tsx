import type { Occurrence } from '@buzzprep/shared';
import { CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import { useNow } from '@/lib/clock';
import { occurrenceRange, relativeDay } from '@/lib/format';
import { catVar } from '@/lib/utils';
import { useReview, useUpdateOccurrence } from './api';
import { OccurrenceSheet } from './components/OccurrenceSheet';

/** Sessions that ended without a check-in. Nothing is ever auto-completed. */
export function ReviewPage() {
  const now = useNow();
  const t = useTimeContext(now);
  const { data, isPending } = useReview();
  const update = useUpdateOccurrence();
  const [selected, setSelected] = useState<Occurrence | null>(null);

  const items = [...(data?.occurrences ?? [])].sort((a, b) => b.start.localeCompare(a.start));
  const decide = (o: Occurrence, status: 'completed' | 'skipped') => {
    update.mutate({
      activityId: o.activityId,
      date: o.date,
      body: { status, ...(status === 'completed' ? { actualMinutes: o.durationMinutes } : {}) },
    });
    toast(status === 'completed' ? `${o.title} marked done` : `${o.title} skipped`);
  };

  return (
    <Page
      title="Needs a decision"
      back={{ to: '/schedule', label: 'Schedule' }}
      description={
        items.length > 0
          ? 'These ended without a check-in. Record what actually happened.'
          : undefined
      }
    >
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-[14px]" />
      ) : items.length === 0 ? (
        <EmptyState icon={<CheckCheck />} title="All caught up">
          Every session from the past week is marked done, skipped or moved.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((o) => (
            <li
              key={o.key}
              style={catVar(o.category)}
              className="rounded-[14px] border border-l-[3px] cat-edge bg-card p-4"
            >
              <button
                type="button"
                className="grid w-full gap-0.5 text-left"
                onClick={() => setSelected(o)}
              >
                <span className="text-[16px] font-semibold">{o.title}</span>
                <span className="text-[14px] text-muted-foreground">
                  {relativeDay(o.displayDate, t.today)},{' '}
                  <span className="narrow tabular">{occurrenceRange(o, t.hour12)}</span>
                </span>
              </button>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button size="sm" onClick={() => decide(o, 'completed')}>
                  Done
                </Button>
                <Button size="sm" variant="outline" onClick={() => decide(o, 'skipped')}>
                  Skip
                </Button>
                <Button size="sm" variant="tinted" onClick={() => setSelected(o)}>
                  Move
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <OccurrenceSheet
        occurrence={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        now={now}
      />
    </Page>
  );
}
