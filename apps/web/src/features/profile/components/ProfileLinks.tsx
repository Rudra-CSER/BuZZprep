import { Bell, CalendarCog, Flag, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { DateTime } from 'luxon';
import type { Plan, PushDevice } from '@/api/types';
import { ListLink, ListSection } from '@/components/ui/list-section';
import { isStandalone } from '@/lib/pwa';

/** Shortcuts to the plan, routine, notifications, install guide and setup. */
export function ProfileLinks({
  plan,
  devices,
}: {
  plan: Plan | null | undefined;
  devices: PushDevice[] | undefined;
}) {
  return (
    <ListSection>
      <ListLink
        to="/profile/plan"
        icon={<Flag />}
        title={plan?.title ?? 'Your plan'}
        detail={plan ? DateTime.fromISO(plan.deadline).toFormat('d LLL yyyy') : undefined}
      />
      <ListLink to="/schedule/routine" icon={<CalendarCog />} title="Routine and schedules" />
      <ListLink
        to="/profile/notifications"
        icon={<Bell />}
        title="Notifications"
        detail={devices ? `${devices.length} device${devices.length === 1 ? '' : 's'}` : undefined}
      />
      {!isStandalone() && (
        <ListLink to="/install" icon={<MonitorSmartphone />} title="Install the app" />
      )}
      <ListLink to="/onboarding" icon={<RefreshCw />} title="Run setup again" />
    </ListSection>
  );
}
