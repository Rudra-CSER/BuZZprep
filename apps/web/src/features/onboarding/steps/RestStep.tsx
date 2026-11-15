import { WEEKDAY_SHORT, WEEKDAYS, type Weekday } from '@buzzprep/shared';
import { ChipGroup } from '@/components/ui/chip-group';
import { Stepper } from '@/components/ui/stepper';
import { SwitchRow } from '@/components/ui/switch-row';
import type { Answers, Update } from '../types';

export function RestStep({ a, u }: { a: Answers; u: Update }) {
  const f = a.fitness;
  const set = (patch: Partial<Answers['fitness']>) => u({ fitness: { ...f, ...patch } });
  return (
    <>
      <div className="grid gap-2">
        <span className="text-[14px] font-medium">Rest days</span>
        <ChipGroup
          ariaLabel="Rest days"
          options={WEEKDAYS.map((d) => ({ value: d, label: WEEKDAY_SHORT[d] }))}
          value={a.restDays as Weekday[]}
          onChange={(days) => u({ restDays: days as Weekday[] })}
        />
        <p className="text-[13px] text-muted-foreground">
          Your weekly review lands on the first rest day.
        </p>
      </div>
      <div className="overflow-hidden rounded-[14px] border bg-card">
        <SwitchRow
          title="Plan gym sessions"
          checked={f.enabled}
          onCheckedChange={(v) => set({ enabled: v })}
        />
      </div>
      {f.enabled && (
        <>
          <div className="grid gap-2">
            <span className="text-[14px] font-medium">Sessions per week</span>
            <Stepper
              label="sessions per week"
              value={f.sessionsPerWeek}
              onChange={(v) => set({ sessionsPerWeek: v })}
              min={1}
              max={7}
              format={(v) => `${v}×`}
            />
          </div>
          <div className="grid gap-2">
            <span className="text-[14px] font-medium">Preferred days</span>
            <ChipGroup
              ariaLabel="Gym days"
              options={WEEKDAYS.map((d) => ({ value: d, label: WEEKDAY_SHORT[d] }))}
              value={(f.days ?? []) as Weekday[]}
              onChange={(days) => set({ days: days as Weekday[] })}
            />
            <p className="text-[13px] text-muted-foreground">
              Leave empty and buZZprep spreads them across the week.
            </p>
          </div>
          <div className="grid gap-2">
            <span className="text-[14px] font-medium">Length</span>
            <Stepper
              label="session length"
              value={f.durationMinutes ?? 60}
              onChange={(v) => set({ durationMinutes: v })}
              min={20}
              max={180}
              step={10}
              format={(v) => `${v} min`}
            />
          </div>
        </>
      )}
    </>
  );
}
