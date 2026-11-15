import { WEEKDAY_SHORT, WEEKDAYS, type Weekday } from '@buzzprep/shared';
import { ChipGroup } from '@/components/ui/chip-group';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import type { FormState, RepeatKind, SetField } from '../activity-form';

/** How often it repeats, from when, and on which days. */
export function RepeatFields({ f, set, error }: { f: FormState; set: SetField; error?: string }) {
  return (
    <div className="grid gap-3">
      <span className="text-[14px] font-medium">Repeats</span>
      <NativeSelect
        value={f.repeat}
        onChange={(e) => set('repeat', e.target.value as RepeatKind)}
        aria-label="Repeats"
      >
        <option value="daily">Every day</option>
        <option value="weekdays">Weekdays</option>
        <option value="days">On specific days</option>
        <option value="interval">Every few days</option>
        <option value="once">Once</option>
      </NativeSelect>
      {f.repeat === 'days' && (
        <ChipGroup
          ariaLabel="Days"
          options={WEEKDAYS.map((d) => ({ value: d, label: WEEKDAY_SHORT[d] }))}
          value={f.days}
          onChange={(v) => set('days', v as Weekday[])}
        />
      )}
      {f.repeat === 'interval' && (
        <div className="flex items-center gap-2 text-[15px]">
          Every
          <Input
            type="number"
            min={2}
            max={30}
            value={f.interval}
            onChange={(e) => set('interval', Number(e.target.value))}
            className="w-20"
            aria-label="Interval in days"
          />
          days
        </div>
      )}
      {f.repeat === 'once' ? (
        <Input
          type="date"
          value={f.onceDate}
          onChange={(e) => set('onceDate', e.target.value)}
          aria-label="Date"
        />
      ) : (
        <Field label="Starting from">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={f.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          )}
        </Field>
      )}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
    </div>
  );
}
