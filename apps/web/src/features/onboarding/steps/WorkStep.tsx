import { WEEKDAY_SHORT, WEEKDAYS, type Weekday } from '@buzzprep/shared';
import { ChipGroup } from '@/components/ui/chip-group';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Stepper } from '@/components/ui/stepper';
import { SwitchRow } from '@/components/ui/switch-row';
import type { Answers, Update } from '../types';

export function WorkStep({ a, u }: { a: Answers; u: Update }) {
  const w = a.work;
  const set = (patch: Partial<Answers['work']>) => u({ work: { ...w, ...patch } });
  return (
    <>
      <div className="overflow-hidden rounded-[14px] border bg-card">
        <SwitchRow
          title="I have fixed working or college hours"
          checked={w.enabled}
          onCheckedChange={(v) => set({ enabled: v })}
        />
      </div>
      {w.enabled && (
        <>
          <Field label="Call it">
            {(id) => (
              <Input
                id={id}
                value={w.label ?? 'Work'}
                onChange={(e) => set({ label: e.target.value || 'Work' })}
                maxLength={40}
              />
            )}
          </Field>
          <div className="grid gap-2">
            <span className="text-[14px] font-medium">Days</span>
            <ChipGroup
              ariaLabel="Working days"
              options={WEEKDAYS.map((d) => ({ value: d, label: WEEKDAY_SHORT[d] }))}
              value={w.days as Weekday[]}
              onChange={(days) => set({ days: days as Weekday[] })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={w.start}
                  onChange={(e) => set({ start: e.target.value })}
                />
              )}
            </Field>
            <Field label="Ends">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={w.end}
                  onChange={(e) => set({ end: e.target.value })}
                />
              )}
            </Field>
          </div>
          <div className="grid gap-2">
            <span className="text-[14px] font-medium">Commute, one way</span>
            <Stepper
              label="commute"
              value={w.commuteMinutes ?? 0}
              onChange={(v) => set({ commuteMinutes: v })}
              min={0}
              max={180}
              step={5}
              format={(v) => (v ? `${v} min` : 'None')}
            />
          </div>
          <div className="grid gap-2">
            <span className="text-[14px] font-medium">How demanding is it usually?</span>
            <Segmented
              ariaLabel="Work pressure"
              value={w.pressure ?? 'moderate'}
              onValueChange={(v) => set({ pressure: v })}
              options={[
                { value: 'low', label: 'Light' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'high', label: 'Heavy' },
              ]}
              className="w-full"
            />
            <p className="text-[13px] text-muted-foreground">
              On hard days, switch to Busy mode and study blocks shrink automatically.
            </p>
          </div>
        </>
      )}
    </>
  );
}
