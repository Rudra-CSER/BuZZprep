import { ChevronRight, NotebookPen } from 'lucide-react';
import { Link } from 'react-router';
import type { DashboardResponse } from '@/api/types';
import { ListSection } from '@/components/ui/list-section';

export function JournalSection({ data }: { data: DashboardResponse }) {
  return (
    <ListSection title="Journal">
      <Link to="/journal" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50">
        <NotebookPen className="size-[18px] shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-[15px]">
          {data.journal.morning && data.journal.evening
            ? 'Both entries written today'
            : data.journal.morning
              ? 'Morning done — evening reflection to go'
              : 'Morning intentions not written yet'}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </ListSection>
  );
}
