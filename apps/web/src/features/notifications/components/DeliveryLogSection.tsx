import { logicalDateOf } from '@buzzprep/shared';
import type { NotificationItem } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { ListSection } from '@/components/ui/list-section';
import type { ClientTimeContext } from '@/features/profile/hooks/useTimeContext';
import { instantTime, relativeDay } from '@/lib/format';

const STATUS_LABEL: Partial<Record<NotificationItem['status'], string>> = {
  sent: 'Sent',
  skipped_condition: 'Not needed',
  expired: 'Expired',
  failed: 'Failed',
  no_subscription: 'No device',
  cancelled: 'Cancelled',
  suppressed: 'Muted',
};

const SUPPRESSED_LABEL: Record<string, string> = {
  quiet_hours: 'Quiet hours',
  kind_disabled: 'Turned off',
  category_muted: 'Muted',
  notifications_disabled: 'Reminders off',
};

function statusLabel(n: NotificationItem): string {
  if (n.clickedAt) return 'Opened';
  if (n.deliveredAt) return 'Delivered';
  if (n.status === 'suppressed' && n.statusReason)
    return SUPPRESSED_LABEL[n.statusReason] ?? 'Muted';
  if (n.status === 'cancelled' && n.statusReason === 'skipped_by_user') return 'Skipped';
  return STATUS_LABEL[n.status] ?? n.status;
}

/** What happened to recent reminders (delivered, opened, muted…). */
export function DeliveryLogSection({
  notifications,
  t,
}: {
  notifications: NotificationItem[];
  t: ClientTimeContext;
}) {
  return (
    <ListSection
      title="Recent deliveries"
      footer="“Delivered” means the device confirmed it received the reminder."
    >
      {notifications.length === 0 ? (
        <p className="px-4 py-3.5 text-[14px] text-muted-foreground">Nothing yet.</p>
      ) : (
        notifications.slice(0, 15).map((n) => (
          <div key={n.id} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px]">{n.title}</span>
              <span className="block text-[13px] text-muted-foreground narrow tabular">
                {relativeDay(logicalDateOf(n.fireAt, t), t.today)}{' '}
                {instantTime(n.fireAt, t.zone, t.hour12)}
              </span>
            </span>
            <Badge
              className={
                n.clickedAt || n.deliveredAt
                  ? 'bg-success/15 text-success'
                  : n.status === 'failed'
                    ? 'bg-destructive/12 text-destructive'
                    : undefined
              }
            >
              {statusLabel(n)}
            </Badge>
          </div>
        ))
      )}
    </ListSection>
  );
}
