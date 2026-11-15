import { logicalDateOf } from '@buzzprep/shared';
import { Monitor, Smartphone, Trash2 } from 'lucide-react';
import type { PushDevice } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ListSection } from '@/components/ui/list-section';
import type { ClientTimeContext } from '@/features/profile/hooks/useTimeContext';
import { relativeDay } from '@/lib/format';
import { removePushDevice } from '../api';

/** The devices that receive reminders, each removable. */
export function DevicesSection({
  devices,
  t,
  onRemoved,
}: {
  devices: PushDevice[];
  t: ClientTimeContext;
  onRemoved: () => void;
}) {
  return (
    <ListSection title="Devices receiving reminders">
      {devices.map((d) => (
        <div key={d.id} className="flex items-center gap-3 px-4 py-3">
          {d.platform === 'desktop' ? (
            <Monitor className="size-[18px] text-muted-foreground" />
          ) : (
            <Smartphone className="size-[18px] text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px]">{d.deviceLabel ?? d.platform}</span>
            <span className="block text-[13px] text-muted-foreground">
              {d.lastSuccessAt
                ? `Last delivered ${relativeDay(logicalDateOf(d.lastSuccessAt, t), t.today).toLowerCase()}`
                : 'No deliveries yet'}
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove device"
            onClick={() => void removePushDevice(d.id).then(onRemoved)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </ListSection>
  );
}
