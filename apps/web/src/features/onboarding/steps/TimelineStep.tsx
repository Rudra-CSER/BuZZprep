import { diffDays } from '@buzzprep/shared';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { ChipGroup } from '@/components/ui/chip-group';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import type { Answers, Update } from '../types';

export function TimelineStep({ a, u }: { a: Answers; u: Update }) {
  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf(
        'timeZone',
      );
    } catch {
      return [a.timezone];
    }
  }, [a.timezone]);
  const weeks = Math.round(diffDays(a.startDate, a.deadline) / 7);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={a.startDate}
              onChange={(e) => e.target.value && u({ startDate: e.target.value })}
            />
          )}
        </Field>
        <Field label="Ready by">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={a.deadline}
              onChange={(e) => e.target.value && u({ deadline: e.target.value })}
            />
          )}
        </Field>
      </div>
      <ChipGroup
        multiple={false}
        ariaLabel="Quick durations"
        options={[3, 6, 9, 12].map((m) => ({ value: m, label: `${m} months` }))}
        value={[]}
        onChange={([m]) =>
          m && u({ deadline: DateTime.fromISO(a.startDate).plus({ months: m }).toISODate()! })
        }
      />
      <p className="text-[15px]">
        {weeks > 0 ? (
          <>
            That’s <strong className="font-semibold tabular">{weeks} weeks</strong>, until{' '}
            {DateTime.fromISO(a.deadline).toFormat('d LLLL yyyy')}.
          </>
        ) : (
          'Pick a deadline after the start date.'
        )}
      </p>
      <Field label="Time zone" hint="Reminders fire at local times in this zone.">
        {(id) => (
          <NativeSelect
            id={id}
            value={a.timezone}
            onChange={(e) => u({ timezone: e.target.value })}
          >
            {(zones.includes(a.timezone) ? zones : [a.timezone, ...zones]).map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
    </>
  );
}
