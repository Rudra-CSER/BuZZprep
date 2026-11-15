import { Flag } from 'lucide-react';
import { Link } from 'react-router';
import type { DashboardResponse } from '@/api/types';
import { ListSection } from '@/components/ui/list-section';
import { relativeDay } from '@/lib/format';

export function MilestonesSection({ data }: { data: DashboardResponse }) {
  const items = data.plan?.upcomingMilestones ?? [];
  if (items.length === 0) return null;
  return (
    <ListSection title="Milestones">
      {items.slice(0, 2).map((m) => (
        <Link
          key={m.id}
          to="/profile/plan"
          className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/50"
        >
          <Flag className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-[15px] leading-snug">{m.title}</span>
          <span className="shrink-0 text-[13px] text-muted-foreground tabular">
            {relativeDay(m.dueDate, data.today)}
          </span>
        </Link>
      ))}
    </ListSection>
  );
}
