import { logicalDateOf } from '@buzzprep/shared';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import type { NotificationItem } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ListSection } from '@/components/ui/list-section';
import type { ClientTimeContext } from '@/features/profile/hooks/useTimeContext';
import { instantTime, relativeDay } from '@/lib/format';
import { skipNotification } from '../api';

/** The reminders queued for the next day and a half; any one can be skipped. */
export function UpcomingSection({
  notifications,
  deviceOn,
  t,
}: {
  notifications: NotificationItem[];
  deviceOn: boolean;
  t: ClientTimeContext;
}) {
  const qc = useQueryClient();
  return (
    <ListSection
      title="Coming up"
      footer="Skipping removes just that one reminder. The routine stays as it is."
    >
      {notifications.length === 0 ? (
        <p className="px-4 py-3.5 text-[14px] text-muted-foreground">
          {deviceOn
            ? 'Nothing queued in the next day and a half.'
            : 'Reminders are queued once a device is turned on.'}
        </p>
      ) : (
        notifications.map((n) => (
          <div key={n.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-[4.6rem] shrink-0 text-[13px] text-muted-foreground narrow tabular">
              {instantTime(n.fireAt, t.zone, t.hour12)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px]">{n.title}</span>
              <span className="block text-[13px] text-muted-foreground">
                {relativeDay(logicalDateOf(n.fireAt, t), t.today)}
              </span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void skipNotification(n.id)
                  .then(() => {
                    toast('Skipped this reminder');
                    void qc.invalidateQueries({ queryKey: ['notifications-upcoming'] });
                  })
                  .catch((e) => toast.error(errorMessage(e)))
              }
            >
              Skip
            </Button>
          </div>
        ))
      )}
    </ListSection>
  );
}
