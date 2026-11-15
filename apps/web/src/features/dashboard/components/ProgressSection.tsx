import { Link } from 'react-router';
import type { DashboardResponse } from '@/api/types';
import { ListSection } from '@/components/ui/list-section';
import { ProgressBar } from '@/components/ui/progress-bar';

export function ProgressSection({ data }: { data: DashboardResponse }) {
  const dsa = data.dsa;
  const sd = data.systemDesign;
  const helped = dsa.hints + dsa.editorial;
  return (
    <ListSection
      title="Progress"
      action={
        <Link to="/learn" className="text-[14px] font-medium text-primary">
          Learn
        </Link>
      }
    >
      <Link to="/learn" className="grid gap-1 px-4 py-3.5 hover:bg-muted/50">
        <span className="flex items-baseline justify-between">
          <span className="text-[15px] font-medium">DSA</span>
          {dsa.dueRevisions > 0 && (
            <span className="text-[13px] text-primary">{dsa.dueRevisions} to revise</span>
          )}
        </span>
        {dsa.attempted === 0 ? (
          <span className="text-[14px] text-muted-foreground">No problems logged yet.</span>
        ) : (
          <span className="text-[14px] text-muted-foreground">
            <span className="font-semibold text-foreground tabular">{dsa.independent}</span> solved
            on your own, <span className="tabular">{helped}</span> with help
          </span>
        )}
      </Link>
      <Link to="/learn" className="grid gap-2 px-4 py-3.5 hover:bg-muted/50">
        <span className="flex items-baseline justify-between">
          <span className="text-[15px] font-medium">System Design</span>
          <span className="text-[13px] text-muted-foreground tabular">
            {sd.conceptsCompleted}/{sd.concepts} concepts
          </span>
        </span>
        <ProgressBar
          value={sd.concepts ? (sd.conceptsCompleted / sd.concepts) * 100 : 0}
          label="System design concepts"
        />
      </Link>
    </ListSection>
  );
}
