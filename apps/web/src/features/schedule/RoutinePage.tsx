import { toLogicalMinutes } from '@buzzprep/shared';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { Activity } from '@/api/types';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import { useActivities, useSchedules } from './api';
import { ActivityEditor } from './components/ActivityEditor';
import { ActivityList } from './components/ActivityList';
import { ScheduleList } from './components/ScheduleList';

export function RoutinePage() {
  const t = useTimeContext();
  const [params, setParams] = useSearchParams();
  const { data, isPending } = useActivities();
  const { data: schedules } = useSchedules();
  const editId = params.get('edit');
  const isNew = params.get('new') === '1';
  const editing = useMemo(
    () => data?.activities.find((a) => a.id === editId) ?? null,
    [data, editId],
  );

  const sorted = useMemo(
    () =>
      [...(data?.activities ?? [])].sort(
        (a, b) =>
          toLogicalMinutes(a.startTime, t.dayBoundaryMinutes) -
          toLogicalMinutes(b.startTime, t.dayBoundaryMinutes),
      ),
    [data, t.dayBoundaryMinutes],
  );

  const openEditor = (a: Activity | null) => {
    const p = new URLSearchParams(params);
    p.delete('edit');
    p.delete('new');
    if (a) p.set('edit', a.id);
    else p.set('new', '1');
    setParams(p, { replace: true });
  };
  const closeEditor = () => {
    const p = new URLSearchParams(params);
    p.delete('edit');
    p.delete('new');
    setParams(p, { replace: true });
  };

  const active = schedules?.schedules.find((s) => s.isActive);

  return (
    <Page
      title="Routine"
      back={{ to: '/schedule', label: 'Schedule' }}
      subtitle={active ? `Active schedule: ${active.name}` : undefined}
      actions={
        <Button variant="tinted" size="sm" onClick={() => openEditor(null)}>
          <Plus /> Add
        </Button>
      }
    >
      <div className="grid gap-7">
        {isPending ? (
          <Skeleton className="h-72 w-full rounded-[14px]" />
        ) : sorted.length === 0 ? (
          <EmptyState
            title="No activities yet"
            action={
              <Button variant="tinted" onClick={() => openEditor(null)}>
                <Plus /> Add your first activity
              </Button>
            }
          >
            Add study sessions, work hours, sleep and anything else you want reminders for.
          </EmptyState>
        ) : (
          <ActivityList activities={sorted} t={t} onOpen={openEditor} />
        )}

        <ScheduleList schedules={schedules?.schedules ?? []} />
      </div>

      <ActivityEditor
        activity={editing}
        open={isNew || !!editing}
        onOpenChange={(v) => !v && closeEditor()}
        today={t.today}
      />
    </Page>
  );
}
