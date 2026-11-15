import { logicalDateOf } from '@buzzprep/shared';
import { Bell, BellOff, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import type { DashboardResponse } from '@/api/types';
import { ListSection } from '@/components/ui/list-section';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import { instantTime, relativeDay } from '@/lib/format';

export function RemindersSection({
  data,
  zone,
  hour12,
  today,
}: {
  data: DashboardResponse;
  zone: string;
  hour12: boolean;
  today: string;
}) {
  const t = useTimeContext();
  const r = data.nextReminder;
  const setUp = data.push.devices > 0;
  return (
    <ListSection title="Reminders">
      {r ? (
        <div className="flex items-start gap-3 px-4 py-3.5">
          <Bell className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium">{r.title}</p>
            <p className="text-[13px] text-muted-foreground tabular">
              {relativeDay(logicalDateOf(r.fireAt, t), today)} at{' '}
              {instantTime(r.fireAt, zone, hour12)}
            </p>
          </div>
        </div>
      ) : (
        <p className="px-4 py-3.5 text-[14px] text-muted-foreground">
          No reminders in the next 24 hours.
        </p>
      )}
      {!setUp && (
        <Link
          to="/profile/notifications"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50"
        >
          <BellOff className="size-[18px] shrink-0 text-warning" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Turn on notifications</span>
            <span className="block text-[13px] text-muted-foreground">
              {data.push.serverEnabled
                ? 'Reminders can’t reach this device yet.'
                : 'Push isn’t configured on this server yet.'}
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}
    </ListSection>
  );
}
