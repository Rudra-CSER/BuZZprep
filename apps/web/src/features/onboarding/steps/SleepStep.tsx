import { formatTimeLabel, minutesBetween, toLogicalMinutes } from '@buzzprep/shared';
import { DateTime } from 'luxon';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SwitchRow } from '@/components/ui/switch-row';
import { formatDuration } from '@/lib/format';
import type { Answers, Update } from '../types';

export function SleepStep({ a, u }: { a: Answers; u: Update }) {
  const s = a.sleep;
  const set = (patch: Partial<Answers['sleep']>) => u({ sleep: { ...s, ...patch } });
  const shiftMinutes =
    toLogicalMinutes(s.currentBedtime, 240) - toLogicalMinutes(s.targetBedtime, 240);
  const steps = Math.ceil(shiftMinutes / 15);
  const reachBy = DateTime.fromISO(a.startDate)
    .plus({ days: steps * 3 })
    .toFormat('d LLL');
  return (
    <>
      <div className="grid gap-2">
        <span className="text-[15px] font-semibold">Right now</span>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Usually asleep by">
            {(id) => (
              <Input
                id={id}
                type="time"
                value={s.currentBedtime}
                onChange={(e) => set({ currentBedtime: e.target.value })}
              />
            )}
          </Field>
          <Field label="Usually up at">
            {(id) => (
              <Input
                id={id}
                type="time"
                value={s.currentWake}
                onChange={(e) => set({ currentWake: e.target.value })}
              />
            )}
          </Field>
        </div>
      </div>
      <div className="grid gap-2">
        <span className="text-[15px] font-semibold">Where you want to be</span>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bedtime">
            {(id) => (
              <Input
                id={id}
                type="time"
                value={s.targetBedtime}
                onChange={(e) => set({ targetBedtime: e.target.value })}
              />
            )}
          </Field>
          <Field label="Wake up">
            {(id) => (
              <Input
                id={id}
                type="time"
                value={s.targetWake}
                onChange={(e) => set({ targetWake: e.target.value })}
              />
            )}
          </Field>
        </div>
        <p className="text-[13px] text-muted-foreground">
          That’s {formatDuration(minutesBetween(s.targetBedtime, s.targetWake))} of sleep.
        </p>
      </div>
      {shiftMinutes > 0 && (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <SwitchRow
            title="Shift gradually"
            description={`Bedtime moves 15 minutes earlier every 3 days, reaching ${formatTimeLabel(s.targetBedtime)} around ${reachBy}. Wake-up stays at ${formatTimeLabel(s.targetWake)}.`}
            checked={s.gradualShift ?? true}
            onCheckedChange={(v) => set({ gradualShift: v })}
          />
        </div>
      )}
    </>
  );
}
