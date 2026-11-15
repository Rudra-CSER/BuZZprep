import { ChevronRight, MoonStar } from 'lucide-react';
import { Link } from 'react-router';
import type { DashboardResponse } from '@/api/types';
import { ListSection } from '@/components/ui/list-section';

/** Tonight's journal at a glance: done, started, or still to come. */
export function JournalSection({ data }: { data: DashboardResponse }) {
  const { evening, eveningDone } = data.journal;
  return (
    <ListSection title="Journal">
      <Link
        to={eveningDone ? `/journal/${data.today}` : '/journal/tonight'}
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50"
      >
        <MoonStar className="size-[18px] shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-[15px]">
          {eveningDone
            ? 'Tonight’s journal is done'
            : evening
              ? 'Tonight’s journal is started — finish it before bed'
              : 'Before bed: talk through what you studied today'}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </ListSection>
  );
}
