import { minutesBetween } from '@buzzprep/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { formatDuration } from '@/lib/format';
import type { FormState, SetField } from '../activity-form';

/** Start and end time, with how long that makes it. */
export function ActivityTimeFields({ f, set }: { f: FormState; set: SetField }) {
  const duration = minutesBetween(f.startTime, f.endTime);
  const crossesMidnight = f.endTime < f.startTime && duration > 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Starts">
        {(id) => (
          <Input
            id={id}
            type="time"
            value={f.startTime}
            onChange={(e) => set('startTime', e.target.value)}
            required
          />
        )}
      </Field>
      <Field label="Ends">
        {(id) => (
          <Input
            id={id}
            type="time"
            value={f.endTime}
            onChange={(e) => set('endTime', e.target.value)}
            required
          />
        )}
      </Field>
      <p className="col-span-2 -mt-1 text-[13px] text-muted-foreground">
        {duration === 0
          ? 'A moment in time, with no duration.'
          : `Lasts ${formatDuration(duration)}${crossesMidnight ? ' and ends after midnight' : ''}.`}
      </p>
    </div>
  );
}
