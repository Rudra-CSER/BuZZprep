import { Bell, Star } from 'lucide-react';
import type { Activity } from '@/api/types';
import { ListSection } from '@/components/ui/list-section';
import type { ClientTimeContext } from '@/features/profile/hooks/useTimeContext';
import { timeLabel } from '@/lib/format';
import { catVar } from '@/lib/utils';

/** The routine’s activities in the order of the day; tap one to edit it. */
export function ActivityList({
  activities,
  t,
  onOpen,
}: {
  activities: Activity[];
  t: ClientTimeContext;
  onOpen: (activity: Activity) => void;
}) {
  return (
    <ListSection
      title="Activities"
      footer="Changes apply from now on. Past check-ins stay as they were."
    >
      {activities.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onOpen(a)}
          style={catVar(a.category)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
        >
          <span className="size-2.5 shrink-0 rounded-full cat-dot" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{a.title}</span>
            <span className="block text-[13px] text-muted-foreground">
              <span className="narrow tabular">
                {timeLabel(a.startTime, t.hour12)}
                {a.durationMinutes > 0 ? ` – ${timeLabel(a.endTime, t.hour12)}` : ''}
              </span>
              <span className="ml-2">{a.recurrenceLabel}</span>
            </span>
          </span>
          {a.essential && <Star className="size-4 text-muted-foreground" aria-label="Essential" />}
          {(a.reminders.atStart || a.reminders.upcomingMinutes || a.reminders.overdueMinutes) && (
            <Bell className="size-4 text-muted-foreground" aria-label="Has reminders" />
          )}
        </button>
      ))}
    </ListSection>
  );
}
