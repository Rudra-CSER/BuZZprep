import type { Plan } from '@/api/types';
import { Page } from '@/components/Page';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { updatePlan, useActivePlan } from './api';
import { PlanGoalSection } from './components/PlanGoalSection';
import { PlanMilestonesSection } from './components/PlanMilestonesSection';
import { PlanSummary } from './components/PlanSummary';
import { usePlanAction } from './hooks/usePlanAction';
import { useTimeContext } from './hooks/useTimeContext';

export function PlanPage() {
  const t = useTimeContext();
  const { data, isPending } = useActivePlan();
  const plan = data?.plan;

  const run = usePlanAction();
  const patch = (body: Partial<Plan>) => plan && void run(() => updatePlan(plan.id, body), 'Saved');

  if (isPending) {
    return (
      <Page title="Plan" back={{ to: '/profile', label: 'Profile' }}>
        <Skeleton className="h-64 w-full rounded-[14px]" />
      </Page>
    );
  }
  if (!plan) {
    return (
      <Page title="Plan" back={{ to: '/profile', label: 'Profile' }}>
        <EmptyState title="No active plan">Run setup again to create one.</EmptyState>
      </Page>
    );
  }

  return (
    <Page title="Plan" back={{ to: '/profile', label: 'Profile' }}>
      <div className="grid gap-7">
        <PlanSummary plan={plan} today={t.today} />
        <PlanGoalSection plan={plan} onPatch={patch} />
        <PlanMilestonesSection plan={plan} today={t.today} />
      </div>
    </Page>
  );
}
